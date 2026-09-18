from fastapi import APIRouter, Depends
from loguru import logger
from sqlalchemy.orm import Session

from common.crud_enum import Crud
from common.dats_event import DATSEvent
from common.dependencies import get_current_user, get_db_session
from core.annotation.sentence_annotation_crud import crud_sentence_anno
from core.annotation.sentence_annotation_dto import (
    SentenceAnnotationCreate,
    SentenceAnnotationRead,
    SentenceAnnotationUpdate,
    SentenceAnnotationUpdateBulk,
    SentenceAnnotatorResult,
)
from core.auth.authz_user import AuthzUser
from core.auth.validation import Validate
from core.doc.source_document_data_crud import crud_sdoc_data
from systems.websocket_system.websocket_dependency import WebsocketEmitter

router = APIRouter(
    prefix="/sentence",
    dependencies=[Depends(get_current_user)],
    tags=["sentenceAnnotation", "mcp"],
)


# --- create operations


@router.put(
    "",
    response_model=SentenceAnnotationRead,
    summary="Creates a SentenceAnnotation",
)
def create_sentence_annotation(
    *,
    db: Session = Depends(get_db_session),
    sentence_annotation: SentenceAnnotationCreate,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> SentenceAnnotationRead:
    authz_user.assert_in_same_project_as(
        Crud.SOURCE_DOCUMENT, sentence_annotation.sdoc_id
    )
    authz_user.assert_in_same_project_as(Crud.CODE, sentence_annotation.code_id)

    db_obj = crud_sentence_anno.create(
        db=db, user_id=authz_user.user.id, create_dto=sentence_annotation
    )
    result = SentenceAnnotationRead.model_validate(db_obj)
    ws.emit_to_project(
        DATSEvent.SENTENCE_ANNOTATION_CREATED,
        result,
        project_id=db_obj.get_project_id(),
    )
    return result


@router.put(
    "/bulk/create",
    response_model=list[SentenceAnnotationRead],
    summary="Creates SentenceAnnotations in Bulk",
)
def create_sentence_annotations_bulk(
    *,
    db: Session = Depends(get_db_session),
    sentence_annotations: list[SentenceAnnotationCreate],
    authz_user: AuthzUser = Depends(),
    validate: Validate = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> list[SentenceAnnotationRead]:
    for sa in sentence_annotations:
        authz_user.assert_in_same_project_as(Crud.CODE, sa.code_id)
        authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sa.sdoc_id)
        validate.validate_objects_in_same_project(
            [
                (Crud.CODE, sa.code_id),
                (Crud.SOURCE_DOCUMENT, sa.sdoc_id),
            ]
        )

    db_objs = crud_sentence_anno.create_bulk(
        db=db, user_id=authz_user.user.id, create_dtos=sentence_annotations
    )
    results = [SentenceAnnotationRead.model_validate(db_obj) for db_obj in db_objs]
    if results:
        ws.emit_to_project(
            DATSEvent.SENTENCE_ANNOTATION_CREATED_BATCH,
            results,
            project_id=db_objs[0].get_project_id(),
        )
    return results


# --- read operations


@router.get(
    "/{sentence_anno_id}",
    response_model=SentenceAnnotationRead,
    summary="Returns the SentenceAnnotation with the given ID.",
)
def get_by_id(
    *,
    db: Session = Depends(get_db_session),
    sentence_anno_id: int,
    authz_user: AuthzUser = Depends(),
) -> SentenceAnnotationRead:
    authz_user.assert_in_same_project_as(Crud.SENTENCE_ANNOTATION, sentence_anno_id)

    db_obj = crud_sentence_anno.read(db=db, id=sentence_anno_id)
    return SentenceAnnotationRead.model_validate(db_obj)


@router.get(
    "/sdoc/{sdoc_id}/user/{user_id}",
    response_model=SentenceAnnotatorResult,
    summary="Returns all SentenceAnnotations of the User for the SourceDocument",
)
def get_by_sdoc_and_user(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    user_id: int,
    authz_user: AuthzUser = Depends(),
) -> SentenceAnnotatorResult:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    # read sentences
    sdoc_data = crud_sdoc_data.read(db=db, id=sdoc_id)
    if sdoc_data is None:
        raise ValueError("SourceDocument is not a text document")

    # read sentence annotations
    sentence_annos = [
        SentenceAnnotationRead.model_validate(sent_anno)
        for sent_anno in crud_sentence_anno.read_by_users_and_sdoc(
            db=db, user_ids=[user_id], sdoc_id=sdoc_id
        )
    ]

    # build result object: sentence_id -> [sentence_annotations]
    result: dict[int, list[SentenceAnnotationRead]] = {
        idx: [] for idx in range(len(sdoc_data.sentences))
    }
    for sent_anno in sentence_annos:
        for sent_idx in range(
            sent_anno.sentence_id_start, sent_anno.sentence_id_end + 1
        ):
            if sent_idx >= len(result):
                logger.warning(f"Invalid sentence index {sent_idx} for sdoc {sdoc_id}")
                continue
            result[sent_idx].append(sent_anno)

    return SentenceAnnotatorResult(
        sentence_annotations=result,
    )


@router.get(
    "/code/{code_id}/user",
    response_model=list[SentenceAnnotationRead],
    summary=("Returns SentenceAnnotations with the given Code of the logged-in User"),
)
def get_by_user_code(
    *,
    db: Session = Depends(get_db_session),
    code_id: int,
    authz_user: AuthzUser = Depends(),
) -> list[SentenceAnnotationRead]:
    authz_user.assert_in_same_project_as(Crud.CODE, code_id)

    db_objs = crud_sentence_anno.read_by_code_and_user(
        db=db, code_id=code_id, user_id=authz_user.user.id
    )
    return [SentenceAnnotationRead.model_validate(db_obj) for db_obj in db_objs]


# --- update operations


@router.patch(
    "/{sentence_anno_id}",
    response_model=SentenceAnnotationRead,
    summary="Updates the SentenceAnnotation with the given ID.",
)
def update_by_id(
    *,
    db: Session = Depends(get_db_session),
    sentence_anno_id: int,
    sentence_annotation_anno: SentenceAnnotationUpdate,
    authz_user: AuthzUser = Depends(),
    validate: Validate = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> SentenceAnnotationRead:
    authz_user.assert_in_same_project_as(Crud.SENTENCE_ANNOTATION, sentence_anno_id)
    if sentence_annotation_anno.code_id is not None:
        authz_user.assert_in_same_project_as(
            Crud.CODE, sentence_annotation_anno.code_id
        )
        validate.validate_objects_in_same_project(
            [
                (Crud.SENTENCE_ANNOTATION, sentence_anno_id),
                (Crud.CODE, sentence_annotation_anno.code_id),
            ]
        )

    db_obj = crud_sentence_anno.update(
        db=db, id=sentence_anno_id, update_dto=sentence_annotation_anno
    )
    result = SentenceAnnotationRead.model_validate(db_obj)
    ws.emit_to_project(
        DATSEvent.SENTENCE_ANNOTATION_UPDATED,
        result,
        project_id=db_obj.get_project_id(),
    )
    return result


@router.patch(
    "/bulk/update",
    response_model=list[SentenceAnnotationRead],
    summary="Updates SentenceAnnotation in Bulk",
)
def update_sentence_annotations_bulk(
    *,
    db: Session = Depends(get_db_session),
    sent_annos: list[SentenceAnnotationUpdateBulk],
    authz_user: AuthzUser = Depends(),
    validate: Validate = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> list[SentenceAnnotationRead]:
    for sent_anno in sent_annos:
        authz_user.assert_in_same_project_as(Crud.CODE, sent_anno.code_id)
        authz_user.assert_in_same_project_as(
            Crud.SENTENCE_ANNOTATION, sent_anno.sent_annotation_id
        )
        validate.validate_objects_in_same_project(
            [
                (Crud.CODE, sent_anno.code_id),
                (Crud.SENTENCE_ANNOTATION, sent_anno.sent_annotation_id),
            ]
        )

    db_objs = crud_sentence_anno.update_bulk(db=db, update_dtos=sent_annos)
    results = [SentenceAnnotationRead.model_validate(db_obj) for db_obj in db_objs]
    if results:
        ws.emit_to_project(
            DATSEvent.SENTENCE_ANNOTATION_UPDATED_BATCH,
            results,
            project_id=db_objs[0].get_project_id(),
        )
    return results


# --- delete operations


@router.delete(
    "/{sentence_anno_id}",
    response_model=SentenceAnnotationRead,
    summary="Deletes the SentenceAnnotation with the given ID.",
)
def delete_by_id(
    *,
    db: Session = Depends(get_db_session),
    sentence_anno_id: int,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> SentenceAnnotationRead:
    authz_user.assert_in_same_project_as(Crud.SENTENCE_ANNOTATION, sentence_anno_id)

    db_obj = crud_sentence_anno.read(db=db, id=sentence_anno_id)
    sentence_anno_read = SentenceAnnotationRead.model_validate(db_obj)
    project_id = db_obj.get_project_id()

    crud_sentence_anno.delete(db=db, id=sentence_anno_id)
    ws.emit_to_project(
        DATSEvent.SENTENCE_ANNOTATION_DELETED,
        sentence_anno_read,
        project_id=project_id,
    )
    return sentence_anno_read


@router.delete(
    "/bulk/delete",
    response_model=list[SentenceAnnotationRead],
    summary="Deletes all SentenceAnnotations with the given IDs.",
)
def delete_sentence_annotations_bulk(
    *,
    db: Session = Depends(get_db_session),
    sentence_anno_ids: list[int],
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> list[SentenceAnnotationRead]:
    authz_user.assert_in_same_project_as_many(
        Crud.SENTENCE_ANNOTATION, sentence_anno_ids
    )

    db_objs = crud_sentence_anno.delete_bulk(db=db, ids=sentence_anno_ids)
    results = [SentenceAnnotationRead.model_validate(db_obj) for db_obj in db_objs]
    if results:
        ws.emit_to_project(
            DATSEvent.SENTENCE_ANNOTATION_DELETED_BATCH,
            results,
            project_id=db_objs[0].get_project_id(),
        )
    return results


# --- other operations


@router.post(
    "/count_annotations/{user_id}",
    response_model=dict[int, int],
    summary=(
        "Counts the SentenceAnnotations of the User (by user_id) per Codes (by class_ids) in Documents (by sdoc_ids)"
    ),
)
def count_annotations(
    *,
    db: Session = Depends(get_db_session),
    user_id: int,
    sdoc_ids: list[int],
    class_ids: list[int],
    authz_user: AuthzUser = Depends(),
) -> dict[int, int]:
    authz_user.assert_in_same_project_as_many(Crud.SOURCE_DOCUMENT, sdoc_ids)

    return crud_sentence_anno.count_by_codes_and_sdocs_and_user(
        db=db, code_ids=class_ids, sdoc_ids=sdoc_ids, user_id=user_id
    )
