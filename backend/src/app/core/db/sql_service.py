from contextlib import contextmanager
from typing import Generator

from loguru import logger
from pydantic import PostgresDsn
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy_utils import create_database, database_exists, drop_database

"""we import all ORM here so that SQLAlchemy knows about them to generate the SQL tables"""
# noinspection PyUnresolvedReferences
from app.core.data.orm.action import ActionORM

# noinspection PyUnresolvedReferences
from app.core.data.orm.analysis_table import AnalysisTableORM

# noinspection PyUnresolvedReferences
from app.core.data.orm.annotation_document import AnnotationDocumentORM

# noinspection PyUnresolvedReferences
from app.core.data.orm.bbox_annotation import BBoxAnnotationORM

# noinspection PyUnresolvedReferences
from app.core.data.orm.code import CodeORM

# noinspection PyUnresolvedReferences
from app.core.data.orm.document_tag import DocumentTagORM

# noinspection PyUnresolvedReferences
from app.core.data.orm.memo import MemoORM

# noinspection PyUnresolvedReferences
from app.core.data.orm.object_handle import ObjectHandleORM
from app.core.data.orm.orm_base import ORMBase

# noinspection PyUnresolvedReferences
from app.core.data.orm.preprocessing_job import PreprocessingJobORM

# noinspection PyUnresolvedReferences
from app.core.data.orm.preprocessing_job_payload import PreprocessingJobPayloadORM

# noinspection PyUnresolvedReferences
from app.core.data.orm.project import ProjectORM, ProjectUserLinkTable

# noinspection PyUnresolvedReferences
from app.core.data.orm.source_document import SourceDocumentORM

# noinspection PyUnresolvedReferences
from app.core.data.orm.source_document_data import SourceDocumentDataORM

# noinspection PyUnresolvedReferences
from app.core.data.orm.source_document_link import SourceDocumentLinkORM

# noinspection PyUnresolvedReferences
from app.core.data.orm.source_document_metadata import SourceDocumentMetadataORM

# noinspection PyUnresolvedReferences
from app.core.data.orm.span_annotation import SpanAnnotationORM

# noinspection PyUnresolvedReferences
from app.core.data.orm.span_group import SpanGroupORM

# noinspection PyUnresolvedReferences
from app.core.data.orm.span_text import SpanTextORM

# noinspection PyUnresolvedReferences
from app.core.data.orm.user import UserORM

# noinspection PyUnresolvedReferences
from app.core.data.orm.whiteboard import WhiteboardORM
from app.util.singleton_meta import SingletonMeta
from config import conf
from sqlalchemy.orm import Session, sessionmaker


class SQLService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        try:
            db_uri = PostgresDsn.build(
                scheme="postgresql",
                username=conf.postgres.user,
                password=conf.postgres.password,
                host=conf.postgres.host,
                port=int(conf.postgres.port),
                path=f"/{conf.postgres.db}",
            )

            engine = create_engine(
                str(db_uri),
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
