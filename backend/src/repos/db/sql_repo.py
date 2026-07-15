from contextlib import contextmanager
from typing import Generator

from loguru import logger
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy_utils import create_database, database_exists, drop_database

from common.singleton_meta import SingletonMeta
from config import conf
from repos.repo_base import RepoBase
from utils.import_utils import import_by_suffix

import_by_suffix("_orm.py")


class SQLRepo(RepoBase, metaclass=SingletonMeta):
    def __init__(self, echo: bool = False):
        """
        Initialize SQLRepo lazily.

        Args:
            echo: Whether to echo SQL queries (for debugging)
        """
        RepoBase.__init__(self)
        self._echo = echo
        self._engine: Engine | None = None
        self._session_maker: sessionmaker[Session] | None = None

    def connect(self) -> None:
        """Establish connection to PostgreSQL database."""
        if self._engine is not None:
            logger.debug("SQLRepo already connected, skipping")
            return

        try:
            db_uri = f"postgresql://{conf.postgres.user}:{conf.postgres.password.get_secret_value()}@{conf.postgres.host}:{conf.postgres.port}/{conf.postgres.db}"
            engine = create_engine(
                db_uri,
                pool_pre_ping=True,
                pool_size=conf.postgres.pool.pool_size,
                max_overflow=conf.postgres.pool.max_overflow,
                echo=self._echo,
            )
            logger.info("Successfully established connection to PostgresSQL!")
            self._engine = engine
            self._session_maker = sessionmaker(autoflush=False, bind=engine)
        except Exception as e:
            msg = f"Cannot connect to PostgresSQL - Error '{e}'"
            logger.error(msg)
            raise SystemExit(msg)

    def close_connection(self) -> None:
        """Close the connection to PostgreSQL and clean up resources."""
        if self._engine is None:
            logger.debug("SQLRepo already closed, skipping")
            return

        logger.info("Closing connection to PostgreSQL...")
        self._engine.dispose()
        self._engine = None
        self._session_maker = None

    def remove_data(self) -> None:
        """Clear all data by dropping tables, preserving the DB and connections."""
        if self._engine is None:
            raise RuntimeError("SQLRepo is not connected.")

        from repos.db.orm_base import ORMBase

        if database_exists(self._engine.url):
            logger.warning("Dropping all tables to clean data!")
            ORMBase.metadata.drop_all(self._engine)

    def drop_database(self) -> None:
        """Drop the entire database (use with caution)."""
        if self._engine is None:
            raise RuntimeError("SQLRepo is not connected. Call connect() first.")

        if database_exists(self._engine.url):
            logger.warning("Dropping existing DB!")
            drop_database(self._engine.url)

    def create_database_if_not_exists(self) -> None:
        """Create the database if it doesn't exist."""
        if self._engine is None:
            raise RuntimeError("SQLRepo is not connected. Call connect() first.")

        if not database_exists(self._engine.url):
            create_database(self._engine.url)
            logger.debug("Created database!")

    @contextmanager
    def transaction(self) -> Generator[Session, None, None]:
        """Context manager for database transactions."""
        if self._session_maker is None:
            raise RuntimeError("SQLRepo is not connected. Call connect() first.")

        session = None
        try:
            session = self._session_maker()
            yield session
            session.commit()
        except Exception as e:
            if session is not None:
                session.rollback()
            raise e
        finally:
            if session is not None:
                session.close()
