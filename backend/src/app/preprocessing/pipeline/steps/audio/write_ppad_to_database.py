from loguru import logger
from sqlalchemy.orm import Session

from app.core.data.crud.annotation_document import crud_adoc
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.crud.user import SYSTEM_USER_ID
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

    return sdoc_db_obj


def _create_adoc_for_system_user(db: Session, sdoc_db_obj: SourceDocumentORM) -> None:
    logger.info(
        f"Creating AnnotationDocument for system user for {sdoc_db_obj.filename}..."
    )
    crud_adoc.exists_or_create(db=db, sdoc_id=sdoc_db_obj.id, user_id=SYSTEM_USER_ID)


def write_ppad_to_database(cargo: PipelineCargo) -> PipelineCargo:
    ppad: PreProAudioDoc = cargo.data["ppad"]

    with sql.db_session() as db:
        try:
            # create and persist SourceDocument
            sdoc_db_obj = _create_and_persist_sdoc(db=db, ppad=ppad)

            # create AnnotationDocument for system user
            _create_adoc_for_system_user(db=db, sdoc_db_obj=sdoc_db_obj)

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
            logger.info(f"Persisted PreprocessingPipeline Results for {ppad.filename}!")

            cargo.data["sdoc_id"] = sdoc_db_obj.id
    return cargo
