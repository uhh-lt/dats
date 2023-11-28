from typing import Set

from loguru import logger
from sqlalchemy import exists
from sqlalchemy.orm import Session

from alembic.command import upgrade
from alembic.config import Config
from app.core.data.crud.source_document_data import crud_sdoc_data
from app.core.data.doc_type import DocType
from app.core.data.dto.search import ElasticSearchDocumentRead
from app.core.data.dto.source_document import SDocStatus
from app.core.data.dto.source_document_data import SourceDocumentDataCreate
from app.core.data.orm.project import ProjectORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.source_document_data import SourceDocumentDataORM
from app.core.data.orm.version import VersionORM
from app.core.db.sql_service import SQLService
from app.core.search.elasticsearch_service import ElasticSearchService


def run_required_migrations():
    __migrate_database_schema()
    with SQLService().db_session() as db:
        db_version = db.query(VersionORM).first()
        if db_version is None:
            db_version = VersionORM(version=0)
            db.add(db_version)
            db.commit()
            db.refresh(db_version)
        if db_version.version < 1:
            __migrate_es_docs_to_database(db)
            db_version.version = 1
            db.commit()
            print("MIGRATED ES DOCS!")


def __migrate_database_schema() -> None:
    config = Config("alembic.ini")
    upgrade(config, "head")
    print("MIGRATED DB SCHEMA!")


def __migrate_es_docs_to_database(db: Session):
    fields = {
        "content",
        "html",
        "token_character_offsets",
        "sentence_character_offsets",
    }
    limit = 100
    project_ids = [id[0] for id in db.query(ProjectORM.id).all()]
    for project_id in project_ids:
        while True:
            num_migrated = __migrate_project_docs(db, project_id, fields, limit)
            if num_migrated != limit:
                break
        logger.info(
            "Successfully migrated ES documents to DB for project {}", project_id
        )


def __migrate_project_docs(
    db: Session, project_id: int, fields: Set[str], limit: int
) -> int:
    ids = (
        db.query(SourceDocumentORM.id)
        .filter(
            SourceDocumentORM.doctype == DocType.text,
            SourceDocumentORM.project_id == project_id,
            SourceDocumentORM.status == SDocStatus.finished,
            ~exists().where(SourceDocumentORM.id == SourceDocumentDataORM.id),
        )
        .limit(limit)
        .all()
    )
    if len(ids) == 0:
        return 0
    ids = [id[0] for id in ids]
    es_docs = ElasticSearchService().get_esdocs_by_sdoc_ids(
        proj_id=project_id, sdoc_ids=ids, fields=fields
    )
    sdoc_datas = [__es_doc_to_sdoc_data(es_doc) for es_doc in es_docs]
    crud_sdoc_data.create_multi(db, create_dtos=sdoc_datas)
    db.commit()
    return len(sdoc_datas)


def __es_doc_to_sdoc_data(
    es_doc: ElasticSearchDocumentRead,
) -> SourceDocumentDataCreate:
    data = SourceDocumentDataCreate(
        id=es_doc.sdoc_id,
        content=es_doc.content,
        html=es_doc.html,
        token_starts=[o.gte for o in es_doc.token_character_offsets],
        token_ends=[o.lt for o in es_doc.token_character_offsets],
        sentence_starts=[o.gte for o in es_doc.sentence_character_offsets],
        sentence_ends=[o.lt for o in es_doc.sentence_character_offsets],
    )
    return data
