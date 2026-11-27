from fastapi import Depends

from common.dats_event import DATSEvent
from common.dependencies import DBSession
from common.project_router import project_router
from core.annotation.span_annotation_crud import crud_span_anno
from core.annotation.span_annotation_dto import SpanAnnotationRead
from core.annotation.span_group_crud import crud_span_group
from core.annotation.span_group_dto import (
    SpanGroupCreate,
    SpanGroupRead,
    SpanGroupUpdate,
    SpanGroupWithAnnotationsRead,
)
from core.annotation.span_group_service import SpanGroupService
from core.auth.authz_user import AuthzUser
from systems.websocket_system.websocket_dependency import WebsocketEmitter

router = project_router("/span-groups", tags=["spanGroups"])


# --- create operations


@router.put(
    "",
    response_model=SpanGroupRead,
    summary="Creates a new SpanGroup and returns it with the generated ID.",
)
def create(
    *,
    db: DBSession,
    project_id: int,
    span_group: SpanGroupCreate,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> SpanGroupRead:
    result = SpanGroupService().create(
        db=db, project_id=project_id, user_id=authz_user.user.id, create_dto=span_group
    )
    ws.emit_to_project(DATSEvent.SPAN_GROUP_CREATED, result, project_id=project_id)
    return result


@router.put(
    "/{span_group_id}/span-annotations/{span_annotation_id}",
    response_model=SpanAnnotationRead,
    summary="Adds the SpanAnnotation to the SpanGroup",
)
def add_span_annotation(
    *,
    db: DBSession,
    project_id: int,
    span_group_id: int,
    span_annotation_id: int,
    ws: WebsocketEmitter = Depends(),
) -> SpanAnnotationRead:
    db_obj = crud_span_anno.add_to_span_group(
        db=db, project_id=project_id, span_id=span_annotation_id, group_id=span_group_id
    )
    result = SpanAnnotationRead.model_validate(db_obj)
    ws.emit_to_project(DATSEvent.SPAN_ANNOTATION_UPDATED, result, project_id=project_id)
    return result


# --- read operations


@router.get(
    "",
    response_model=list[SpanGroupWithAnnotationsRead],
    summary=(
        "Returns the SpanGroups of the User with their SpanAnnotations, optionally "
        "only those in the SourceDocument or those that contain the SpanAnnotation"
    ),
)
def get_by_project(
    *,
    db: DBSession,
    project_id: int,
    user_id: int,
    sdoc_id: int | None = None,
    span_annotation_id: int | None = None,
) -> list[SpanGroupWithAnnotationsRead]:
    return SpanGroupService().read_with_annotations_by_user(
        db=db,
        project_id=project_id,
        user_id=user_id,
        sdoc_id=sdoc_id,
        span_annotation_id=span_annotation_id,
    )


@router.get(
    "/{span_group_id}",
    response_model=SpanGroupRead,
    summary="Returns the SpanGroup with the given ID.",
)
def get_by_id(
    *,
    db: DBSession,
    project_id: int,
    span_group_id: int,
) -> SpanGroupRead:
    db_obj = crud_span_group.read(db=db, project_id=project_id, id=span_group_id)
    return SpanGroupRead.model_validate(db_obj)


@router.get(
    "/{span_group_id}/span-annotations",
    response_model=list[SpanAnnotationRead],
    summary="Returns all SpanAnnotations in the SpanGroup with the given ID",
)
def get_span_annotations(
    *,
    db: DBSession,
    project_id: int,
    span_group_id: int,
) -> list[SpanAnnotationRead]:
    return SpanGroupService().read_annotations(
        db=db, project_id=project_id, id=span_group_id
    )


# --- update operations


@router.patch(
    "/{span_group_id}",
    response_model=SpanGroupRead,
    summary="Updates the SpanGroup with the given ID.",
)
def update_by_id(
    *,
    db: DBSession,
    project_id: int,
    span_group_id: int,
    span_group: SpanGroupUpdate,
    ws: WebsocketEmitter = Depends(),
) -> SpanGroupRead:
    db_obj = crud_span_group.update(
        db=db, project_id=project_id, id=span_group_id, update_dto=span_group
    )
    result = SpanGroupRead.model_validate(db_obj)
    ws.emit_to_project(DATSEvent.SPAN_GROUP_UPDATED, result, project_id=project_id)
    return result


# --- delete operations


@router.delete(
    "/{span_group_id}",
    response_model=SpanGroupRead,
    summary="Deletes the SpanGroup with the given ID.",
)
def delete_by_id(
    *,
    db: DBSession,
    project_id: int,
    span_group_id: int,
    ws: WebsocketEmitter = Depends(),
) -> SpanGroupRead:
    db_obj = crud_span_group.delete(db=db, project_id=project_id, id=span_group_id)
    result = SpanGroupRead.model_validate(db_obj)
    ws.emit_to_project(DATSEvent.SPAN_GROUP_DELETED, result, project_id=project_id)
    return result


@router.delete(
    "/{span_group_id}/span-annotations/{span_annotation_id}",
    response_model=SpanAnnotationRead,
    summary="Removes the SpanAnnotation from the SpanGroup",
)
def remove_span_annotation(
    *,
    db: DBSession,
    project_id: int,
    span_group_id: int,
    span_annotation_id: int,
    ws: WebsocketEmitter = Depends(),
) -> SpanAnnotationRead:
    db_obj = crud_span_anno.remove_from_span_group(
        db=db, project_id=project_id, span_id=span_annotation_id, group_id=span_group_id
    )
    result = SpanAnnotationRead.model_validate(db_obj)
    ws.emit_to_project(DATSEvent.SPAN_ANNOTATION_UPDATED, result, project_id=project_id)
    return result
