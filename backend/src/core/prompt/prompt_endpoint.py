from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from common.crud_enum import Crud
from common.dats_event import DATSEvent
from common.dependencies import get_current_user, get_db_session
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
    PromptVersionRead,
)
from core.prompt.prompt_enum import (
    OutputFormat,
    PromptLanguage,
    TaskType,
)
from core.prompt.prompt_service import PromptService
from systems.websocket_system.websocket_dependency import WebsocketEmitter

router = APIRouter(
    prefix="/prompt",
    dependencies=[Depends(get_current_user)],
    tags=["prompt"],
)

pts: PromptService = PromptService()


# --- create operations


@router.put(
    "",
    response_model=PromptRead,
    summary="Creates a prompt with its first version",
)
def create(
    *,
    db: Session = Depends(get_db_session),
    prompt: PromptCreate,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> PromptRead:
    authz_user.assert_in_project(prompt.project_id)

    result = pts.create_prompt(db=db, user_id=authz_user.user.id, create_dto=prompt)
    ws.emit_to_project(DATSEvent.PROMPT_CREATED, result, project_id=result.project_id)
    return result


@router.put(
    "/{prompt_id}/version",
    response_model=PromptRead,
    summary="Saves a prompt with its selections as the next immutable version of the prompt",
)
def create_version(
    *,
    db: Session = Depends(get_db_session),
    prompt_id: int,
    version: PromptVersionCreate,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> PromptRead:
    authz_user.assert_in_same_project_as(Crud.PROMPT, prompt_id)

    result = pts.create_prompt_version(
        db=db,
        user_id=authz_user.user.id,
        prompt_id=prompt_id,
        create_dto=version,
    )
    ws.emit_to_project(DATSEvent.PROMPT_UPDATED, result, project_id=result.project_id)
    return result


@router.post(
    "/examples",
    response_model=list[PromptExample],
    summary="Turns span or sentence annotations into few-shot examples for a prompt",
)
def create_examples(
    *,
    db: Session = Depends(get_db_session),
    examples: PromptExamplesCreate,
    authz_user: AuthzUser = Depends(),
) -> list[PromptExample]:
    authz_user.assert_in_project(examples.project_id)

    return pts.create_prompt_examples(db=db, create_dto=examples)


@router.post(
    "/preview",
    response_model=PromptPreview,
    summary="Returns the rendered prompt of a stored version or an unsaved draft for one message of a document",
)
def preview(
    *,
    db: Session = Depends(get_db_session),
    request: PromptPreviewRequest,
    authz_user: AuthzUser = Depends(),
) -> PromptPreview:
    authz_user.assert_in_project(request.project_id)

    return pts.preview_prompt(db=db, request=request)


# --- read operations


@router.get(
    "/task_info",
    response_model=PromptTaskInfo,
    summary="Returns the blocks that the prompts of a task can use",
)
def get_task_info(
    *,
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
    output_format: OutputFormat,
    language: PromptLanguage,
) -> PromptContent:
    return pts.read_default_prompt(output_format=output_format, language=language)


@router.get(
    "/project/{project_id}",
    response_model=list[PromptRead],
    summary="Returns the prompts of the project with all their versions",
)
def get_by_project(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    authz_user: AuthzUser = Depends(),
) -> list[PromptRead]:
    authz_user.assert_in_project(project_id)

    return pts.read_prompts_by_project(db=db, project_id=project_id)


@router.get(
    "/version/{version_id}",
    response_model=PromptVersionRead,
    summary="Returns the prompt version with the given ID",
)
def get_version_by_id(
    *,
    db: Session = Depends(get_db_session),
    version_id: int,
    authz_user: AuthzUser = Depends(),
) -> PromptVersionRead:
    authz_user.assert_in_same_project_as(Crud.PROMPT_VERSION, version_id)

    return pts.read_prompt_version(db=db, version_id=version_id)


@router.get(
    "/{prompt_id}",
    response_model=PromptRead,
    summary="Returns the prompt with the given ID and all its versions",
)
def get_by_id(
    *,
    db: Session = Depends(get_db_session),
    prompt_id: int,
    authz_user: AuthzUser = Depends(),
) -> PromptRead:
    authz_user.assert_in_same_project_as(Crud.PROMPT, prompt_id)

    return pts.read_prompt(db=db, prompt_id=prompt_id)


# --- update operations


@router.patch(
    "/{prompt_id}",
    response_model=PromptRead,
    summary="Renames or (un)archives the prompt (does not create a version)",
)
def update_by_id(
    *,
    db: Session = Depends(get_db_session),
    prompt_id: int,
    prompt: PromptUpdate,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> PromptRead:
    authz_user.assert_in_same_project_as(Crud.PROMPT, prompt_id)

    result = pts.update_prompt(db=db, prompt_id=prompt_id, update_dto=prompt)
    ws.emit_to_project(DATSEvent.PROMPT_UPDATED, result, project_id=result.project_id)
    return result
