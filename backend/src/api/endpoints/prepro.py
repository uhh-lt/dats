from typing import List, Optional

from api.dependencies import get_db_session
from app.core.data.crud.project import crud_project
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.dto.prepro import PreProProjectStatus
from app.core.data.dto.preprocessing_job import PreprocessingJobRead
from app.core.db.redis_service import RedisService
from app.preprocessing.preprocessing_service import PreprocessingService
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

router = APIRouter(prefix="/prepro")
tags = ["prepro"]

redis: RedisService = RedisService()
pps: PreprocessingService = PreprocessingService()


@router.get(
    "/{prepro_job_id}",
    tags=tags,
    response_model=Optional[PreprocessingJobRead],
    summary="Returns the PreprocessingJob for the given ID",
    description="Returns the PreprocessingJob for the given ID if it exists",
)
async def get_prepro_job(
    *,
    prepro_job_id: str,
) -> Optional[PreprocessingJobRead]:
    # TODO Flo: only if the user has access?
    return redis.load_preprocessing_job(key=prepro_job_id)


@router.patch(
    "/{prepro_job_id}/abort",
    tags=tags,
    response_model=Optional[PreprocessingJobRead],
    summary="Aborts the PreprocessingJob for the given ID",
    description="Aborts the PreprocessingJob for the given ID if it exists",
)
async def abort_prepro_job(
    *,
    prepro_job_id: str,
) -> Optional[PreprocessingJobRead]:
    # TODO Flo: only if the user has access?
    return pps.abort_preprocessing_job(ppj_id=prepro_job_id)


@router.get(
    "/project/{project_id}",
    tags=tags,
    response_model=List[PreprocessingJobRead],
    summary="Returns all PreprocessingJobs for the given project ID",
    description="Returns all PreprocessingJobs for the given project ID if it exists",
)
async def get_all_prepro_jobs(
    *,
    project_id: int,
) -> List[PreprocessingJobRead]:
    # TODO Flo: only if the user has access?
    prepro_jobs = redis.get_all_preprocessing_jobs(project_id=project_id)
    prepro_jobs.sort(key=lambda x: x.created, reverse=True)
    return prepro_jobs


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
        num_sdocs_total=all_sdocs,
    )
