from fastapi import Depends

from common.dats_event import DATSEvent
from common.dependencies import DBSession
from common.project_router import project_router
from core.annotation.bbox_annotation_crud import crud_bbox_anno
from core.annotation.bbox_annotation_dto import (
    BBoxAnnotationCreate,
    BBoxAnnotationRead,
    BBoxAnnotationUpdate,
    BBoxAnnotationUpdateBulk,
)
from core.annotation.bbox_annotation_service import BBoxAnnotationService
from core.auth.authz_user import AuthzUser
from systems.websocket_system.websocket_dependency import WebsocketEmitter

router = project_router("/bbox-annotations", tags=["bboxAnnotations", "mcp"])


# --- create operations


@router.put(
    "",
    response_model=BBoxAnnotationRead,
    summary="Creates a BBoxAnnotation",
)
def create(
    *,
    db: DBSession,
    project_id: int,
    bbox: BBoxAnnotationCreate,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> BBoxAnnotationRead:
    authz_user.assert_can_annotate_as(bbox.user_id, project_id)

    result = BBoxAnnotationService().create(
        db=db, project_id=project_id, user_id=authz_user.user.id, create_dto=bbox
    )
    ws.emit_to_project(DATSEvent.BBOX_ANNOTATION_CREATED, result, project_id=project_id)
    return result


# --- read operations


@router.get(
    "",
    response_model=list[BBoxAnnotationRead],
    summary=(
        "Returns the BBoxAnnotations of the User, optionally only those in the "
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
) -> list[BBoxAnnotationRead]:
    db_objs = crud_bbox_anno.read_by_user(
        db=db, project_id=project_id, user_id=user_id, sdoc_id=sdoc_id, code_id=code_id
    )
    return [BBoxAnnotationRead.model_validate(db_obj) for db_obj in db_objs]


@router.get(
    "/{bbox_annotation_id}",
    response_model=BBoxAnnotationRead,
    summary="Returns the BBoxAnnotation with the given ID.",
)
def get_by_id(
    *,
    db: DBSession,
    project_id: int,
    bbox_annotation_id: int,
) -> BBoxAnnotationRead:
    db_obj = crud_bbox_anno.read(db=db, project_id=project_id, id=bbox_annotation_id)
    return BBoxAnnotationRead.model_validate(db_obj)


# --- update operations


@router.patch(
    "/bulk",
    response_model=list[BBoxAnnotationRead],
    summary="Updates BBoxAnnotations in Bulk",
)
def update_bulk(
    *,
    db: DBSession,
    project_id: int,
    bbox_annos: list[BBoxAnnotationUpdateBulk],
    ws: WebsocketEmitter = Depends(),
) -> list[BBoxAnnotationRead]:
    results = BBoxAnnotationService().update_multi(
        db=db, project_id=project_id, update_dtos=bbox_annos
    )
    if results:
        ws.emit_to_project(
            DATSEvent.BBOX_ANNOTATION_UPDATED_BATCH, results, project_id=project_id
        )
    return results


@router.patch(
    "/{bbox_annotation_id}",
    response_model=BBoxAnnotationRead,
    summary="Updates the BBoxAnnotation with the given ID.",
)
def update_by_id(
    *,
    db: DBSession,
    project_id: int,
    bbox_annotation_id: int,
    bbox_anno: BBoxAnnotationUpdate,
    ws: WebsocketEmitter = Depends(),
) -> BBoxAnnotationRead:
    result = BBoxAnnotationService().update(
        db=db, project_id=project_id, id=bbox_annotation_id, update_dto=bbox_anno
    )
    ws.emit_to_project(DATSEvent.BBOX_ANNOTATION_UPDATED, result, project_id=project_id)
    return result


# --- delete operations


@router.delete(
    "/bulk",
    response_model=list[BBoxAnnotationRead],
    summary="Deletes all BBoxAnnotations with the given IDs.",
)
def delete_bulk(
    *,
    db: DBSession,
    project_id: int,
    bbox_annotation_ids: list[int],
    ws: WebsocketEmitter = Depends(),
) -> list[BBoxAnnotationRead]:
    results = BBoxAnnotationService().delete_multi(
        db=db, project_id=project_id, ids=bbox_annotation_ids
    )
    if results:
        ws.emit_to_project(
            DATSEvent.BBOX_ANNOTATION_DELETED_BATCH, results, project_id=project_id
        )
    return results


@router.delete(
    "/{bbox_annotation_id}",
    response_model=BBoxAnnotationRead,
    summary="Deletes the BBoxAnnotation with the given ID.",
)
def delete_by_id(
    *,
    db: DBSession,
    project_id: int,
    bbox_annotation_id: int,
    ws: WebsocketEmitter = Depends(),
) -> BBoxAnnotationRead:
    result = BBoxAnnotationService().delete_multi(
        db=db, project_id=project_id, ids=[bbox_annotation_id]
    )[0]
    ws.emit_to_project(DATSEvent.BBOX_ANNOTATION_DELETED, result, project_id=project_id)
    return result
