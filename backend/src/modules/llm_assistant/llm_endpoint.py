from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from modules.llm_assistant.llm_job_dto import (
    ApproachRecommendation,
    ApproachType,
    LLMJobParameters,
    LLMPromptTemplates,
    TaskType,
)
from modules.llm_assistant.llm_service import LLMAssistantService

router = APIRouter(
    prefix="/llm", dependencies=[Depends(get_current_user)], tags=["llm"]
)

llms: LLMAssistantService = LLMAssistantService()


@router.post(
    "/create_prompt_templates",
    response_model=list[LLMPromptTemplates],
    summary="Returns the system and user prompt templates for the given llm task in all supported languages",
)
def create_prompt_templates(
    *,
    db: Session = Depends(get_db_session),
    llm_job_params: LLMJobParameters,
    approach_type: ApproachType,
    example_ids: list[int] | None = None,
    authz_user: AuthzUser = Depends(),
) -> list[LLMPromptTemplates]:
    authz_user.assert_in_project(llm_job_params.project_id)

    return llms.create_prompt_templates(
        db=db,
        llm_job_params=llm_job_params,
        approach_type=approach_type,
        example_ids=example_ids,
    )


@router.post(
    "/determine_approach",
    response_model=ApproachRecommendation,
    summary="Determines the appropriate approach based on the provided input",
)
def determine_approach(
    *,
    db: Session = Depends(get_db_session),
    llm_job_params: LLMJobParameters,
    authz_user: AuthzUser = Depends(),
) -> ApproachRecommendation:
    authz_user.assert_in_project(llm_job_params.project_id)

    return llms.determine_approach(db=db, llm_job_params=llm_job_params)


@router.post(
    "/count_existing_assistant_annotations",
    response_model=dict[int, int],
    summary="Based on the approach, count the number of existing assistant annotations",
)
def count_existing_assistant_annotations(
    *,
    db: Session = Depends(get_db_session),
    sdoc_ids: list[int],
    code_ids: list[int],
    task_type: TaskType,
    approach_type: ApproachType,
    authz_user: AuthzUser = Depends(),
) -> dict[int, int]:
    return llms.count_existing_assistant_annotations(
        db=db,
        approach_type=approach_type,
        task_type=task_type,
        sdoc_ids=sdoc_ids,
        code_ids=code_ids,
    )
