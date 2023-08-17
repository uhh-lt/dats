from app.core.data.crud.source_document import crud_sdoc
from app.core.data.dto.source_document import SDocStatus
from app.core.db.sql_service import SQLService
from app.preprocessing.pipeline.model.image.preproimagedoc import PreProImageDoc
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo

sqls = SQLService()


def update_ppid_sdoc_status_to_finish(cargo: PipelineCargo) -> PipelineCargo:
    ppid: PreProImageDoc = cargo.data["ppid"]
    with sqls.db_session() as db:
        crud_sdoc.update_status(
            db=db, sdoc_id=ppid.sdoc_id, sdoc_status=SDocStatus.finished
        )
    return cargo
