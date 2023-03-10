from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_db_session
from app.core.data.crud.project import crud_project
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.dto.prepro import PreProProjectStatus

router = APIRouter(prefix="/prepro")
tags = ["prepro"]


@router.get(
    "/project/{proj_id}/status",
    tags=tags,
    response_model=PreProProjectStatus,
    summary="Returns the PreProProjectStatus of the Project with the given ID.",
    description="Returns the PreProProjectStatus of the Project with the given ID.",
)
async def get_project_prepro_status(
    *, proj_id: int, db: Session = Depends(get_db_session)
) -> PreProProjectStatus:
    # TODO Flo: only if the user has access?
    crud_project.exists(db=db, id=proj_id, raise_error=True)
    all_sdocs = crud_sdoc.count_by_project(db=db, proj_id=proj_id, only_finished=False)
    finished_sdocs = crud_sdoc.count_by_project(
        db=db, proj_id=proj_id, only_finished=True
    )

    return PreProProjectStatus(
        project_id=proj_id,
        in_progress=all_sdocs > finished_sdocs,
        num_sdocs_in_progress=all_sdocs - finished_sdocs,
        num_sdocs_finished=finished_sdocs,
    )
