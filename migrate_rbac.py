
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "fiscal_fusion.db"


def migrate():
    if not DB_PATH.exists():
        print("Database file not found.")
        return

    with sqlite3.connect(DB_PATH) as conn:
        tables = {
            row[0]
            for row in conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            )
        }

        if "users" not in tables:
            print("Users table not found. Check database setup.")
            return

        columns = {
            row[1]
            for row in conn.execute("PRAGMA table_info(users)")
        }

        if "role" in columns:
            print("Role column already exists. No changes needed.")
            return

        conn.execute(
            "ALTER TABLE users ADD COLUMN "
            "role VARCHAR(20) NOT NULL DEFAULT 'user'"
        )

        print("RBAC migration completed successfully.")
        print("Existing users have the default role: user.")


if __name__ == "__main__":
    migrate()
