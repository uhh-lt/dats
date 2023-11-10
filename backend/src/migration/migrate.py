import io
from typing import Set

from alembic.command import current, ensure_version, stamp, upgrade
from alembic.config import Config
from alembic.script import ScriptDirectory
from app.core.data.crud.source_document_data import crud_sdoc_data
from app.core.data.doc_type import DocType
from app.core.data.dto.search import ElasticSearchDocumentRead
from app.core.data.dto.source_document import SDocStatus
from app.core.data.dto.source_document_data import SourceDocumentDataCreate
from app.core.data.orm import ProjectORM, SourceDocumentDataORM, VersionORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.db.sql_service import SQLService
from app.core.search.elasticsearch_service import ElasticSearchService
from loguru import logger
from sqlalchemy import exists
from sqlalchemy.orm import Session


def run_required_migrations():
    __migrate_database_schema()
    with SQLService().db_session() as db:
        db_version = db.query(VersionORM).first()
        if db_version is None:
            db_version = VersionORM(version=1)
            db.add(db_version)
            db.commit()
            db.refresh(db_version)
        if db_version.version < 1:
            logger.info(
                "ES docs need to be migrated to SQL database. This can take some time..."
            )
            __migrate_es_docs_to_database(db)
            db_version.version = 1
            db.commit()
            logger.info("ES docs migrated!")


def __migrate_database_schema() -> None:
    config = Config("alembic.ini")
    ensure_version(config)
    output_buffer = io.StringIO()
    config.stdout = output_buffer
    current(config)
    current_revision = output_buffer.getvalue()
    script = ScriptDirectory.from_config(config)
    head_revision = script.get_current_head()
    if not current_revision:
        logger.info("Alembic revision not set! Assuming an up-to-date, clean DB.")
        stamp(config, head_revision)
        logger.info("Set Alembic revision to latest: {}", head_revision)
    elif not current_revision.startswith(head_revision):
        logger.info("Running DB schema migration!")
        upgrade(config, "head")
        logger.info("Migrated DB schema!")
    else:
        logger.info("DB schema is up-to-date. No migrations are run.")


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
