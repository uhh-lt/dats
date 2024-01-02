from typing import Dict, List, Set

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
        if db_version.version < 5:
            __migrate_remove_metadata_filename(db)
            db_version.version = 5
            db.commit()
            print("MIGRATED REMOVE METADATA FILENAMES!")
        if db_version.version < 6:
            __migrate_add_default_metadata(db)
            db_version.version = 6
            db.commit()
            print("MIGRATED ADD DEFAULT PROJECTMETADATA!")
        if db_version.version < 7:
            __migrate_add_missing_sdoc_metadata(db)
            db_version.version = 7
            db.commit()
            print("MIGRATED ADD MISSING SDOC METADATA!")
        if db_version.version < 8:
            __migrate_image_width_height(db)
            db_version.version = 8
            db.commit()
            print("MIGRATED IMAGE WIDTH HEIGHT!")


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
    ids = {id[0] for id in ids}
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
    logger.info("Migrating metadata names to sdoc names...")
    sdoc_name_metadata = (
        db.query(SourceDocumentMetadataORM)
        .join(SourceDocumentMetadataORM.project_metadata)
        .filter(ProjectMetadataORM.key == "name")
        .all()
    )
    # copy metadata name to sdoc name & remove sdoc metadata
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

    # delete project metadata with key "name"
    for pm in (
        db.query(ProjectMetadataORM).filter(ProjectMetadataORM.key == "name").all()
    ):
        db.delete(pm)

    db.commit()


def __migrate_remove_metadata_filename(db: Session):
    project_filename_metadata = (
        db.query(ProjectMetadataORM).filter(ProjectMetadataORM.key == "file_name").all()
    )
    logger.info("Deleting project metadata 'file_name'...")
    for sdoc_meta in project_filename_metadata:
        db.delete(sdoc_meta)

    db.commit()


def __create_project_metadata_if_not_exists(
    db: Session,
    create_dto: ProjectMetadataCreate,
):
    pm = (
        db.query(ProjectMetadataORM)
        .filter(
            ProjectMetadataORM.project_id == create_dto.project_id,
            ProjectMetadataORM.key == create_dto.key,
            ProjectMetadataORM.doctype == create_dto.doctype,
        )
        .one_or_none()
    )

    if pm is None:
        crud_project_meta.create(db, create_dto=create_dto)


def __migrate_add_default_metadata(db: Session):
    from config import conf

    project_ids = [id[0] for id in db.query(ProjectORM.id).all()]
    for project_id in project_ids:
        logger.info(
            "Migration: Creating default ProjectMetadata for project {}...", project_id
        )

        for project_metadata in conf.project_metadata.values():
            create_dto = ProjectMetadataCreate(
                project_id=project_id,
                key=project_metadata["key"],
                metatype=project_metadata["metatype"],
                read_only=project_metadata["read_only"],
                doctype=project_metadata["doctype"],
            )
            __create_project_metadata_if_not_exists(db, create_dto)


def __migrate_add_missing_sdoc_metadata(db: Session):
    projects = db.query(ProjectORM).all()
    for project in projects:
        logger.info(
            "Migration: Adding missing SourceDocumentMetadata for project {}...",
            project.id,
        )
        create_dtos = []

        # create map of doctype -> project metadata
        docttype_project_metadata_map: Dict[str, List[ProjectMetadataORM]] = {}
        for project_metadata in project.metadata_:
            if project_metadata.doctype not in docttype_project_metadata_map:
                docttype_project_metadata_map[project_metadata.doctype] = []
            docttype_project_metadata_map[project_metadata.doctype].append(
                project_metadata
            )

        for sdoc in project.source_documents:
            # identify which metadata is missing
            current_metadata_ids = [sm.project_metadata_id for sm in sdoc.metadata_]
            for pm in docttype_project_metadata_map[sdoc.doctype]:
                if pm.id in current_metadata_ids:
                    continue

                # create missing metadata
                create_dtos.append(
                    SourceDocumentMetadataCreate.with_metatype(
                        metatype=pm.metatype,
                        source_document_id=sdoc.id,
                        project_metadata_id=pm.id,
                    )
                )

        crud_sdoc_meta.create_multi(db, create_dtos=create_dtos)


def __convert_string_to_int_metadata(db: Session, proj_metadata: ProjectMetadataORM):
    for sdoc_meta in proj_metadata.sdoc_metadata:
        if sdoc_meta.str_value is None:
            continue
        sdoc_meta.int_value = (
            round(float(sdoc_meta.str_value)) if len(sdoc_meta.str_value) > 0 else 0
        )
        sdoc_meta.str_value = None
        db.add(sdoc_meta)


def __migrate_image_width_height(db: Session):
    projects = db.query(ProjectORM).all()
    for project in projects:
        logger.info(
            "Migration: Fixing image width height for project {}...",
            project.id,
        )
        width_pm = (
            db.query(ProjectMetadataORM)
            .filter(
                ProjectMetadataORM.key == "width",
                ProjectMetadataORM.project_id == project.id,
                ProjectMetadataORM.doctype == DocType.image,
            )
            .one_or_none()
        )
        height_pm = (
            db.query(ProjectMetadataORM)
            .filter(
                ProjectMetadataORM.key == "height",
                ProjectMetadataORM.project_id == project.id,
                ProjectMetadataORM.doctype == DocType.image,
            )
            .one_or_none()
        )
        if width_pm:
            __convert_string_to_int_metadata(db, width_pm)
            width_pm.metatype = MetaType.NUMBER
            db.add(width_pm)
        if height_pm:
            __convert_string_to_int_metadata(db, height_pm)
            height_pm.metatype = MetaType.NUMBER
            db.add(height_pm)

        db.commit()
