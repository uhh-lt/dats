from app.core.data.crud.source_document import crud_sdoc
from app.core.data.dto.source_document import SDocStatus
from app.core.data.repo.repo_service import RepoService
from app.core.db.sql_service import SQLService
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from loguru import logger

repo: RepoService = RepoService()
sql: SQLService = SQLService()


def remove_erroneous_or_unfinished_sdocs(cargo: PipelineCargo) -> PipelineCargo:
    # this method should be called before writing a document to the database. So in case
    # the document is already in the database but not finished, we remove it to make the
    # preprocessing pipeline idempotent.
    with sql.db_session() as db:
        # this should work for all kind of documents (audio, image, text, video)
        for doc in ["ppad", "pptd", "ppvd", "ppid"]:
            if cargo.data is None:
                continue

            if doc in cargo.data.keys():
                filename = str(cargo.data[doc].filename)

                sdoc = crud_sdoc.read_by_filename(
                    db=db,
                    proj_id=cargo.ppj_payload.project_id,
                    filename=filename,
                    only_finished=False,
                )
                if sdoc is not None and sdoc.status != SDocStatus.finished is False:
                    logger.info(
                        f"Removing erroneous or unfinished SourceDocument {filename}!"
                    )
                    sdoc = crud_sdoc.remove(db=db, id=sdoc.id)
    return cargo
