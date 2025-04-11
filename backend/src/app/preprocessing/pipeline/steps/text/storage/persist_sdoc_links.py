import traceback

from app.core.data.crud.source_document import crud_sdoc
from app.core.data.crud.source_document_link import crud_sdoc_link
from app.core.db.sql_service import SQLService
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc
from loguru import logger

sql: SQLService = SQLService()


def persist_sdoc_links(cargo: PipelineCargo) -> PipelineCargo:
    pptd: PreProTextDoc = cargo.data["pptd"]
    with sql.db_session() as db:
        try:
            # read SourceDocument
            sdoc_db_obj = crud_sdoc.read(db=db, id=cargo.data["sdoc_id"])
            logger.info(f"Persisting SourceDocument Links for {pptd.filename}...")
            # we have to set the parent source document id for the links
            sdoc_id = sdoc_db_obj.id
            for link_create_dto in pptd.sdoc_link_create_dtos:
                link_create_dto.parent_source_document_id = sdoc_id

            crud_sdoc_link.create_multi(db=db, create_dtos=pptd.sdoc_link_create_dtos)
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
    return cargo
