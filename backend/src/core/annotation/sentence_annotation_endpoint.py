from fastapi import Body, Depends, Query

from common.dats_event import DATSEvent
from common.dependencies import DBSession
from common.project_router import project_router
from core.annotation.sentence_annotation_crud import crud_sentence_anno
from core.annotation.sentence_annotation_dto import (
    SentenceAnnotationCreate,
    SentenceAnnotationRead,
    SentenceAnnotationUpdate,
    SentenceAnnotationUpdateBulk,
    SentenceAnnotatorResult,
)
from core.annotation.sentence_annotation_service import SentenceAnnotationService
from core.auth.authz_user import AuthzUser
from systems.websocket_system.websocket_dependency import WebsocketEmitter

router = project_router("/sentence-annotations", tags=["sentenceAnnotation", "mcp"])


# --- create operations


@router.put(
    "",
    response_model=SentenceAnnotationRead,
    summary="Creates a SentenceAnnotation",
)
def create_sentence_annotation(
    *,
    db: DBSession,
    project_id: int,
    sentence_annotation: SentenceAnnotationCreate,
    user_id: int | None = Query(
        default=None,
        description="The current user (default) or a virtual user of the project",
    ),
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> SentenceAnnotationRead:
    annotation_user_id = authz_user.assert_can_annotate_as(user_id, project_id)

    result = SentenceAnnotationService().create(
        db=db,
        project_id=project_id,
        user_id=annotation_user_id,
        create_dto=sentence_annotation,
    )
    ws.emit_to_project(
        DATSEvent.SENTENCE_ANNOTATION_CREATED, result, project_id=project_id
    )
    return result


@router.put(
    "/bulk",
    response_model=list[SentenceAnnotationRead],
    summary="Creates SentenceAnnotations in Bulk",
)
def create_sentence_annotations_bulk(
    *,
    db: DBSession,
    project_id: int,
    sentence_annotations: list[SentenceAnnotationCreate],
    user_id: int | None = Query(
        default=None,
        description="The current user (default) or a virtual user of the project",
    ),
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> list[SentenceAnnotationRead]:
    annotation_user_id = authz_user.assert_can_annotate_as(user_id, project_id)

    results = SentenceAnnotationService().create_multi(
        db=db,
        project_id=project_id,
        user_id=annotation_user_id,
        create_dtos=sentence_annotations,
    )
    if results:
        ws.emit_to_project(
            DATSEvent.SENTENCE_ANNOTATION_CREATED_BATCH, results, project_id=project_id
        )
    return results


# --- read operations


@router.get(
    "",
    response_model=list[SentenceAnnotationRead],
    summary=(
        "Returns the SentenceAnnotations of the User, optionally only those in the "
        "SourceDocument or with the Code"
    ),
)
def get_sentence_annotations(
    *,
    db: DBSession,
    project_id: int,
    user_id: int,
    sdoc_id: int | None = None,
    code_id: int | None = None,
) -> list[SentenceAnnotationRead]:
    db_objs = crud_sentence_anno.read_by_user(
        db=db, project_id=project_id, user_id=user_id, sdoc_id=sdoc_id, code_id=code_id
    )
    return [SentenceAnnotationRead.model_validate(db_obj) for db_obj in db_objs]


@router.get(
    "/by-sentence",
    response_model=SentenceAnnotatorResult,
    summary=(
        "Returns the SentenceAnnotations of the User in the SourceDocument, grouped "
        "by sentence"
    ),
)
def get_sentence_annotations_by_sentence(
    *,
    db: DBSession,
    project_id: int,
    user_id: int,
    sdoc_id: int,
) -> SentenceAnnotatorResult:
    return SentenceAnnotationService().read_by_sentence(
        db=db, project_id=project_id, user_id=user_id, sdoc_id=sdoc_id
    )


@router.get(
    "/{sentence_annotation_id}",
    response_model=SentenceAnnotationRead,
    summary="Returns the SentenceAnnotation with the given ID.",
)
def get_by_id(
    *,
    db: DBSession,
    project_id: int,
    sentence_annotation_id: int,
) -> SentenceAnnotationRead:
    db_obj = crud_sentence_anno.read(
        db=db, project_id=project_id, id=sentence_annotation_id
    )
    return SentenceAnnotationRead.model_validate(db_obj)


# --- update operations


@router.patch(
    "/bulk",
    response_model=list[SentenceAnnotationRead],
    summary="Updates SentenceAnnotations in Bulk",
)
def update_sentence_annotations_bulk(
    *,
    db: DBSession,
    project_id: int,
    sentence_annotations: list[SentenceAnnotationUpdateBulk],
    ws: WebsocketEmitter = Depends(),
) -> list[SentenceAnnotationRead]:
    results = SentenceAnnotationService().update_multi(
        db=db, project_id=project_id, update_dtos=sentence_annotations
    )
    if results:
        ws.emit_to_project(
            DATSEvent.SENTENCE_ANNOTATION_UPDATED_BATCH, results, project_id=project_id
        )
    return results


@router.patch(
    "/{sentence_annotation_id}",
    response_model=SentenceAnnotationRead,
    summary="Updates the SentenceAnnotation with the given ID.",
)
def update_by_id(
    *,
    db: DBSession,
    project_id: int,
    sentence_annotation_id: int,
    sentence_annotation: SentenceAnnotationUpdate,
    ws: WebsocketEmitter = Depends(),
) -> SentenceAnnotationRead:
    result = SentenceAnnotationService().update(
        db=db,
        project_id=project_id,
        id=sentence_annotation_id,
        update_dto=sentence_annotation,
    )
    ws.emit_to_project(
        DATSEvent.SENTENCE_ANNOTATION_UPDATED, result, project_id=project_id
    )
    return result


# --- delete operations


@router.delete(
    "/bulk",
    response_model=list[SentenceAnnotationRead],
    summary="Deletes all SentenceAnnotations with the given IDs.",
)
def delete_sentence_annotations_bulk(
    *,
    db: DBSession,
    project_id: int,
    sentence_annotation_ids: list[int],
    ws: WebsocketEmitter = Depends(),
) -> list[SentenceAnnotationRead]:
    results = SentenceAnnotationService().delete_multi(
        db=db, project_id=project_id, ids=sentence_annotation_ids
    )
    if results:
        ws.emit_to_project(
            DATSEvent.SENTENCE_ANNOTATION_DELETED_BATCH, results, project_id=project_id
        )
    return results


@router.delete(
    "/{sentence_annotation_id}",
    response_model=SentenceAnnotationRead,
    summary="Deletes the SentenceAnnotation with the given ID.",
)
def delete_by_id(
    *,
    db: DBSession,
    project_id: int,
    sentence_annotation_id: int,
    ws: WebsocketEmitter = Depends(),
) -> SentenceAnnotationRead:
    result = SentenceAnnotationService().delete_multi(
        db=db, project_id=project_id, ids=[sentence_annotation_id]
    )[0]
    ws.emit_to_project(
        DATSEvent.SENTENCE_ANNOTATION_DELETED, result, project_id=project_id
    )
    return result


# --- other operations


@router.post(
    "/count",
    response_model=dict[int, int],
    summary=(
        "Counts the SentenceAnnotations of the User per Code (by code_ids) in the "
        "SourceDocuments (by sdoc_ids)"
    ),
)
def count_annotations(
    *,
    db: DBSession,
    project_id: int,
    user_id: int,
    sdoc_ids: list[int] = Body(description="The SourceDocuments to count in"),
    code_ids: list[int] = Body(description="The Codes to count"),
) -> dict[int, int]:
    return crud_sentence_anno.count_by_codes_and_sdocs_and_user(
        db=db,
        project_id=project_id,
        code_ids=code_ids,
        sdoc_ids=sdoc_ids,
        user_id=user_id,
    )
