from loguru import logger
from pydantic import PostgresDsn
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy_utils import database_exists, create_database, drop_database

from app.db.orm.orm_base import ORMBase
from app.util.singleton_meta import SingletonMeta
from config import conf


class SQLService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        try:
            db_uri = PostgresDsn.build(
                scheme="postgresql",
                user=conf.postgres.user,
                password=conf.postgres.password,
                host=conf.postgres.host,
                path=f"/{conf.postgres.db}",
            )

            cls.__engine: Engine = create_engine(db_uri,
                                                 pool_pre_ping=True,
                                                 echo=True)
            logger.info("Successfully established connection to PostgresSQL!")
            return super(SQLService, cls).__new__(cls)

        except Exception as e:
            msg = f"Cannot connect to PostgresSQL - Error '{e}'"
            logger.error(msg)
            raise SystemExit(msg)

    def _create_database_and_tables(self, drop_if_exists: bool = False) -> None:
        logger.info("Setting up PostgresSQL DB and tables...")
        if drop_if_exists and database_exists(self.__engine.url):
            logger.warning("Dropping existing DB!")
            drop_database(self.__engine.url)

        if not database_exists(self.__engine.url):
            # create the DB
            create_database(self.__engine.url)
            logger.warning("Created DB!")

            # create all tables from SQLAlchemy ORM Models
            ORMBase.metadata.create_all(self.__engine)
            logger.warning("Created Tables!")

        logger.info("Done setting up PostgresSQL DB and tables!")
