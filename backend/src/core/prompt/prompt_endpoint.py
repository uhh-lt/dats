from fastapi import Depends

from common.dats_event import DATSEvent
from common.dependencies import DBSession
from common.project_router import project_router
from core.auth.authz_user import AuthzUser
from core.prompt.prompt_dto import (
    PromptContent,
    PromptCreate,
    PromptExample,
    PromptExamplesCreate,
    PromptPreview,
    PromptPreviewRequest,
    PromptRead,
    PromptTaskInfo,
    PromptUpdate,
    PromptVersionCreate,
)
from core.prompt.prompt_enum import (
    OutputFormat,
    PromptLanguage,
    TaskType,
)
from core.prompt.prompt_service import PromptService
from systems.websocket_system.websocket_dependency import WebsocketEmitter

router = project_router("/prompts", tags=["prompts"])

pts: PromptService = PromptService()


# --- create operations


@router.put(
    "",
    response_model=PromptRead,
    summary="Creates a prompt with its first version",
)
def create(
    *,
    db: DBSession,
    project_id: int,
    prompt: PromptCreate,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> PromptRead:
    result = pts.create_prompt(
        db=db, project_id=project_id, user_id=authz_user.user.id, create_dto=prompt
    )
    ws.emit_to_project(DATSEvent.PROMPT_CREATED, result, project_id=project_id)
    return result


@router.put(
    "/{prompt_id}/versions",
    response_model=PromptRead,
    summary="Saves a prompt with its selections as the next immutable version of the prompt",
)
def create_version(
    *,
    db: DBSession,
    project_id: int,
    prompt_id: int,
    version: PromptVersionCreate,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> PromptRead:
    result = pts.create_prompt_version(
        db=db,
        project_id=project_id,
        user_id=authz_user.user.id,
        prompt_id=prompt_id,
        create_dto=version,
    )
    ws.emit_to_project(DATSEvent.PROMPT_UPDATED, result, project_id=project_id)
    return result


@router.post(
    "/examples",
    response_model=list[PromptExample],
    summary="Turns span or sentence annotations into few-shot examples for a prompt",
)
def compute_examples(
    *,
    db: DBSession,
    project_id: int,
    examples: PromptExamplesCreate,
) -> list[PromptExample]:
    return pts.create_prompt_examples(db=db, project_id=project_id, create_dto=examples)


@router.post(
    "/preview",
    response_model=PromptPreview,
    summary="Returns the rendered prompt of a stored version or an unsaved draft for one message of a document",
)
def compute_preview(
    *,
    db: DBSession,
    project_id: int,
    request: PromptPreviewRequest,
) -> PromptPreview:
    return pts.preview_prompt(db=db, project_id=project_id, request=request)


# --- read operations


@router.get(
    "/task-info",
    response_model=PromptTaskInfo,
    summary="Returns the blocks that the prompts of a task can use",
)
def get_task_info(
    *,
    project_id: int,
    task_type: TaskType,
) -> PromptTaskInfo:
    return pts.read_task_info(task_type=task_type)


@router.get(
    "/default",
    response_model=PromptContent,
    summary="Returns the default prompt of an output format in a language",
)
def get_default(
    *,
    project_id: int,
    output_format: OutputFormat,
    language: PromptLanguage,
) -> PromptContent:
    return pts.read_default_prompt(output_format=output_format, language=language)


@router.get(
    "",
    response_model=list[PromptRead],
    summary="Returns the prompts of the project with all their versions",
)
def get_by_project(
    *,
    db: DBSession,
    project_id: int,
) -> list[PromptRead]:
    return pts.read_prompts_by_project(db=db, project_id=project_id)


@router.get(
    "/{prompt_id}",
    response_model=PromptRead,
    summary="Returns the prompt with the given ID and all its versions",
)
def get_by_id(
    *,
    db: DBSession,
    project_id: int,
    prompt_id: int,
) -> PromptRead:
    return pts.read_prompt(db=db, project_id=project_id, prompt_id=prompt_id)


# --- update operations


@router.patch(
    "/{prompt_id}",
    response_model=PromptRead,
    summary="Renames or (un)archives the prompt (does not create a version)",
)
def update_by_id(
    *,
    db: DBSession,
    project_id: int,
    prompt_id: int,
    prompt: PromptUpdate,
    ws: WebsocketEmitter = Depends(),
) -> PromptRead:
    result = pts.update_prompt(
        db=db, project_id=project_id, prompt_id=prompt_id, update_dto=prompt
    )
    ws.emit_to_project(DATSEvent.PROMPT_UPDATED, result, project_id=project_id)
    return result
