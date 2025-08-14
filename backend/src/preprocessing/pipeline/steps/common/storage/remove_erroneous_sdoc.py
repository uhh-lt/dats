from common.sdoc_status_enum import SDocStatus
from core.doc.source_document_crud import crud_sdoc
from loguru import logger
from preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from repos.db.sql_repo import SQLRepo
from repos.filesystem_repo import FilesystemRepo

fsr: FilesystemRepo = FilesystemRepo()
sql: SQLRepo = SQLRepo()


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
                # if sdoc is not None and sdoc.status != SDocStatus.finished is False:
                #     logger.info(
                #         f"Removing erroneous or unfinished SourceDocument {filename}!"
                #     )
                #     sdoc = crud_sdoc.delete(db=db, id=sdoc.id)
    return cargo
