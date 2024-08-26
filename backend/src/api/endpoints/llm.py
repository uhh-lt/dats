from typing import List

from fastapi import APIRouter, Depends

from api.dependencies import get_current_user
from app.celery.background_jobs import prepare_and_start_llm_job_async
from app.core.authorization.authz_user import AuthzUser
from app.core.data.dto.llm_job import LLMJobParameters, LLMJobRead
from app.core.data.llm.llm_service import LLMService

router = APIRouter(
    prefix="/llm", dependencies=[Depends(get_current_user)], tags=["llm"]
)

llms: LLMService = LLMService()


@router.post(
    "",
    response_model=LLMJobRead,
    summary="Returns the LLMJob for the given Parameters",
)
def start_llm_job(
    *, llm_job_params: LLMJobParameters, authz_user: AuthzUser = Depends()
) -> LLMJobRead:
    authz_user.assert_in_project(llm_job_params.project_id)

    return prepare_and_start_llm_job_async(llm_job_params=llm_job_params)


@router.get(
    "/{llm_job_id}",
    response_model=LLMJobRead,
    summary="Returns the LLMJob for the given ID if it exists",
)
def get_llm_job(*, llm_job_id: str, authz_user: AuthzUser = Depends()) -> LLMJobRead:
    job = llms.get_llm_job(llm_job_id=llm_job_id)
    authz_user.assert_in_project(job.parameters.project_id)

    return job


@router.get(
    "/project/{project_id}",
    response_model=List[LLMJobRead],
    summary="Returns all LLMJobRead for the given project ID if it exists",
)
def get_all_llm_jobs(
    *, project_id: int, authz_user: AuthzUser = Depends()
) -> List[LLMJobRead]:
    authz_user.assert_in_project(project_id)

    crawler_jobs = llms.get_all_llm_jobs(project_id=project_id)
    crawler_jobs.sort(key=lambda x: x.created, reverse=True)
    return crawler_jobs
