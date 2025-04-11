import traceback
from typing import Optional

from app.core.data.crud.annotation_document import crud_adoc
from app.core.data.crud.document_tag import crud_document_tag
from app.core.data.crud.project import crud_project
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.crud.source_document_data import crud_sdoc_data
from app.core.data.crud.source_document_metadata import crud_sdoc_meta
from app.core.data.crud.user import SYSTEM_USER_ID
from app.core.data.doc_type import DocType
from app.core.data.dto.project_metadata import ProjectMetadataRead
from app.core.data.dto.source_document import SourceDocumentRead
from app.core.data.dto.source_document_data import SourceDocumentDataCreate
from app.core.data.dto.source_document_metadata import SourceDocumentMetadataCreate
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.repo.repo_service import RepoService
from app.core.db.elasticsearch_service import ElasticSearchService
from app.core.db.sql_service import SQLService
from app.preprocessing.pipeline.model.audio.preproaudiodoc import PreProAudioDoc
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.preprodoc_base import PreProDocBase
from app.preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc
from loguru import logger
from sqlalchemy.orm import Session

repo: RepoService = RepoService()
sql: SQLService = SQLService()
es = ElasticSearchService()


def __create_and_persist_sdoc(db: Session, ppdb: PreProDocBase) -> SourceDocumentORM:
    logger.info(f"Persisting SourceDocument for {ppdb.filename}...")
    # generate the create_dto
    _, create_dto = repo.build_source_document_create_dto_from_file(
        proj_id=ppdb.project_id,
        filename=ppdb.filename,
    )
    # persist SourceDocument
    sdoc_db_obj = crud_sdoc.create(db=db, create_dto=create_dto)

    return sdoc_db_obj


def __persist_sdoc_metadata(
    db: Session, sdoc_db_obj: SourceDocumentORM, ppdb: PreProDocBase
) -> None:
    logger.info(f"Persisting SourceDocument Metadata for {ppdb.filename}...")
    sdoc_id = sdoc_db_obj.id
    sdoc = SourceDocumentRead.model_validate(sdoc_db_obj)
    ppdb.metadata["url"] = str(RepoService().get_sdoc_url(sdoc=sdoc))
    doctype: DocType = DocType(sdoc.doctype)

    project_metadata = [
        ProjectMetadataRead.model_validate(pm)
        for pm in crud_project.read(db=db, id=ppdb.project_id).metadata_
        if pm.doctype == doctype
    ]
    project_metadata_map = {str(m.key): m for m in project_metadata}

    # we create SourceDocumentMetadata for every project metadata
    metadata_create_dtos = []
    for project_metadata_key, project_metadata in project_metadata_map.items():
        if project_metadata_key in ppdb.metadata.keys():
            metadata_create_dtos.append(
                SourceDocumentMetadataCreate.with_metatype(
                    value=ppdb.metadata[project_metadata_key],
                    source_document_id=sdoc_id,
                    project_metadata_id=project_metadata.id,
                    metatype=project_metadata.metatype,
                )
            )
        else:
            metadata_create_dtos.append(
                SourceDocumentMetadataCreate.with_metatype(
                    source_document_id=sdoc_id,
                    project_metadata_id=project_metadata.id,
                    metatype=project_metadata.metatype,
                )
            )

    crud_sdoc_meta.create_multi(db=db, create_dtos=metadata_create_dtos)


def __persist_tags(
    db: Session, sdoc_db_obj: SourceDocumentORM, ppdb: PreProDocBase
) -> None:
    tags = ppdb.tags
    if len(tags) > 0:
        logger.info(f"Persisting SourceDocument Tags for {ppdb.filename}...")
        crud_document_tag.link_multiple_document_tags(
            db=db,
            sdoc_ids=[sdoc_db_obj.id],
            tag_ids=tags,
        )


def __create_adoc_for_system_user(db: Session, sdoc_db_obj: SourceDocumentORM) -> None:
    logger.info(
        f"Creating AnnotationDocument for system user for {sdoc_db_obj.filename}..."
    )
    crud_adoc.exists_or_create(db=db, sdoc_id=sdoc_db_obj.id, user_id=SYSTEM_USER_ID)


def __persist_sdoc_data(
    db: Session,
    sdoc_db_obj: SourceDocumentORM,
    pptd: PreProTextDoc,
    ppad: Optional[PreProAudioDoc] = None,
) -> None:
    additional_parameters = {}
    if ppad is not None:
        assert len(ppad.word_level_transcriptions) == len(
            pptd.token_character_offsets
        ), (
            "Expected audio word level transcriptions to be of same length as text tokens"
            f", but got {len(ppad.word_level_transcriptions)} and {len(pptd.token_character_offsets)} instead."
        )
        additional_parameters["token_time_starts"] = [
            t.start_ms for t in ppad.word_level_transcriptions
        ]
        additional_parameters["token_time_ends"] = [
            t.end_ms for t in ppad.word_level_transcriptions
        ]

    sdoc = SourceDocumentRead.model_validate(sdoc_db_obj)
    url = RepoService().get_sdoc_url(
        sdoc=SourceDocumentRead.model_validate(sdoc),
        relative=True,
        webp=sdoc.doctype == DocType.image,
        thumbnail=False,
    )

    sdoc_data = SourceDocumentDataCreate(
        id=sdoc_db_obj.id,
        content=pptd.text,
        html=pptd.html,
        token_starts=[s for s, _ in pptd.token_character_offsets],
        token_ends=[e for _, e in pptd.token_character_offsets],
        sentence_starts=[s.start for s in pptd.sentences],
        sentence_ends=[s.end for s in pptd.sentences],
        repo_url=url,
        token_time_starts=additional_parameters.get("token_time_starts", None),
        token_time_ends=additional_parameters.get("token_time_ends", None),
    )
    crud_sdoc_data.create(db=db, create_dto=sdoc_data)


def persist_sdoc_info(cargo: PipelineCargo) -> PipelineCargo:
    pptd: PreProTextDoc = cargo.data["pptd"]
    ppad: Optional[PreProAudioDoc] = (
        cargo.data["ppad"] if "ppad" in cargo.data else None
    )
    doctype: DocType = cargo.ppj_payload.doc_type

    match doctype:
        case DocType.text:
            ppdb: PreProDocBase = cargo.data["pptd"]
        case DocType.image:
            ppdb: PreProDocBase = cargo.data["ppid"]
        case DocType.audio:
            ppdb: PreProDocBase = cargo.data["ppad"]
        case DocType.video:
            ppdb: PreProDocBase = cargo.data["ppvd"]

    with sql.db_session() as db:
        try:
            # create and persist SourceDocument
            sdoc_db_obj = __create_and_persist_sdoc(db=db, ppdb=ppdb)

            # persist SourceDocument Metadata
            __persist_sdoc_metadata(db=db, sdoc_db_obj=sdoc_db_obj, ppdb=ppdb)

            # persist SourceDocumentData
            __persist_sdoc_data(db=db, sdoc_db_obj=sdoc_db_obj, pptd=pptd, ppad=ppad)

            # persist Tags
            __persist_tags(db=db, sdoc_db_obj=sdoc_db_obj, ppdb=ppdb)

            # create AnnotationDocument for system user
            __create_adoc_for_system_user(db=db, sdoc_db_obj=sdoc_db_obj)

        except Exception as e:
            logger.error(
                f"Error while persisting PreprocessingPipeline Results "
                f"for {pptd.filename}"
            )
            traceback.print_exception(e)
            # FIXME: this is not working because we commmit the sessions in the cruds!
            # To fix it, we have to use flush instead of commit in the cruds and commit
            #  via the context manager, i.e., session autocommit...
            # But this would require huge changes!
            db.rollback()
            raise e
        else:
            logger.info(f"Persisted PreprocessingPipeline Results for {pptd.filename}!")

            cargo.data["sdoc_id"] = sdoc_db_obj.id
    return cargo
