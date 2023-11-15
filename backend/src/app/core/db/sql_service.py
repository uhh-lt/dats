from contextlib import contextmanager
from typing import Generator

from config import conf
from loguru import logger
from pydantic import PostgresDsn
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy_utils import create_database, database_exists, drop_database

from app.core.data.orm.orm_base import ORMBase
from app.core.db.import_all_orms import *  # noqa: F401, F403
from app.util.singleton_meta import SingletonMeta


class SQLService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        try:
            db_uri = PostgresDsn.build(
                scheme="postgresql",
                user=conf.postgres.user,
                password=conf.postgres.password,
                host=conf.postgres.host,
                port=conf.postgres.port,
                path=f"/{conf.postgres.db}",
            )

            engine = create_engine(
                db_uri,
                pool_pre_ping=True,
                pool_size=conf.postgres.pool.pool_size,
                max_overflow=conf.postgres.pool.max_overflow,
                echo=kwargs["echo"] if "echo" in kwargs else False,
            )
            logger.info("Successfully established connection to PostgresSQL!")
            cls.__engine: Engine = engine
            cls.session_maker = sessionmaker(autoflush=False, bind=engine)

            return super(SQLService, cls).__new__(cls)

        except Exception as e:
            msg = f"Cannot connect to PostgresSQL - Error '{e}'"
            logger.error(msg)
            raise SystemExit(msg)

    def __del__(self):
        self.__engine.dispose()

    def _create_database_and_tables(self, drop_if_exists: bool = False) -> None:
        logger.info("Setting up PostgresSQL DB and tables...")
        if drop_if_exists and database_exists(self.__engine.url):
            logger.warning("Dropping existing DB!")
            drop_database(self.__engine.url)

        if not database_exists(self.__engine.url):
            # create the DB
            create_database(self.__engine.url)
            logger.debug("Created DB!")

            # create all tables from SQLAlchemy ORM Models
            ORMBase.metadata.create_all(self.__engine)
            logger.debug("Created Tables!")

        logger.info("Done setting up PostgresSQL DB and tables!")

    @contextmanager
    def db_session(self) -> Generator[Session, None, None]:
        try:
            session = self.session_maker()
            yield session
        finally:
            session.close()
