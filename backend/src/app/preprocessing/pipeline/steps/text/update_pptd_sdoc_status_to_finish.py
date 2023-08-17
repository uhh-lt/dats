from app.core.data.crud.source_document import crud_sdoc
from app.core.data.dto.source_document import SDocStatus
from app.core.db.sql_service import SQLService
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc

sqls = SQLService()


def update_pptd_sdoc_status_to_finish(cargo: PipelineCargo) -> PipelineCargo:
    pptd: PreProTextDoc = cargo.data["pptd"]
    with sqls.db_session() as db:
        crud_sdoc.update_status(
            db=db, sdoc_id=pptd.sdoc_id, sdoc_status=SDocStatus.finished
        )
    return cargo
