from contextlib import contextmanager
from typing import Generator

from common.singleton_meta import SingletonMeta
from config import conf
from loguru import logger
from sqlalchemy import create_engine, inspect
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy_utils import create_database, database_exists, drop_database
from utils.import_utils import import_by_suffix

import_by_suffix("_orm.py")


class SQLRepo(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        try:
            db_uri = f"postgresql://{conf.postgres.user}:{conf.postgres.password}@{conf.postgres.host}:{conf.postgres.port}/{conf.postgres.db}"
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

            if kwargs.get("reset_database") is True:
                if database_exists(cls.__engine.url):
                    logger.warning("Dropping existing DB!")
                    drop_database(cls.__engine.url)

            return super(SQLRepo, cls).__new__(cls)

        except Exception as e:
            msg = f"Cannot connect to PostgresSQL - Error '{e}'"
            logger.error(msg)
            raise SystemExit(msg)

    def __del__(self):
        self.__engine.dispose()

    def drop_database(self):
        if database_exists(self.__engine.url):
            logger.warning("Dropping existing DB!")
            drop_database(self.__engine.url)

    def create_database_if_not_exists(self):
        if not database_exists(self.__engine.url):
            # create the DB
            create_database(self.__engine.url)
            logger.debug("Created DB!")

    def database_contains_data(self):
        if not database_exists(self.__engine.url):
            return False

        inspector = inspect(self.__engine)
        schemas = inspector.get_schema_names()

        for schema in schemas:
            print("schema: %s" % schema)
            if len(inspector.get_table_names(schema=schema)) > 0:
                return True

        return False

    @contextmanager
    def db_session(self) -> Generator[Session, None, None]:
        session = None
        try:
            session = self.session_maker()
            yield session
        finally:
            if session is not None:
                session.close()

    @contextmanager
    def transaction(self) -> Generator[Session, None, None]:
        session = None
        try:
            session = self.session_maker()
            # TODO start tranaction
            yield session
            # TODO commit
        except:
            pass
            # TODO rollback!
        finally:
            if session is not None:
                session.close()
