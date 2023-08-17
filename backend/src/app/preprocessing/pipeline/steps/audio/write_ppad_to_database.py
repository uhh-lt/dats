from loguru import logger
from sqlalchemy.orm import Session

from app.core.data.crud.annotation_document import crud_adoc
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.crud.source_document_metadata import crud_sdoc_meta
from app.core.data.crud.user import SYSTEM_USER_ID
from app.core.data.dto.annotation_document import AnnotationDocumentCreate
from app.core.data.dto.source_document import SourceDocumentRead
from app.core.data.dto.source_document_metadata import SourceDocumentMetadataCreate
from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.repo.repo_service import RepoService
from app.core.db.sql_service import SQLService
from app.preprocessing.pipeline.model.audio.preproaudiodoc import PreProAudioDoc
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo

repo: RepoService = RepoService()
sql: SQLService = SQLService()


def _create_and_persist_sdoc(db: Session, ppad: PreProAudioDoc) -> SourceDocumentORM:
    # generate the create_dto
    _, create_dto = repo.build_source_document_create_dto_from_file(
        proj_id=ppad.project_id, filename=ppad.filename
    )
    # persist SourceDocument
    sdoc_db_obj = crud_sdoc.create(db=db, create_dto=create_dto)
    ppad.sdoc_id = sdoc_db_obj.id

    return sdoc_db_obj


def _persist_sdoc_metadata(
    db: Session, sdoc_db_obj: SourceDocumentORM, ppad: PreProAudioDoc
) -> None:
    sdoc_id = sdoc_db_obj.id
    filename = sdoc_db_obj.filename
    sdoc = SourceDocumentRead.from_orm(sdoc_db_obj)
    ppad.metadata["url"] = str(RepoService().get_sdoc_url(sdoc=sdoc))

    metadata_create_dtos = [
        # persist original filename
        SourceDocumentMetadataCreate(
            key="file_name",
            value=str(filename),
            source_document_id=sdoc_id,
            read_only=True,
        ),
        # persist name
        SourceDocumentMetadataCreate(
            key="name",
            value=str(filename),
            source_document_id=sdoc_id,
            read_only=False,
        ),
    ]

    for key, value in ppad.metadata.items():
        metadata_create_dtos.append(
            SourceDocumentMetadataCreate(
                key=str(key),
                value=str(value),
                source_document_id=sdoc_id,
                read_only=True,
            )
        )

    crud_sdoc_meta.create_multi(db=db, create_dtos=metadata_create_dtos)


def _create_adoc_for_system_user(
    db: Session, ppad: PreProAudioDoc
) -> AnnotationDocumentORM:
    adoc_db = crud_adoc.read_by_sdoc_and_user(
        db=db, sdoc_id=ppad.sdoc_id, user_id=SYSTEM_USER_ID, raise_error=False
    )
    if not adoc_db:
        adoc_create = AnnotationDocumentCreate(
            source_document_id=ppad.sdoc_id, user_id=SYSTEM_USER_ID
        )
        adoc_db = crud_adoc.create(db=db, create_dto=adoc_create)
    return adoc_db


def write_ppad_to_database(cargo: PipelineCargo) -> PipelineCargo:
    ppad: PreProAudioDoc = cargo.data["ppad"]

    with sql.db_session() as db:
        try:
            # create and persist SourceDocument
            sdoc_db_obj = _create_and_persist_sdoc(db=db, ppad=ppad)

            # persist SourceDocument Metadata
            _persist_sdoc_metadata(db=db, sdoc_db_obj=sdoc_db_obj, ppad=ppad)

            # create AnnotationDocument for system user
            _create_adoc_for_system_user(db=db, ppad=ppad)

        except Exception as e:
            logger.error(
                f"Error while persisting PreprocessingPipeline Results "
                f"for {ppad.filename}: {e}"
            )
            # FIXME: this is not working because we commmit the sessions in the cruds!
            # To fix it, we have to use flush instead of commit in the cruds and commit
            #  via the context manager, i.e., session autocommit...
            # But this would require huge changes!
            db.rollback()
            raise e
        else:
            logger.info(
                f"Persisted PreprocessingPipeline Results " f"for {ppad.filename}!"
            )

            ppad.sdoc_id = sdoc_db_obj.id
    return cargo
