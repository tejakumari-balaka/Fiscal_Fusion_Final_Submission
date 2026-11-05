import os
import json
import time

from pathlib import Path

from fastapi import FastAPI, HTTPException, Depends
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from pydantic import BaseModel, Field
from dotenv import load_dotenv

from google import genai
from google.genai import errors

from sqlalchemy import select, func, desc
from sqlalchemy.orm import Session

from database import get_db
from models import User, Conversation, ActivityLog
from auth import (
    router as auth_router,
    get_current_user,
    require_admin,
)


# ==================================================
# 1. PROJECT CONFIGURATION
# ==================================================

BASE_DIR = Path(__file__).resolve().parent

load_dotenv(BASE_DIR / ".env")


# ==================================================
# 2. CREATE FASTAPI APPLICATION
# ==================================================

app = FastAPI(
    title="Fiscal Fusion",
    description="Generative AI Chatbot for Financial Services",
    version="1.1.0"
)

app.include_router(auth_router)
@app.get("/admin/dashboard")
def admin_dashboard(
    admin: User = Depends(require_admin),
):
    return {
        "message": "Welcome to the administrator dashboard.",
        "admin_name": admin.name,
        "role": admin.role,
    }

# ==================================================
# ADMIN API: DASHBOARD STATISTICS
# ==================================================

@app.get("/admin/stats")
def admin_stats(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    total_users = db.scalar(
        select(func.count(User.id))
    ) or 0

    total_conversations = db.scalar(
        select(func.count(Conversation.id))
    ) or 0

    total_activity_logs = db.scalar(
        select(func.count(ActivityLog.id))
    ) or 0

    total_logins = db.scalar(
        select(func.count(ActivityLog.id)).where(
            ActivityLog.event_type == "login"
        )
    ) or 0

    total_logouts = db.scalar(
        select(func.count(ActivityLog.id)).where(
            ActivityLog.event_type == "logout"
        )
    ) or 0

    return {
        "total_users": total_users,
        "total_conversations": total_conversations,
        "total_activity_logs": total_activity_logs,
        "total_logins": total_logins,
        "total_logouts": total_logouts,
    }


# ==================================================
# ADMIN API: REGISTERED USERS
# ==================================================

@app.get("/admin/users")
def admin_users(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    statement = (
        select(User)
        .order_by(desc(User.id))
    )

    users = db.scalars(statement).all()

    return {
        "total": len(users),
        "users": [
            {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "registered_at": (
                    user.created_at.isoformat()
                    if user.created_at
                    else None
                ),
            }
            for user in users
        ],
    }


# ==================================================
# ADMIN API: CHANGE A USER'S ROLE
# ==================================================

class RoleUpdateRequest(BaseModel):
    role: str = Field(pattern="^(user|admin)$")


@app.patch("/admin/users/{user_id}/role")
def update_user_role(
    user_id: int,
    request: RoleUpdateRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    # Prevent an administrator from accidentally removing
    # their own administrator access.
    if user_id == admin.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot change your own role."
        )

    user = db.get(User, user_id)

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found."
        )

    user.role = request.role

    try:
        db.commit()
        db.refresh(user)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not update the user's role."
        )

    return {
        "message": "User role updated successfully.",
        "user_id": user.id,
        "name": user.name,
        "role": user.role,
    }

# ==================================================
# ADMIN API: LOGIN AND LOGOUT ACTIVITY
# ==================================================

@app.get("/admin/activity")
def admin_activity(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    statement = (
        select(ActivityLog)
        .order_by(desc(ActivityLog.created_at))
        .limit(200)
    )

    logs = db.scalars(statement).all()

    return {
        "total_returned": len(logs),
        "activities": [
            {
                "id": log.id,
                "user_id": log.user_id,
                "user_name": log.user_name,
                "user_email": log.user_email,
                "event_type": log.event_type,
                "timestamp": (
                    log.created_at.isoformat()
                    if log.created_at
                    else None
                ),
            }
            for log in logs
        ],
    }

@app.get("/admin/dashboard")
def admin_dashboard(
    admin: User = Depends(require_admin),
):
    return {
        "message": "Welcome to the administrator dashboard.",
        "admin_name": admin.name,
        "role": admin.role,
    }


# ==================================================
# 3. CONNECT FRONTEND FILES
# ==================================================

app.mount(
    "/static",
    StaticFiles(directory=BASE_DIR / "static"),
    name="static"
)


# ==================================================
# 4. USER INPUT MODEL
# ==================================================

class ChatRequest(BaseModel):

    topic: str = Field(
        min_length=3,
        max_length=250
    )

    persona1: str = Field(
        min_length=2,
        max_length=100
    )

    persona2: str = Field(
        min_length=2,
        max_length=100
    )

    turns: int = Field(
        default=8,
        ge=2,
        le=12
    )


# ==================================================
# 5. HOMEPAGE
# ==================================================

@app.get("/")
def home():

    return FileResponse(
        BASE_DIR / "static" / "index.html"
    )


@app.get("/reset-password")
async def reset_password_page():
    return FileResponse("static/index.html")

# ==================================================
# 6. HEALTH CHECK
# ==================================================

@app.get("/health")
def health():

    return {
        "status": "running",
        "project": "Fiscal Fusion"
    }


# ==================================================
# 7. GOOGLE RECAPTCHA CONFIGURATION
# ==================================================

@app.get("/config/recaptcha")
def recaptcha_config():

    site_key = os.getenv("RECAPTCHA_SITE_KEY")

    if not site_key:

        raise HTTPException(
            status_code=500,
            detail="reCAPTCHA site key is not configured."
        )

    return {
        "site_key": site_key
    }


# ==================================================
# 8. GENERATE AI CONVERSATION
# ==================================================

@app.post("/generate")
def generate_chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:

        raise HTTPException(
            status_code=500,
            detail="Gemini API key is missing."
        )

    client = genai.Client(api_key=api_key)

    # ----------------------------------------------
    # GEMINI PROMPT
    # ----------------------------------------------

    prompt = f"""
You are an AI assistant simulating a professional
financial services discussion between two stakeholders.

FINANCIAL TOPIC:
{request.topic}

STAKEHOLDERS:

Persona 1: {request.persona1}
Persona 2: {request.persona2}

PERSONA REQUIREMENTS:

Each persona must demonstrate:

1. Clear professional goals.
2. Relevant responsibilities and priorities.
3. Practical constraints and limitations.
4. Concerns and potential risks.
5. A professional communication style.

Each stakeholder must maintain a realistic perspective
throughout the conversation.

CONVERSATION REQUIREMENTS:

1. Generate exactly {request.turns} conversation turns.

2. Alternate strictly between Persona 1 and Persona 2.

3. Start the conversation with Persona 1.

4. Discuss the selected financial topic directly.

5. Maintain each stakeholder's professional priorities.

6. Include realistic concerns or disagreements.

7. Encourage constructive negotiation.

8. Progress toward a practical shared solution.

9. In the final two turns, both stakeholders must
   explicitly agree on the same decision.

10. Do not request real banking credentials,
    passwords, PINs, or sensitive customer information.

FINAL AGREEMENT:

Provide a clear statement describing the decision
accepted by both stakeholders.

ACTION PLAN:

Generate practical implementation steps based on
the final agreement.

OUTPUT FORMAT:

Return valid JSON containing exactly these keys:

"conversation": [
    {{
        "turn": 1,
        "speaker": "{request.persona1}",
        "message": "Professional dialogue"
    }},
    {{
        "turn": 2,
        "speaker": "{request.persona2}",
        "message": "Professional dialogue"
    }}
],

"final_agreement": "Shared agreement between both stakeholders",

"action_plan": [
    "Action step 1",
    "Action step 2",
    "Action step 3"
]

IMPORTANT:

The conversation array must contain exactly
{request.turns} objects.

Turn numbers must start at 1 and increase sequentially.

Speaker names must match the provided persona names.

The final two messages must clearly express agreement.

Return only valid JSON without markdown formatting.
"""

    # ----------------------------------------------
    # GEMINI API REQUEST
    # ----------------------------------------------

    try:

        response = None

        for attempt in range(3):

            try:

                response = client.models.generate_content(
                    model="gemini-3.5-flash-lite",
                    contents=prompt,
                    config={
                        "response_mime_type": "application/json"
                    }
                )

                break

            except errors.ServerError as e:

                if e.code != 503 or attempt == 2:
                    raise

                wait_time = 2 ** (attempt + 1)

                print(
                    f"Gemini server busy. "
                    f"Retrying in {wait_time} seconds..."
                )

                time.sleep(wait_time)

        # ----------------------------------------------
        # VALIDATE GEMINI RESPONSE
        # ----------------------------------------------

        if response is None or not response.text:

            raise ValueError(
                "Gemini returned an empty response."
            )

        result = json.loads(response.text)

        if not isinstance(result, dict):

            raise ValueError(
                "Gemini response must be a JSON object."
            )

        required_keys = [
            "conversation",
            "final_agreement",
            "action_plan"
        ]

        for key in required_keys:

            if key not in result:

                raise ValueError(
                    f"Missing response field: {key}"
                )

        conversation = result["conversation"]

        if not isinstance(conversation, list):

            raise ValueError(
                "Conversation must be a list."
            )

        if len(conversation) != request.turns:

            raise ValueError(
                "Gemini generated an incorrect number of turns."
            )

        for index, message in enumerate(conversation):

            if not isinstance(message, dict):

                raise ValueError(
                    "Invalid conversation message."
                )

            expected_speaker = (
                request.persona1
                if index % 2 == 0
                else request.persona2
            )

            if message.get("speaker") != expected_speaker:

                raise ValueError(
                    "Conversation speakers are not alternating correctly."
                )

            if message.get("turn") != index + 1:

                raise ValueError(
                    "Conversation turn numbers are incorrect."
                )

            if not isinstance(message.get("message"), str):

                raise ValueError(
                    "Conversation message must be text."
                )

        if not isinstance(result["final_agreement"], str):

            raise ValueError(
                "Final agreement must be text."
            )

        if not isinstance(result["action_plan"], list):

            raise ValueError(
                "Action plan must be a list."
            )

    except Exception as e:

        print(
            "GEMINI ERROR:",
            type(e).__name__,
            str(e)
        )

        raise HTTPException(
            status_code=502,
            detail=(
                "Gemini request failed. "
                "Check the VS Code terminal for details."
            )
        )

    # ----------------------------------------------
    # SAVE CONVERSATION TO SQLITE
    # ----------------------------------------------

    try:

        saved_conversation = Conversation(
            user_id=current_user.id,
            topic=request.topic,
            persona1=request.persona1,
            persona2=request.persona2,
            turns=request.turns,
            result_json=json.dumps(result)
        )

        db.add(saved_conversation)
        db.commit()
        db.refresh(saved_conversation)

    except Exception as e:

        db.rollback()

        print(
            "DATABASE ERROR:",
            type(e).__name__,
            str(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Conversation generated but could not be saved."
        )

    # Return generated conversation
    return result


# ==================================================
# 9. GET USER CONVERSATION HISTORY
# ==================================================

@app.get("/history")
def get_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    statement = (
        select(Conversation)
        .where(Conversation.user_id == current_user.id)
        .order_by(Conversation.id.asc())
    )

    conversations = db.scalars(statement).all()

    history = []

    for index, conversation in enumerate(
        conversations,
        start=1
    ):

        history.append({
            "id": conversation.id,
            "title": f"Conversation {index}",
            "topic": conversation.topic,
            "persona1": conversation.persona1,
            "persona2": conversation.persona2,
            "turns": conversation.turns,
            "created_at": conversation.created_at.isoformat()
        })

    return {
        "total": len(history),
        "conversations": history
    }


# ==================================================
# 10. VIEW A SAVED CONVERSATION
# ==================================================

@app.get("/history/{conversation_id}")
def get_saved_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    statement = select(Conversation).where(
        Conversation.id == conversation_id,
        Conversation.user_id == current_user.id
    )

    conversation = db.scalar(statement)

    if conversation is None:

        raise HTTPException(
            status_code=404,
            detail="Conversation not found."
        )

    return {
        "id": conversation.id,
        "topic": conversation.topic,
        "persona1": conversation.persona1,
        "persona2": conversation.persona2,
        "turns": conversation.turns,
        "created_at": conversation.created_at.isoformat(),
        "result": json.loads(conversation.result_json)
    }