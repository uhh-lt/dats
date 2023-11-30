from loguru import logger
from sqlalchemy.orm import Session

from app.core.data.crud.annotation_document import crud_adoc
from app.core.data.crud.crud_base import NoSuchElementError
from app.core.data.crud.project import crud_project
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.crud.source_document_link import crud_sdoc_link
from app.core.data.crud.source_document_metadata import crud_sdoc_meta
from app.core.data.crud.user import SYSTEM_USER_ID
from app.core.data.doc_type import DocType
from app.core.data.dto.annotation_document import AnnotationDocumentCreate
from app.core.data.dto.project_metadata import ProjectMetadataRead
from app.core.data.dto.source_document import SourceDocumentRead
from app.core.data.dto.source_document_link import SourceDocumentLinkCreate
from app.core.data.dto.source_document_metadata import SourceDocumentMetadataCreate
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.repo.repo_service import RepoService
from app.core.db.sql_service import SQLService
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.video.preprovideodoc import PreProVideoDoc

repo: RepoService = RepoService()
sql: SQLService = SQLService()


def _create_and_persist_sdoc(db: Session, ppvd: PreProVideoDoc) -> SourceDocumentORM:
    # generate the create_dto
    _, create_dto = repo.build_source_document_create_dto_from_file(
        proj_id=ppvd.project_id, filename=ppvd.filename
    )
    # persist SourceDocument
    sdoc_db_obj = crud_sdoc.create(db=db, create_dto=create_dto)

    return sdoc_db_obj


def _persist_sdoc_metadata(
    db: Session, sdoc_db_obj: SourceDocumentORM, ppvd: PreProVideoDoc
) -> None:
    sdoc_id = sdoc_db_obj.id
    sdoc = SourceDocumentRead.model_validate(sdoc_db_obj)
    ppvd.metadata["url"] = str(RepoService().get_sdoc_url(sdoc=sdoc))

    project_metadata = [
        ProjectMetadataRead.model_validate(pm)
        for pm in crud_project.read(db=db, id=ppvd.project_id).metadata_
        if pm.doctype == DocType.video
    ]
    project_metadata_map = {str(m.key): m for m in project_metadata}

    # we create SourceDocumentMetadata for every project metadata
    metadata_create_dtos = []
    for project_metadata_key, project_metadata in project_metadata_map.items():
        if project_metadata_key in ppvd.metadata.keys():
            metadata_create_dtos.append(
                SourceDocumentMetadataCreate.with_metatype(
                    value=ppvd.metadata[project_metadata_key],
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


def _create_adoc_for_system_user(db: Session, sdoc_db_obj: SourceDocumentORM) -> None:
    sdoc_id = sdoc_db_obj.id
    try:
        adoc_db = crud_adoc.read_by_sdoc_and_user(
            db=db, sdoc_id=sdoc_id, user_id=SYSTEM_USER_ID
        )
    except NoSuchElementError:
        adoc_db = None
    if not adoc_db:
        adoc_create = AnnotationDocumentCreate(
            source_document_id=sdoc_id, user_id=SYSTEM_USER_ID
        )
        adoc_db = crud_adoc.create(db=db, create_dto=adoc_create)


def _create_sdoc_link_for_audio_stream(
    db: Session, ppvd: PreProVideoDoc, sdoc_db_obj: SourceDocumentORM
) -> None:
    sdoc_id = sdoc_db_obj.id
    logger.info(f"Creating SourceDocumentLink for audio stream of {ppvd.filename}...")
    create_dto = SourceDocumentLinkCreate(
        parent_source_document_id=sdoc_id,
        linked_source_document_filename=ppvd.audio_filepath.name,
        linked_source_document_id=None,
    )
    crud_sdoc_link.create(db=db, create_dto=create_dto)


def write_ppvd_to_database(cargo: PipelineCargo) -> PipelineCargo:
    ppvd: PreProVideoDoc = cargo.data["ppvd"]

    with sql.db_session() as db:
        try:
            # create and persist SourceDocument
            sdoc_db_obj = _create_and_persist_sdoc(db=db, ppvd=ppvd)

            # persist SourceDocument Metadata
            _persist_sdoc_metadata(db=db, sdoc_db_obj=sdoc_db_obj, ppvd=ppvd)

            # create and persist SourceDocumentLink for audio stream
            _create_sdoc_link_for_audio_stream(
                db=db, ppvd=ppvd, sdoc_db_obj=sdoc_db_obj
            )

            # create AnnotationDocument for system user
            _create_adoc_for_system_user(db=db, sdoc_db_obj=sdoc_db_obj)

        except Exception as e:
            logger.error(
                f"Error while persisting PreprocessingPipeline Results "
                f"for {ppvd.filename}: {e}"
            )
            # FIXME: this is not working because we commmit the sessions in the cruds!
            # To fix it, we have to use flush instead of commit in the cruds and commit
            #  via the context manager, i.e., session autocommit...
            # But this would require huge changes!
            db.rollback()
            raise e
        else:
            logger.info(
                f"Persisted PreprocessingPipeline Results " f"for {ppvd.filename}!"
            )

            cargo.data["sdoc_id"] = sdoc_db_obj.id
    return cargo
