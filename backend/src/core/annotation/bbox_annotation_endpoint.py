from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from common.crud_enum import Crud
from common.dats_event import DATSEvent
from common.dependencies import get_current_user, get_db_session
from core.annotation.bbox_annotation_crud import crud_bbox_anno
from core.annotation.bbox_annotation_dto import (
    BBoxAnnotationCreate,
    BBoxAnnotationRead,
    BBoxAnnotationUpdate,
    BBoxAnnotationUpdateBulk,
)
from core.auth.authz_user import AuthzUser
from core.auth.validation import Validate
from systems.websocket_system.websocket_dependency import WebsocketEmitter

router = APIRouter(
    prefix="/bbox",
    dependencies=[Depends(get_current_user)],
    tags=["bboxAnnotation", "mcp"],
)


# --- create operations


@router.put(
    "",
    response_model=BBoxAnnotationRead,
    summary="Creates a BBoxAnnotation",
)
def create_bbox_annotation(
    *,
    db: Session = Depends(get_db_session),
    bbox: BBoxAnnotationCreate,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> BBoxAnnotationRead:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, bbox.sdoc_id)
    authz_user.assert_in_same_project_as(Crud.CODE, bbox.code_id)

    db_obj = crud_bbox_anno.create(db=db, user_id=authz_user.user.id, create_dto=bbox)
    result = BBoxAnnotationRead.model_validate(db_obj)
    ws.emit_to_project(
        DATSEvent.BBOX_ANNOTATION_CREATED,
        result,
        project_id=db_obj.get_project_id(),
    )
    return result


# --- read operations


@router.get(
    "/{bbox_id}",
    response_model=BBoxAnnotationRead,
    summary="Returns the BBoxAnnotation with the given ID.",
)
def get_by_id(
    *,
    db: Session = Depends(get_db_session),
    bbox_id: int,
    authz_user: AuthzUser = Depends(),
) -> BBoxAnnotationRead:
    authz_user.assert_in_same_project_as(Crud.BBOX_ANNOTATION, bbox_id)

    db_obj = crud_bbox_anno.read(db=db, id=bbox_id)
    return BBoxAnnotationRead.model_validate(db_obj)


@router.get(
    "/sdoc/{sdoc_id}/user/{user_id}",
    response_model=list[BBoxAnnotationRead],
    summary="Returns all BBoxAnnotations of the User for the SourceDocument",
)
def get_by_sdoc_and_user(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    user_id: int,
    authz_user: AuthzUser = Depends(),
) -> list[BBoxAnnotationRead]:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    bboxes = crud_bbox_anno.read_by_user_and_sdoc(
        db=db, user_id=user_id, sdoc_id=sdoc_id
    )
    return [BBoxAnnotationRead.model_validate(bbox) for bbox in bboxes]


@router.get(
    "/code/{code_id}/user",
    response_model=list[BBoxAnnotationRead],
    summary=("Returns BBoxAnnotations with the given Code of the logged-in User"),
)
def get_by_user_code(
    *,
    db: Session = Depends(get_db_session),
    code_id: int,
    authz_user: AuthzUser = Depends(),
) -> list[BBoxAnnotationRead]:
    authz_user.assert_in_same_project_as(Crud.CODE, code_id)

    db_objs = crud_bbox_anno.read_by_code_and_user(
        db=db, code_id=code_id, user_id=authz_user.user.id
    )
    return [BBoxAnnotationRead.model_validate(db_obj) for db_obj in db_objs]


# --- update operations


@router.patch(
    "/{bbox_id}",
    response_model=BBoxAnnotationRead,
    summary="Updates the BBoxAnnotation with the given ID.",
)
def update_by_id(
    *,
    db: Session = Depends(get_db_session),
    bbox_id: int,
    bbox_anno: BBoxAnnotationUpdate,
    authz_user: AuthzUser = Depends(),
    validate: Validate = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> BBoxAnnotationRead:
    authz_user.assert_in_same_project_as(Crud.BBOX_ANNOTATION, bbox_id)
    if bbox_anno.code_id is not None:
        authz_user.assert_in_same_project_as(Crud.CODE, bbox_anno.code_id)
        validate.validate_objects_in_same_project(
            [(Crud.BBOX_ANNOTATION, bbox_id), (Crud.CODE, bbox_anno.code_id)]
        )

    db_obj = crud_bbox_anno.update(db=db, id=bbox_id, update_dto=bbox_anno)
    result = BBoxAnnotationRead.model_validate(db_obj)
    ws.emit_to_project(
        DATSEvent.BBOX_ANNOTATION_UPDATED,
        result,
        project_id=db_obj.get_project_id(),
    )
    return result


@router.patch(
    "/bulk/update",
    response_model=list[BBoxAnnotationRead],
    summary="Updates BBoxAnnotation in Bulk",
)
def update_bbox_annotations_bulk(
    *,
    db: Session = Depends(get_db_session),
    bbox_annos: list[BBoxAnnotationUpdateBulk],
    authz_user: AuthzUser = Depends(),
    validate: Validate = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> list[BBoxAnnotationRead]:
    for bbox_anno in bbox_annos:
        authz_user.assert_in_same_project_as(Crud.CODE, bbox_anno.code_id)
        authz_user.assert_in_same_project_as(
            Crud.BBOX_ANNOTATION, bbox_anno.bbox_annotation_id
        )
        validate.validate_objects_in_same_project(
            [
                (Crud.CODE, bbox_anno.code_id),
                (Crud.BBOX_ANNOTATION, bbox_anno.bbox_annotation_id),
            ]
        )

    db_objs = crud_bbox_anno.update_bulk(db=db, update_dtos=bbox_annos)
    results = [BBoxAnnotationRead.model_validate(db_obj) for db_obj in db_objs]
    if results:
        ws.emit_to_project(
            DATSEvent.BBOX_ANNOTATION_UPDATED_BATCH,
            results,
            project_id=db_objs[0].get_project_id(),
        )
    return results


# --- delete operations


@router.delete(
    "/{bbox_id}",
    response_model=BBoxAnnotationRead,
    summary="Deletes the BBoxAnnotation with the given ID.",
)
def delete_by_id(
    *,
    db: Session = Depends(get_db_session),
    bbox_id: int,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> BBoxAnnotationRead:
    authz_user.assert_in_same_project_as(Crud.BBOX_ANNOTATION, bbox_id)

    db_obj = crud_bbox_anno.read(db=db, id=bbox_id)
    bbox_read = BBoxAnnotationRead.model_validate(db_obj)
    project_id = db_obj.get_project_id()

    crud_bbox_anno.delete(db=db, id=bbox_id)
    ws.emit_to_project(
        DATSEvent.BBOX_ANNOTATION_DELETED,
        bbox_read,
        project_id=project_id,
    )
    return bbox_read


@router.delete(
    "/bulk/delete",
    response_model=list[BBoxAnnotationRead],
    summary="Deletes all BBoxAnnotations with the given IDs.",
)
def delete_bbox_annotations_bulk(
    *,
    db: Session = Depends(get_db_session),
    bbox_anno_ids: list[int],
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> list[BBoxAnnotationRead]:
    authz_user.assert_in_same_project_as_many(Crud.BBOX_ANNOTATION, bbox_anno_ids)

    db_objs = crud_bbox_anno.delete_bulk(db=db, ids=bbox_anno_ids)
    results = [BBoxAnnotationRead.model_validate(db_obj) for db_obj in db_objs]
    if results:
        ws.emit_to_project(
            DATSEvent.BBOX_ANNOTATION_DELETED_BATCH,
            results,
            project_id=db_objs[0].get_project_id(),
        )
    return results
