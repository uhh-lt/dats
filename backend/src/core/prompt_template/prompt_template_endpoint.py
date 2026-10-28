from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from common.crud_enum import Crud
from common.dats_event import DATSEvent
from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from core.prompt_template.prompt_template_dto import (
    PromptExample,
    PromptExamplesCreate,
    PromptPreview,
    PromptPreviewRequest,
    PromptTaskInfo,
    PromptTemplateContent,
    PromptTemplateCreate,
    PromptTemplateRead,
    PromptTemplateRefresh,
    PromptTemplateUpdate,
    PromptTemplateVersionCreate,
    PromptTemplateVersionRead,
)
from core.prompt_template.prompt_template_enum import (
    OutputFormat,
    PromptLanguage,
    TaskType,
)
from core.prompt_template.prompt_template_service import PromptTemplateService
from systems.websocket_system.websocket_dependency import WebsocketEmitter

router = APIRouter(
    prefix="/prompt_template",
    dependencies=[Depends(get_current_user)],
    tags=["prompt_template"],
)

pts: PromptTemplateService = PromptTemplateService()


# --- create operations


@router.put(
    "",
    response_model=PromptTemplateRead,
    summary="Creates a prompt template with its first version",
)
def create(
    *,
    db: Session = Depends(get_db_session),
    prompt_template: PromptTemplateCreate,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> PromptTemplateRead:
    authz_user.assert_in_project(prompt_template.project_id)

    result = pts.create_prompt_template(
        db=db, user_id=authz_user.user.id, create_dto=prompt_template
    )
    ws.emit_to_project(
        DATSEvent.PROMPT_TEMPLATE_CREATED, result, project_id=result.project_id
    )
    return result


@router.put(
    "/{prompt_template_id}/version",
    response_model=PromptTemplateRead,
    summary="Saves a prompt with its selections as the next immutable version of the prompt template",
)
def create_version(
    *,
    db: Session = Depends(get_db_session),
    prompt_template_id: int,
    version: PromptTemplateVersionCreate,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> PromptTemplateRead:
    authz_user.assert_in_same_project_as(Crud.PROMPT_TEMPLATE, prompt_template_id)

    result = pts.create_prompt_template_version(
        db=db,
        user_id=authz_user.user.id,
        prompt_template_id=prompt_template_id,
        create_dto=version,
    )
    ws.emit_to_project(
        DATSEvent.PROMPT_TEMPLATE_UPDATED, result, project_id=result.project_id
    )
    return result


@router.post(
    "/examples",
    response_model=list[PromptExample],
    summary="Turns span or sentence annotations into few-shot examples for a prompt template",
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
    "/refresh",
    response_model=PromptTemplateContent,
    summary="Replaces the selections of a prompt (codes, examples, tags, metadata fields) with the current state of the project",
)
def refresh(
    *,
    db: Session = Depends(get_db_session),
    content: PromptTemplateRefresh,
    authz_user: AuthzUser = Depends(),
) -> PromptTemplateContent:
    authz_user.assert_in_project(content.project_id)

    return pts.refresh_content(
        db=db,
        project_id=content.project_id,
        content=PromptTemplateContent.model_validate(
            content.model_dump(exclude={"project_id"})
        ),
    )


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
    response_model=PromptTemplateContent,
    summary="Returns the default prompt of an output format in a language",
)
def get_default(
    *,
    output_format: OutputFormat,
    language: PromptLanguage,
) -> PromptTemplateContent:
    return pts.read_default_prompt(output_format=output_format, language=language)


@router.get(
    "/project/{project_id}",
    response_model=list[PromptTemplateRead],
    summary="Returns the prompt templates of the project with all their versions",
)
def get_by_project(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    authz_user: AuthzUser = Depends(),
) -> list[PromptTemplateRead]:
    authz_user.assert_in_project(project_id)

    return pts.read_prompt_templates_by_project(db=db, project_id=project_id)


@router.get(
    "/version/{version_id}",
    response_model=PromptTemplateVersionRead,
    summary="Returns the prompt template version with the given ID",
)
def get_version_by_id(
    *,
    db: Session = Depends(get_db_session),
    version_id: int,
    authz_user: AuthzUser = Depends(),
) -> PromptTemplateVersionRead:
    authz_user.assert_in_same_project_as(Crud.PROMPT_TEMPLATE_VERSION, version_id)

    return pts.read_prompt_template_version(db=db, version_id=version_id)


@router.get(
    "/{prompt_template_id}",
    response_model=PromptTemplateRead,
    summary="Returns the prompt template with the given ID and all its versions",
)
def get_by_id(
    *,
    db: Session = Depends(get_db_session),
    prompt_template_id: int,
    authz_user: AuthzUser = Depends(),
) -> PromptTemplateRead:
    authz_user.assert_in_same_project_as(Crud.PROMPT_TEMPLATE, prompt_template_id)

    return pts.read_prompt_template(db=db, prompt_template_id=prompt_template_id)


# --- update operations


@router.patch(
    "/{prompt_template_id}",
    response_model=PromptTemplateRead,
    summary="Renames or (un)archives the prompt template (does not create a version)",
)
def update_by_id(
    *,
    db: Session = Depends(get_db_session),
    prompt_template_id: int,
    prompt_template: PromptTemplateUpdate,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> PromptTemplateRead:
    authz_user.assert_in_same_project_as(Crud.PROMPT_TEMPLATE, prompt_template_id)

    result = pts.update_prompt_template(
        db=db, prompt_template_id=prompt_template_id, update_dto=prompt_template
    )
    ws.emit_to_project(
        DATSEvent.PROMPT_TEMPLATE_UPDATED, result, project_id=result.project_id
    )
    return result
