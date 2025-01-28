from app.core.data.crud.source_document_link import crud_sdoc_link
from app.core.db.sql_service import SQLService
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo


def resolve_sdoc_links(cargo: PipelineCargo) -> PipelineCargo:
    with SQLService().db_session() as db:
        crud_sdoc_link.resolve_filenames_to_sdoc_ids(
            db=db, proj_id=cargo.ppj_payload.project_id
        )

    return cargo
