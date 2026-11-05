
from getpass import getpass

from sqlalchemy import select

from database import SessionLocal
from models import User
from security import hash_password


def create_admin():
    db = SessionLocal()

    try:
        # Prevent accidental creation of another administrator
        existing_admin = db.scalar(
            select(User).where(User.role == "admin")
        )

        if existing_admin:
            print("An administrator account already exists.")
            print("Setup stopped.")
            return

        name = input("Administrator name: ").strip()
        email = input("Administrator email: ").strip().lower()

        if not name or not email:
            print("Name and email are required.")
            return

        # Do not automatically promote an existing regular user
        existing_user = db.scalar(
            select(User).where(User.email == email)
        )

        if existing_user:
            print("This email already belongs to an account.")
            print("Please use a different email for the administrator.")
            return

        password = getpass("Create administrator password: ")
        confirm_password = getpass("Confirm administrator password: ")

        if len(password) < 12 or len(password) > 128:
            print("Password must contain 12 to 128 characters.")
            return

        if password != confirm_password:
            print("Please check your password. The passwords do not match.")
            return

        admin = User(
            name=name,
            email=email,
            password_hash=hash_password(password),
            role="admin",
        )

        db.add(admin)
        db.commit()

        print("\nAdministrator account created successfully!")
        print("You can now log in through the Fiscal Fusion website.")

    except Exception as exc:
        db.rollback()
        print(f"Administrator setup failed: {exc}")

    finally:
        db.close()


if __name__ == "__main__":
    create_admin()
