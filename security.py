import hashlib
import secrets
import os
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from pwdlib import PasswordHash

from pathlib import Path


# Load environment variables
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

# Password hashing
password_hasher = PasswordHash.recommended()


def hash_password(password: str) -> str:
    """Convert a password into a secure hash."""
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Check whether the password matches its hash."""
    return password_hasher.verify(password, password_hash)


# Authentication token signing
SECRET_KEY = os.getenv("SESSION_SECRET_KEY")

if not SECRET_KEY:
    raise RuntimeError(
        "SESSION_SECRET_KEY is missing from the .env file."
    )

serializer = URLSafeTimedSerializer(SECRET_KEY)


def create_session_token(user_id: int) -> str:
    """Create a signed session token."""
    return serializer.dumps(
        {"user_id": user_id},
        salt="fiscal-fusion-session"
    )


def verify_session_token(token: str) -> int | None:
    """Verify a session token and return its user ID."""
    try:
        data = serializer.loads(
            token,
            salt="fiscal-fusion-session",
            max_age=60 * 60 * 24
        )
        return int(data["user_id"])
    except (BadSignature, SignatureExpired, KeyError, ValueError, TypeError):
        return None

def generate_password_reset_token() -> str:
    """Generate a cryptographically secure reset token."""
    return secrets.token_urlsafe(32)


def hash_password_reset_token(token: str) -> str:
    """Return the SHA-256 hash of a reset token."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
