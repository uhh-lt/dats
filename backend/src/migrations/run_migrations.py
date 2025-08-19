import os

from alembic.command import upgrade
from alembic.config import Config

from repos.db.sql_repo import SQLRepo


def run_migrations():
    SQLRepo().create_database_if_not_exists()
    config = Config(os.path.join(os.path.dirname(__file__), "alembic.ini"))
    upgrade(config, "head")
    print("Alembic Migration Successful!")


if __name__ == "__main__":
    run_migrations()
