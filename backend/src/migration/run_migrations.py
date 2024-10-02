from alembic.command import upgrade
from alembic.config import Config
from app.core.db.sql_service import SQLService


def run_migrations():
    SQLService().create_database_if_not_exists()
    config = Config("alembic.ini")
    upgrade(config, "head")
    print("Alembic Migration Successfull!")


if __name__ == "__main__":
    run_migrations()
