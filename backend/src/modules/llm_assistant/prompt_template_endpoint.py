from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from common.crud_enum import Crud
from common.dats_event import DATSEvent
from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from modules.llm_assistant.prompt_template_dto import (
    PromptTemplateCreate,
    PromptTemplateRead,
    PromptTemplateUpdate,
    PromptTemplateVersionCreate,
    PromptTemplateVersionRead,
)
from modules.llm_assistant.prompt_template_service import PromptTemplateService
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
    summary="Saves new prompts as the next immutable version of the prompt template",
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


# --- read operations


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
    summary="Renames the prompt template (does not create a version)",
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


# --- delete operations


@router.delete(
    "/{prompt_template_id}",
    response_model=PromptTemplateRead,
    summary="Removes the prompt template with all its versions",
)
def delete_by_id(
    *,
    db: Session = Depends(get_db_session),
    prompt_template_id: int,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> PromptTemplateRead:
    authz_user.assert_in_same_project_as(Crud.PROMPT_TEMPLATE, prompt_template_id)

    result = pts.delete_prompt_template(db=db, prompt_template_id=prompt_template_id)
    ws.emit_to_project(
        DATSEvent.PROMPT_TEMPLATE_DELETED, result, project_id=result.project_id
    )
    return result
