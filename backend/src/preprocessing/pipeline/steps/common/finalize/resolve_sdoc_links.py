from core.doc.source_document_link_crud import crud_sdoc_link
from preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from repos.db.sql_repo import SQLRepo


def resolve_sdoc_links(cargo: PipelineCargo) -> PipelineCargo:
    with SQLRepo().db_session() as db:
        crud_sdoc_link.resolve_filenames_to_sdoc_ids(
            db=db, proj_id=cargo.ppj_payload.project_id
        )

    return cargo
