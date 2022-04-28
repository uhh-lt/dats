from contextlib import contextmanager
from typing import Generator

from loguru import logger
from pydantic import PostgresDsn
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy_utils import database_exists, create_database, drop_database

"""we import all ORM here so that SQLAlchemy knows about them to generate the SQL tables"""
# noinspection PyUnresolvedReferences
from app.core.data.orm.action import ActionORM
# noinspection PyUnresolvedReferences
from app.core.data.orm.annotation_document import AnnotationDocumentORM
# noinspection PyUnresolvedReferences
from app.core.data.orm.code import CodeORM
# noinspection PyUnresolvedReferences
from app.core.data.orm.document_tag import DocumentTagORM
# noinspection PyUnresolvedReferences
from app.core.data.orm.filter import FilterORM
# noinspection PyUnresolvedReferences
from app.core.data.orm.memo import MemoORM
# noinspection PyUnresolvedReferences
from app.core.data.orm.object_handle import ObjectHandleORM
from app.core.data.orm.orm_base import ORMBase
# noinspection PyUnresolvedReferences
from app.core.data.orm.project import ProjectORM
# noinspection PyUnresolvedReferences
from app.core.data.orm.project import ProjectUserLinkTable
# noinspection PyUnresolvedReferences
from app.core.data.orm.query import QueryORM
# noinspection PyUnresolvedReferences
from app.core.data.orm.source_document import SourceDocumentORM
# noinspection PyUnresolvedReferences
from app.core.data.orm.span_annotation import SpanAnnotationORM
# noinspection PyUnresolvedReferences
from app.core.data.orm.user import UserORM
from app.util.singleton_meta import SingletonMeta
from config import conf
from sqlalchemy.orm import sessionmaker, Session


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

            engine = create_engine(db_uri,
                                   pool_pre_ping=True,
                                   echo=kwargs["echo"] if "echo" in kwargs else True)
            logger.info("Successfully established connection to PostgresSQL!")

            cls.__engine: Engine = engine
            cls.session_maker = sessionmaker(autocommit=False, autoflush=False, bind=engine)

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

    @contextmanager
    def db_session(self) -> Generator[Session, None, None]:
        try:
            session = self.session_maker()
            yield session
        finally:
            session.close()
