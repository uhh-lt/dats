from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from common.crud_enum import Crud
from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from modules.llm_assistant.llm_assistant_enum import (
    ApproachType,
    StrategyType,
    TaskType,
)
from modules.llm_assistant.llm_assistant_job_dto import (
    ApproachRecommendation,
    LLMAssistantJobParameters,
    LLMAssistantPromptPreview,
    LLMAssistantPromptPreviewRequest,
    LLMAssistantPromptTemplates,
    StrategyInfo,
)
from modules.llm_assistant.llm_assistant_service import LLMAssistantService

router = APIRouter(
    prefix="/llm_assistant",
    dependencies=[Depends(get_current_user)],
    tags=["llm_assistant"],
)

llmas: LLMAssistantService = LLMAssistantService()


@router.post(
    "/create_prompt_templates",
    response_model=list[LLMAssistantPromptTemplates],
    summary="Returns the system and user prompt templates for the given LLM assistant task in all supported languages",
)
def create_prompt_templates(
    *,
    db: Session = Depends(get_db_session),
    job_params: LLMAssistantJobParameters,
    approach_type: ApproachType,
    strategy_type: StrategyType,
    example_ids: list[int] | None = None,
    authz_user: AuthzUser = Depends(),
) -> list[LLMAssistantPromptTemplates]:
    authz_user.assert_in_project(job_params.project_id)

    return llmas.create_prompt_templates(
        db=db,
        job_params=job_params,
        approach_type=approach_type,
        strategy_type=strategy_type,
        example_ids=example_ids,
    )


@router.post(
    "/preview_prompt",
    response_model=LLMAssistantPromptPreview,
    summary="Returns the filled system and user prompt for one sentence or chunk of a document",
)
def preview_prompt(
    *,
    db: Session = Depends(get_db_session),
    request: LLMAssistantPromptPreviewRequest,
    authz_user: AuthzUser = Depends(),
) -> LLMAssistantPromptPreview:
    authz_user.assert_in_project(request.project_id)

    return llmas.preview_prompt(db=db, request=request)


@router.post(
    "/list_strategies",
    response_model=list[StrategyInfo],
    summary="Returns the available strategies for the given LLM assistant task",
)
def list_strategies(
    *,
    task_type: TaskType,
    authz_user: AuthzUser = Depends(),
) -> list[StrategyInfo]:
    return llmas.list_strategies(task_type=task_type)


@router.post(
    "/determine_approach",
    response_model=ApproachRecommendation,
    summary="Determines the appropriate approach based on the provided input",
)
def determine_approach(
    *,
    db: Session = Depends(get_db_session),
    job_params: LLMAssistantJobParameters,
    authz_user: AuthzUser = Depends(),
) -> ApproachRecommendation:
    authz_user.assert_in_project(job_params.project_id)

    return llmas.determine_approach(db=db, job_params=job_params)


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
    authz_user.assert_in_same_project_as_many(Crud.SOURCE_DOCUMENT, sdoc_ids)
    authz_user.assert_in_same_project_as_many(Crud.CODE, code_ids)

    return llmas.count_existing_assistant_annotations(
        db=db,
        approach_type=approach_type,
        task_type=task_type,
        sdoc_ids=sdoc_ids,
        code_ids=code_ids,
    )
