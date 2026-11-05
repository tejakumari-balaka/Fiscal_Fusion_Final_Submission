
"""Initialize the Fiscal Fusion SQLite database."""

from database import Base, engine
import models  # Registers all SQLAlchemy models


def initialize_database():
    """Create any missing tables without deleting existing data."""
    Base.metadata.create_all(bind=engine)
    print("Database initialization completed.")
    print("Existing tables and records are preserved.")
    print("The activity_logs table will be created if missing.")


if __name__ == "__main__":
    initialize_database()
