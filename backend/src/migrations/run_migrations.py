from alembic.command import upgrade
from alembic.config import Config
from repos.db.sql_repo import SQLService


def run_migrations():
    SQLService().create_database_if_not_exists()
    config = Config("../src/migrations/alembic.ini")
    upgrade(config, "head")
    print("Alembic Migration Successful!")


if __name__ == "__main__":
    run_migrations()
