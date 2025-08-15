from preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from repos.db.sql_repo import SQLRepo

sqlr = SQLRepo()


def update_sdoc_status_to_finish(cargo: PipelineCargo) -> PipelineCargo:
    # sdoc_id = cargo.data["sdoc_id"]
    # with sqlr.db_session() as db:
    # crud_sdoc.update_status(db=db, sdoc_id=sdoc_id, sdoc_status=SDocStatus.finished)
    return cargo
