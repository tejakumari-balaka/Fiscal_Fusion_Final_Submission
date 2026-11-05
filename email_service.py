
import os
from pathlib import Path
from email.message import EmailMessage

import aiosmtplib
from dotenv import load_dotenv

# Load environment variables from the project folder.
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


async def send_email(
    to_email: str,
    subject: str,
    body: str
) -> None:
    """Send a plain-text email securely through Gmail SMTP."""

    email_address = os.getenv("EMAIL_ADDRESS")
    app_password = os.getenv("EMAIL_APP_PASSWORD")

    if not email_address or not app_password:
        raise RuntimeError(
            "EMAIL_ADDRESS or EMAIL_APP_PASSWORD is missing from .env"
        )

    message = EmailMessage()
    message["From"] = email_address
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(body)

    await aiosmtplib.send(
        message,
        hostname="smtp.gmail.com",
        port=587,
        start_tls=True,
        username=email_address,
        password=app_password,
        timeout=20,
    )
