from fastapi import APIRouter, Depends
from loguru import logger
from sqlalchemy.orm import Session

from common.crud_enum import Crud
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
from core.doc.source_document_crud import crud_sdoc

router = APIRouter(
    prefix="/sentence",
    dependencies=[Depends(get_current_user)],
    tags=["sentenceAnnotation"],
)


@router.put(
    "",
    response_model=SentenceAnnotationRead,
    summary="Creates a SentenceAnnotation",
)
def add_sentence_annotation(
    *,
    db: Session = Depends(get_db_session),
    sentence_annotation: SentenceAnnotationCreate,
    authz_user: AuthzUser = Depends(),
) -> SentenceAnnotationRead:
    authz_user.assert_in_same_project_as(
        Crud.SOURCE_DOCUMENT, sentence_annotation.sdoc_id
    )
    authz_user.assert_in_same_project_as(Crud.CODE, sentence_annotation.code_id)

    db_obj = crud_sentence_anno.create(
        db=db, user_id=authz_user.user.id, create_dto=sentence_annotation
    )
    return SentenceAnnotationRead.model_validate(db_obj)


@router.put(
    "/bulk/create",
    response_model=list[SentenceAnnotationRead],
    summary="Creates SentenceAnnotations in Bulk",
)
def add_sentence_annotations_bulk(
    *,
    db: Session = Depends(get_db_session),
    sentence_annotations: list[SentenceAnnotationCreate],
    authz_user: AuthzUser = Depends(),
    validate: Validate = Depends(),
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
    return [SentenceAnnotationRead.model_validate(db_obj) for db_obj in db_objs]


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
    sdoc_data = crud_sdoc.read_data(db=db, id=sdoc_id)
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
) -> SentenceAnnotationRead:
    authz_user.assert_in_same_project_as(Crud.SENTENCE_ANNOTATION, sentence_anno_id)
    authz_user.assert_in_same_project_as(Crud.CODE, sentence_annotation_anno.code_id)

    db_obj = crud_sentence_anno.update(
        db=db, id=sentence_anno_id, update_dto=sentence_annotation_anno
    )
    return SentenceAnnotationRead.model_validate(db_obj)


@router.patch(
    "/bulk/update",
    response_model=list[SentenceAnnotationRead],
    summary="Updates SentenceAnnotation in Bulk",
)
def update_sent_anno_annotations_bulk(
    *,
    db: Session = Depends(get_db_session),
    sent_annos: list[SentenceAnnotationUpdateBulk],
    authz_user: AuthzUser = Depends(),
    validate: Validate = Depends(),
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
    return [SentenceAnnotationRead.model_validate(db_obj) for db_obj in db_objs]


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
) -> SentenceAnnotationRead:
    authz_user.assert_in_same_project_as(Crud.SENTENCE_ANNOTATION, sentence_anno_id)

    db_obj = crud_sentence_anno.read(db=db, id=sentence_anno_id)
    sentence_anno_read = SentenceAnnotationRead.model_validate(db_obj)

    crud_sentence_anno.delete(db=db, id=sentence_anno_id)
    return sentence_anno_read


@router.delete(
    "/bulk/delete",
    response_model=list[SentenceAnnotationRead],
    summary="Deletes all SentenceAnnotations with the given IDs.",
)
def delete_bulk_by_id(
    *,
    db: Session = Depends(get_db_session),
    sentence_anno_ids: list[int],
    authz_user: AuthzUser = Depends(),
) -> list[SentenceAnnotationRead]:
    authz_user.assert_in_same_project_as_many(
        Crud.SENTENCE_ANNOTATION, sentence_anno_ids
    )

    db_objs = crud_sentence_anno.delete_bulk(db=db, ids=sentence_anno_ids)
    return [SentenceAnnotationRead.model_validate(db_obj) for db_obj in db_objs]


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
