from common.dependencies import get_current_user
from core.auth.authz_user import AuthzUser
from fastapi import APIRouter, Depends
from modules.llm_assistant.llm_job_dto import (
    ApproachRecommendation,
    ApproachType,
    LLMJobParameters,
    LLMPromptTemplates,
    TaskType,
    TrainingParameters,
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
    llm_job_params: LLMJobParameters,
    approach_type: ApproachType,
    example_ids: list[int] | None = None,
    authz_user: AuthzUser = Depends(),
) -> list[LLMPromptTemplates]:
    authz_user.assert_in_project(llm_job_params.project_id)

    return llms.create_prompt_templates(
        llm_job_params=llm_job_params,
        approach_type=approach_type,
        example_ids=example_ids,
    )


@router.post(
    "/create_training_parameters",
    response_model=TrainingParameters,
    summary="Returns the default training parameters for the given llm task",
)
def create_training_parameters(
    *, llm_job_params: LLMJobParameters, authz_user: AuthzUser = Depends()
) -> TrainingParameters:
    authz_user.assert_in_project(llm_job_params.project_id)

    return llms.create_training_parameters(llm_job_params=llm_job_params)


@router.post(
    "/determine_approach",
    response_model=ApproachRecommendation,
    summary="Determines the appropriate approach based on the provided input",
)
def determine_approach(
    *, llm_job_params: LLMJobParameters, authz_user: AuthzUser = Depends()
) -> ApproachRecommendation:
    authz_user.assert_in_project(llm_job_params.project_id)

    return llms.determine_approach(llm_job_params=llm_job_params)


@router.post(
    "/count_existing_assistant_annotations",
    response_model=dict[int, int],
    summary="Based on the approach, count the number of existing assistant annotations",
)
def count_existing_assistant_annotations(
    *,
    sdoc_ids: list[int],
    code_ids: list[int],
    task_type: TaskType,
    approach_type: ApproachType,
    authz_user: AuthzUser = Depends(),
) -> dict[int, int]:
    return llms.count_existing_assistant_annotations(
        approach_type=approach_type,
        task_type=task_type,
        sdoc_ids=sdoc_ids,
        code_ids=code_ids,
    )
