from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from fastapi import APIRouter, Depends
from modules.trainer.trainer_job_dto import TrainerJobParameters, TrainerJobRead
from modules.trainer.trainer_service import TrainerService
from repos.redis_repo import RedisRepo
from sqlalchemy.orm import Session

router = APIRouter(
    prefix="/trainer", dependencies=[Depends(get_current_user)], tags=["trainer"]
)

redis: RedisRepo = RedisRepo()
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
) -> TrainerJobRead | None:
    authz_user.assert_in_project(parameters.project_id)

    return ts.create_and_start_trainer_job_async(db=db, trainer_params=parameters)


@router.get(
    "/{trainer_job_id}",
    response_model=TrainerJobRead | None,
    summary="Returns the TrainerJob for the given ID",
    description="Returns the TrainerJob for the given ID if it exists",
)
async def get_trainer_job(
    *,
    trainer_job_id: str,
    authz_user: AuthzUser = Depends(),
) -> TrainerJobRead | None:
    trainer_job = redis.load_trainer_job(trainer_job_id)

    authz_user.assert_in_project(trainer_job.parameters.project_id)

    return trainer_job


@router.get(
    "/project/{project_id}",
    response_model=list[TrainerJobRead],
    summary="Returns all TrainerJobs for the given project ID",
    description="Returns all TrainerJobs for the given project ID if it exists",
)
async def get_all_trainer_jobs(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    authz_user: AuthzUser = Depends(),
) -> list[TrainerJobRead]:
    authz_user.assert_in_project(project_id)

    return redis.get_all_trainer_jobs(project_id=project_id)
