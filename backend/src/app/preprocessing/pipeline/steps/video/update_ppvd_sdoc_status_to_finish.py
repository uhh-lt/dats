from app.core.data.crud.source_document import crud_sdoc
from app.core.data.dto.source_document import SDocStatus
from app.core.db.sql_service import SQLService
from app.preprocessing.pipeline.model.audio.preproaudiodoc import PreProAudioDoc
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo

sqls = SQLService()


def update_ppvd_sdoc_status_to_finish(cargo: PipelineCargo) -> PipelineCargo:
    ppvd: PreProAudioDoc = cargo.data["ppvd"]
    with sqls.db_session() as db:
        crud_sdoc.update_status(
            db=db, sdoc_id=ppvd.sdoc_id, sdoc_status=SDocStatus.finished
        )
    return cargo
