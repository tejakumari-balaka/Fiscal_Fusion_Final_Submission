
import os
import logging
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from models import User, PasswordResetToken, ActivityLog
from security import (
    generate_password_reset_token,
    hash_password_reset_token,
    hash_password,
    verify_password,
    create_session_token,
    verify_session_token,
)
from email_service import send_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])

COOKIE_NAME = "fiscal_fusion_session"


class SignupRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    confirm_password: str
    captcha_token: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


def record_activity(
    db: Session,
    user: User,
    event_type: str,
) -> None:
    """Save an authentication event without storing sensitive credentials."""
    db.add(
        ActivityLog(
            user_id=user.id,
            user_email=user.email,
            user_name=user.name,
            event_type=event_type,
            created_at=datetime.now(timezone.utc),
        )
    )


def verify_captcha(token: str) -> bool:
    secret = os.getenv("RECAPTCHA_SECRET_KEY")

    if not secret:
        raise HTTPException(
            status_code=500,
            detail="reCAPTCHA is not configured.",
        )

    try:
        with httpx.Client(timeout=10) as client:
            response = client.post(
                "https://www.google.com/recaptcha/api/siteverify",
                data={"secret": secret, "response": token},
            )
            response.raise_for_status()
            result = response.json()

        return (
            result.get("success") is True
            and result.get("hostname") == "localhost"
        )

    except httpx.HTTPError:
        raise HTTPException(
            status_code=503,
            detail="CAPTCHA verification is temporarily unavailable.",
        )


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    token = request.cookies.get(COOKIE_NAME)

    if not token:
        raise HTTPException(
            status_code=401,
            detail="Please log in to continue.",
        )

    user_id = verify_session_token(token)

    if user_id is None:
        raise HTTPException(
            status_code=401,
            detail="Your session is invalid or expired.",
        )

    user = db.get(User, user_id)

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="User account not found.",
        )

    return user


def require_admin(
    user: User = Depends(get_current_user),
) -> User:
    if user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Administrator access required.",
        )

    return user


@router.post("/signup", status_code=201)
def signup(
    data: SignupRequest,
    db: Session = Depends(get_db),
):
    if data.password != data.confirm_password:
        raise HTTPException(
            status_code=400,
            detail="Passwords do not match.",
        )

    if not verify_captcha(data.captcha_token):
        raise HTTPException(
            status_code=400,
            detail="CAPTCHA verification failed.",
        )

    email = str(data.email).strip().lower()

    existing_user = db.scalar(
        select(User).where(User.email == email)
    )

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists.",
        )

    user = User(
        name=data.name.strip(),
        email=email,
        password_hash=hash_password(data.password),
        role="user",
    )

    db.add(user)

    try:
        db.commit()
        db.refresh(user)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Unable to create account.",
        )

    return {
        "message": "Account created successfully.",
        "user_id": user.id,
    }


@router.post("/login")
def login(
    data: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    email = str(data.email).strip().lower()

    user = db.scalar(
        select(User).where(User.email == email)
    )

    if not user or not verify_password(
        data.password, user.password_hash
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
        )

    token = create_session_token(user.id)

    try:
        record_activity(db, user, "login")
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Could not record login activity.")
        raise HTTPException(
            status_code=500,
            detail="Unable to complete login. Please try again.",
        )

    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=False,  # Local HTTP development only
        samesite="lax",
        max_age=86400,
        path="/",
    )

    return {
        "message": "Login successful.",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
        },
    }


@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    token = request.cookies.get(COOKIE_NAME)

    # Record logout only when the cookie identifies a valid user.
    if token:
        user_id = verify_session_token(token)

        if user_id is not None:
            user = db.get(User, user_id)

            if user is not None:
                try:
                    record_activity(db, user, "logout")
                    db.commit()
                except Exception:
                    db.rollback()
                    logger.exception(
                        "Could not record logout activity."
                    )

    response.delete_cookie(
        key=COOKIE_NAME,
        path="/",
        samesite="lax",
    )

    return {"message": "Logged out successfully."}


@router.get("/me")
def current_user(
    user: User = Depends(get_current_user),
):
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
    }


@router.post("/forgot-password")
async def forgot_password(
    data: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    generic_response = {
        "message": (
            "If an account exists for that email, "
            "password-reset instructions will be sent."
        )
    }

    email = str(data.email).strip().lower()

    user = db.scalar(
        select(User).where(User.email == email)
    )

    # Do not reveal whether an account exists.
    if user is None:
        return generic_response

    token = generate_password_reset_token()
    token_hash = hash_password_reset_token(token)

    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

    reset_record = PasswordResetToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at,
        used=False,
    )

    try:
        db.add(reset_record)
        db.commit()

        base_url = os.getenv(
            "RESET_BASE_URL",
            "http://localhost:8000",
        ).rstrip("/")

        reset_link = (
            f"{base_url}/reset-password?"
            f"{urlencode({'token': token})}"
        )

        await send_email(
            to_email=email,
            subject="Fiscal Fusion - Password Reset",
            body=(
                "Hello,\n\n"
                "We received a request to reset your "
                "Fiscal Fusion password.\n\n"
                f"Use this link within 15 minutes:\n{reset_link}\n\n"
                "If you did not request this, ignore this email.\n"
                "Do not share this link with anyone."
            ),
        )

    except Exception:
        db.rollback()
        logger.exception("Password-reset email processing failed.")

    return generic_response


@router.post("/reset-password")
def reset_password(
    data: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    token_hash = hash_password_reset_token(data.token)

    reset_record = db.scalar(
        select(PasswordResetToken).where(
            PasswordResetToken.token_hash == token_hash
        )
    )

    if reset_record is None or reset_record.used:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired password-reset link.",
        )

    expires_at = reset_record.expires_at

    # SQLite may return a naive datetime.
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at <= datetime.now(timezone.utc):
        reset_record.used = True
        db.commit()
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired password-reset link.",
        )

    user = db.get(User, reset_record.user_id)

    if user is None:
        reset_record.used = True
        db.commit()
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired password-reset link.",
        )

    try:
        user.password_hash = hash_password(data.new_password)
        reset_record.used = True

        # Invalidate other outstanding reset links.
        other_tokens = db.scalars(
            select(PasswordResetToken).where(
                PasswordResetToken.user_id == user.id,
                PasswordResetToken.id != reset_record.id,
                PasswordResetToken.used.is_(False),
            )
        ).all()

        for other_token in other_tokens:
            other_token.used = True

        db.commit()

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to reset password. Please try again.",
        )

    return {
        "message": (
            "Password reset successfully. "
            "Please log in with your new password."
        )
    }
