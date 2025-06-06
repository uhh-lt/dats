from typing import List, Optional

from app.core.authorization.authz_user import AuthzUser
from app.core.data.dto.trainer_job import TrainerJobParameters, TrainerJobRead
from app.core.db.redis_service import RedisService
from app.trainer.trainer_service import TrainerService
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_current_user, get_db_session

router = APIRouter(
    prefix="/trainer", dependencies=[Depends(get_current_user)], tags=["trainer"]
)

redis: RedisService = RedisService()
ts: TrainerService = TrainerService()


@router.post(
    "/",
    response_model=TrainerJobRead,
    summary="Starts a TrainerJob",
    description="Starts a TrainerJob with the given parameters",
)
async def start_trainer_job(
    *,
    db: Session = Depends(get_db_session),
    parameters: TrainerJobParameters,
    authz_user: AuthzUser = Depends(),
) -> Optional[TrainerJobRead]:
    authz_user.assert_in_project(parameters.project_id)

    return ts.create_and_start_trainer_job_async(db=db, trainer_params=parameters)


@router.get(
    "/{trainer_job_id}",
    response_model=Optional[TrainerJobRead],
    summary="Returns the TrainerJob for the given ID",
    description="Returns the TrainerJob for the given ID if it exists",
)
async def get_trainer_job(
    *,
    trainer_job_id: str,
    authz_user: AuthzUser = Depends(),
) -> Optional[TrainerJobRead]:
    trainer_job = redis.load_trainer_job(trainer_job_id)

    authz_user.assert_in_project(trainer_job.parameters.project_id)

    return trainer_job


@router.get(
    "/project/{project_id}",
    response_model=List[TrainerJobRead],
    summary="Returns all TrainerJobs for the given project ID",
    description="Returns all TrainerJobs for the given project ID if it exists",
)
async def get_all_trainer_jobs(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[TrainerJobRead]:
    authz_user.assert_in_project(project_id)

    return redis.get_all_trainer_jobs(project_id=project_id)
