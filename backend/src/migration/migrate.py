from typing import List, Set

from loguru import logger
from sqlalchemy import exists
from sqlalchemy.orm import Session

from alembic.command import upgrade
from alembic.config import Config
from app.core.data.crud.project_metadata import crud_project_meta
from app.core.data.crud.source_document_data import crud_sdoc_data
from app.core.data.crud.source_document_metadata import crud_sdoc_meta
from app.core.data.doc_type import DocType
from app.core.data.dto.project_metadata import ProjectMetadataCreate
from app.core.data.dto.search import ElasticSearchDocumentRead
from app.core.data.dto.source_document import SDocStatus
from app.core.data.dto.source_document_data import SourceDocumentDataCreate
from app.core.data.dto.source_document_metadata import SourceDocumentMetadataCreate
from app.core.data.meta_type import MetaType
from app.core.data.orm.project import ProjectORM
from app.core.data.orm.project_metadata import ProjectMetadataORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.source_document_data import SourceDocumentDataORM
from app.core.data.orm.source_document_metadata import SourceDocumentMetadataORM
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
            __migrate_es_docs_to_database(db, doctype=DocType.text)
            db_version.version = 1
            db.commit()
            print("MIGRATED ES TEXT DOCS!")
        if db_version.version < 2:
            __migrate_es_keywords_to_database(db)
            db_version.version = 2
            db.commit()
            print("MIGRATED ES KEYWORDS!")
        if db_version.version < 3:
            __migrate_metadata_name_to_sdoc_name(db)
            db_version.version = 3
            db.commit()
            print("MIGRATED METADATA NAMES!")
        if db_version.version < 4:
            __migrate_es_docs_to_database(db, doctype=DocType.image)
            db_version.version = 4
            db.commit()
            print("MIGRATED ES IMAGE DOCS!")


def __migrate_database_schema() -> None:
    config = Config("alembic.ini")
    upgrade(config, "head")
    print("MIGRATED DB SCHEMA!")


def __migrate_es_docs_to_database(db: Session, doctype: DocType):
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
            num_migrated = __migrate_project_docs(
                db, project_id, fields, limit, doctype
            )
            if num_migrated != limit:
                break
        logger.info(
            "Successfully migrated ES documents to DB for project {}", project_id
        )


def __migrate_project_docs(
    db: Session, project_id: int, fields: Set[str], limit: int, doctype: DocType
) -> int:
    ids = (
        db.query(SourceDocumentORM.id)
        .filter(
            SourceDocumentORM.doctype == doctype,
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


def __create_or_get_project_metadata_keywords(
    db: Session,
    project_id: int,
    doctype: DocType,
):
    pm = (
        db.query(ProjectMetadataORM)
        .filter(
            ProjectMetadataORM.project_id == project_id,
            ProjectMetadataORM.key == "keywords",
            ProjectMetadataORM.doctype == doctype,
        )
        .one_or_none()
    )

    if pm is not None:
        return pm.id
    else:
        return crud_project_meta.create(
            db,
            create_dto=ProjectMetadataCreate(
                key="keywords",
                metatype=MetaType.LIST,
                read_only=True,
                doctype=doctype,
                project_id=project_id,
            ),
        ).id


def __create_or_update_sdoc_metadata_keywords(
    db: Session,
    sdoc_id: int,
    pm_id: int,
    keywords: List[str],
):
    if len(keywords) == 0:
        return

    sdoc_metadata = (
        db.query(SourceDocumentMetadataORM)
        .filter(
            SourceDocumentMetadataORM.source_document_id == sdoc_id,
            SourceDocumentMetadataORM.project_metadata_id == pm_id,
        )
        .one_or_none()
    )

    if sdoc_metadata is not None:
        if sdoc_metadata.list_value is None or len(sdoc_metadata.list_value) == 0:
            sdoc_metadata.list_value = keywords
            db.add(sdoc_metadata)
            db.commit()
    else:
        crud_sdoc_meta.create(
            db,
            create_dto=SourceDocumentMetadataCreate(
                str_value=None,
                boolean_value=None,
                int_value=None,
                list_value=keywords,
                date_value=None,
                source_document_id=sdoc_id,
                project_metadata_id=pm_id,
            ),
        )


def __migrate_project_keywords(
    db: Session, project_id: int, sdoc_ids: List[int], pm_id: int
):
    if len(sdoc_ids) == 0:
        return

    es_docs = ElasticSearchService().get_esdocs_by_sdoc_ids(
        proj_id=project_id, sdoc_ids=set(sdoc_ids), fields={"keywords"}
    )
    if es_docs is None:
        return

    es_docs_keyword_map = {es_doc.sdoc_id: es_doc.keywords for es_doc in es_docs}
    for sdoc_id, keywords in es_docs_keyword_map.items():
        __create_or_update_sdoc_metadata_keywords(
            db=db, sdoc_id=sdoc_id, pm_id=pm_id, keywords=keywords
        )


def __migrate_es_keywords_to_database(db: Session):
    project_ids = [id[0] for id in db.query(ProjectORM.id).all()]
    for project_id in project_ids:
        logger.info("Migrating ES keywords to DB for project {}...", project_id)

        # migrate text document keywords
        pm_id = __create_or_get_project_metadata_keywords(
            db=db, project_id=project_id, doctype=DocType.text
        )

        sdoc_ids = [
            x[0]
            for x in (
                db.query(SourceDocumentORM.id)
                .filter(
                    SourceDocumentORM.doctype == DocType.text,
                    SourceDocumentORM.project_id == project_id,
                    SourceDocumentORM.status == SDocStatus.finished,
                )
                .all()
            )
        ]
        __migrate_project_keywords(db, project_id, sdoc_ids=sdoc_ids, pm_id=pm_id)

        # migrate image document keywords
        pm_id = __create_or_get_project_metadata_keywords(
            db=db, project_id=project_id, doctype=DocType.image
        )
        sdoc_ids = [
            x[0]
            for x in (
                db.query(SourceDocumentORM.id)
                .filter(
                    SourceDocumentORM.doctype == DocType.image,
                    SourceDocumentORM.project_id == project_id,
                    SourceDocumentORM.status == SDocStatus.finished,
                )
                .all()
            )
        ]
        __migrate_project_keywords(db, project_id, sdoc_ids=sdoc_ids, pm_id=pm_id)


def __migrate_metadata_name_to_sdoc_name(db: Session):
    sdoc_name_metadata = (
        db.query(SourceDocumentMetadataORM)
        .join(SourceDocumentMetadataORM.project_metadata)
        .filter(ProjectMetadataORM.key == "name")
        .all()
    )
    logger.info("Migrating metadata names to sdoc names...")
    for sdoc_meta in sdoc_name_metadata:
        if sdoc_meta.str_value is None:
            continue

        sdoc = (
            db.query(SourceDocumentORM)
            .filter(SourceDocumentORM.id == sdoc_meta.source_document_id)
            .one()
        )
        sdoc.name = sdoc_meta.str_value
        db.add(sdoc)
        db.delete(sdoc_meta)

    db.commit()
