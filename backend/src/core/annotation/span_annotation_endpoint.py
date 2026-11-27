from fastapi import Body, Depends, Query

from common.dats_event import DATSEvent
from common.dependencies import DBSession
from common.project_router import project_router
from core.annotation.span_annotation_crud import crud_span_anno
from core.annotation.span_annotation_dto import (
    SpanAnnotationCreate,
    SpanAnnotationDeleted,
    SpanAnnotationRead,
    SpanAnnotationUpdate,
    SpanAnnotationUpdateBulk,
)
from core.annotation.span_annotation_service import SpanAnnotationService
from core.annotation.span_group_dto import SpanGroupRead
from core.auth.authz_user import AuthzUser
from systems.websocket_system.websocket_dependency import WebsocketEmitter

router = project_router("/span-annotations", tags=["spanAnnotation", "mcp"])


# --- create operations


@router.put(
    "",
    response_model=SpanAnnotationRead,
    summary="Creates a SpanAnnotation",
)
def create(
    *,
    db: DBSession,
    project_id: int,
    span: SpanAnnotationCreate,
    user_id: int | None = Query(
        default=None,
        description="The current user (default) or a virtual user of the project",
    ),
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> SpanAnnotationRead:
    annotation_user_id = authz_user.assert_can_annotate_as(user_id, project_id)

    result = SpanAnnotationService().create(
        db=db, project_id=project_id, user_id=annotation_user_id, create_dto=span
    )
    ws.emit_to_project(DATSEvent.SPAN_ANNOTATION_CREATED, result, project_id=project_id)
    return result


@router.put(
    "/bulk",
    response_model=list[SpanAnnotationRead],
    summary="Creates SpanAnnotations in Bulk",
)
def create_bulk(
    *,
    db: DBSession,
    project_id: int,
    spans: list[SpanAnnotationCreate],
    user_id: int | None = Query(
        default=None,
        description="The current user (default) or a virtual user of the project",
    ),
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> list[SpanAnnotationRead]:
    annotation_user_id = authz_user.assert_can_annotate_as(user_id, project_id)

    results = SpanAnnotationService().create_multi(
        db=db, project_id=project_id, user_id=annotation_user_id, create_dtos=spans
    )
    if results:
        ws.emit_to_project(
            DATSEvent.SPAN_ANNOTATION_CREATED_BATCH, results, project_id=project_id
        )
    return results


@router.put(
    "/{span_annotation_id}/span-groups/{span_group_id}",
    response_model=SpanAnnotationRead,
    summary="Adds the SpanAnnotation to the SpanGroup",
)
def add_to_span_group(
    *,
    db: DBSession,
    project_id: int,
    span_annotation_id: int,
    span_group_id: int,
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
    response_model=list[SpanAnnotationRead],
    summary=(
        "Returns the SpanAnnotations of the User, optionally only those in the "
        "SourceDocument or with the Code"
    ),
)
def get_by_project(
    *,
    db: DBSession,
    project_id: int,
    user_id: int,
    sdoc_id: int | None = None,
    code_id: int | None = None,
) -> list[SpanAnnotationRead]:
    db_objs = crud_span_anno.read_by_user(
        db=db, project_id=project_id, user_id=user_id, sdoc_id=sdoc_id, code_id=code_id
    )
    return [SpanAnnotationRead.model_validate(db_obj) for db_obj in db_objs]


@router.get(
    "/{span_annotation_id}",
    response_model=SpanAnnotationRead,
    summary="Returns the SpanAnnotation with the given ID.",
)
def get_by_id(
    *,
    db: DBSession,
    project_id: int,
    span_annotation_id: int,
) -> SpanAnnotationRead:
    db_obj = crud_span_anno.read(db=db, project_id=project_id, id=span_annotation_id)
    return SpanAnnotationRead.model_validate(db_obj)


@router.get(
    "/{span_annotation_id}/span-groups",
    response_model=list[SpanGroupRead],
    summary="Returns all SpanGroups that contain the SpanAnnotation.",
)
def get_span_groups(
    *,
    db: DBSession,
    project_id: int,
    span_annotation_id: int,
) -> list[SpanGroupRead]:
    db_obj = crud_span_anno.read(db=db, project_id=project_id, id=span_annotation_id)
    return [SpanGroupRead.model_validate(group) for group in db_obj.span_groups]


# --- update operations


@router.patch(
    "/bulk",
    response_model=list[SpanAnnotationRead],
    summary="Updates SpanAnnotations in Bulk",
)
def update_bulk(
    *,
    db: DBSession,
    project_id: int,
    spans: list[SpanAnnotationUpdateBulk],
    ws: WebsocketEmitter = Depends(),
) -> list[SpanAnnotationRead]:
    results = SpanAnnotationService().update_multi(
        db=db, project_id=project_id, update_dtos=spans
    )
    if results:
        ws.emit_to_project(
            DATSEvent.SPAN_ANNOTATION_UPDATED_BATCH, results, project_id=project_id
        )
    return results


@router.patch(
    "/{span_annotation_id}",
    response_model=SpanAnnotationRead,
    summary="Updates the SpanAnnotation with the given ID.",
)
def update_by_id(
    *,
    db: DBSession,
    project_id: int,
    span_annotation_id: int,
    span_anno: SpanAnnotationUpdate,
    ws: WebsocketEmitter = Depends(),
) -> SpanAnnotationRead:
    result = SpanAnnotationService().update(
        db=db, project_id=project_id, id=span_annotation_id, update_dto=span_anno
    )
    ws.emit_to_project(DATSEvent.SPAN_ANNOTATION_UPDATED, result, project_id=project_id)
    return result


# --- delete operations


@router.delete(
    "/bulk",
    response_model=list[SpanAnnotationDeleted],
    summary="Deletes all SpanAnnotations with the given IDs.",
)
def delete_bulk(
    *,
    db: DBSession,
    project_id: int,
    span_annotation_ids: list[int],
    ws: WebsocketEmitter = Depends(),
) -> list[SpanAnnotationDeleted]:
    results = SpanAnnotationService().delete_multi(
        db=db, project_id=project_id, ids=span_annotation_ids
    )
    if results:
        ws.emit_to_project(
            DATSEvent.SPAN_ANNOTATION_DELETED_BATCH, results, project_id=project_id
        )
    return results


@router.delete(
    "/{span_annotation_id}",
    response_model=SpanAnnotationDeleted,
    summary="Deletes the SpanAnnotation with the given ID.",
)
def delete_by_id(
    *,
    db: DBSession,
    project_id: int,
    span_annotation_id: int,
    ws: WebsocketEmitter = Depends(),
) -> SpanAnnotationDeleted:
    result = SpanAnnotationService().delete_multi(
        db=db, project_id=project_id, ids=[span_annotation_id]
    )[0]
    ws.emit_to_project(DATSEvent.SPAN_ANNOTATION_DELETED, result, project_id=project_id)
    return result


@router.delete(
    "/{span_annotation_id}/span-groups",
    response_model=SpanAnnotationRead,
    summary="Removes the SpanAnnotation from all SpanGroups",
)
def remove_from_all_span_groups(
    *,
    db: DBSession,
    project_id: int,
    span_annotation_id: int,
    ws: WebsocketEmitter = Depends(),
) -> SpanAnnotationRead:
    db_obj = crud_span_anno.remove_from_all_span_groups(
        db=db, project_id=project_id, span_id=span_annotation_id
    )
    result = SpanAnnotationRead.model_validate(db_obj)
    ws.emit_to_project(DATSEvent.SPAN_ANNOTATION_UPDATED, result, project_id=project_id)
    return result


@router.delete(
    "/{span_annotation_id}/span-groups/{span_group_id}",
    response_model=SpanAnnotationRead,
    summary="Removes the SpanAnnotation from the SpanGroup",
)
def remove_from_span_group(
    *,
    db: DBSession,
    project_id: int,
    span_annotation_id: int,
    span_group_id: int,
    ws: WebsocketEmitter = Depends(),
) -> SpanAnnotationRead:
    db_obj = crud_span_anno.remove_from_span_group(
        db=db, project_id=project_id, span_id=span_annotation_id, group_id=span_group_id
    )
    result = SpanAnnotationRead.model_validate(db_obj)
    ws.emit_to_project(DATSEvent.SPAN_ANNOTATION_UPDATED, result, project_id=project_id)
    return result


# --- other operations


@router.post(
    "/count",
    response_model=dict[int, int],
    summary=(
        "Counts the SpanAnnotations of the User per Code (by code_ids) in the "
        "SourceDocuments (by sdoc_ids)"
    ),
)
def count(
    *,
    db: DBSession,
    project_id: int,
    user_id: int,
    sdoc_ids: list[int] = Body(description="The SourceDocuments to count in"),
    code_ids: list[int] = Body(description="The Codes to count"),
) -> dict[int, int]:
    return crud_span_anno.count_by_codes_and_sdocs_and_user(
        db=db,
        project_id=project_id,
        code_ids=code_ids,
        sdoc_ids=sdoc_ids,
        user_id=user_id,
    )
