from typing import Annotated, Dict, List, Union

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from api.dependencies import (
    get_current_user,
    get_db_session,
    resolve_code_param,
    skip_limit_params,
)
from api.util import get_object_memo_for_user, get_object_memos
from api.validation import Validate
from app.core.authorization.authz_user import AuthzUser
from app.core.data.crud import Crud
from app.core.data.crud.bbox_annotation import crud_bbox_anno
from app.core.data.crud.memo import crud_memo
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.crud.source_document_metadata import crud_sdoc_meta
from app.core.data.crud.span_annotation import crud_span_anno
from app.core.data.crud.span_group import crud_span_group
from app.core.data.doc_type import DocType
from app.core.data.dto.bbox_annotation import (
    BBoxAnnotationRead,
    BBoxAnnotationReadResolved,
)
from app.core.data.dto.document_tag import DocumentTagRead
from app.core.data.dto.memo import (
    AttachedObjectType,
    MemoCreate,
    MemoCreateIntern,
    MemoInDB,
    MemoRead,
)
from app.core.data.dto.source_document import (
    SourceDocumentRead,
    SourceDocumentUpdate,
)
from app.core.data.dto.source_document_data import SourceDocumentDataRead
from app.core.data.dto.source_document_metadata import (
    SourceDocumentMetadataReadResolved,
)
from app.core.data.dto.span_annotation import (
    SpanAnnotationRead,
    SpanAnnotationReadResolved,
)
from app.core.data.dto.span_group import SpanGroupRead
from app.core.data.dto.word_frequency import WordFrequencyRead
from app.core.data.repo.repo_service import RepoService

router = APIRouter(
    prefix="/sdoc", dependencies=[Depends(get_current_user)], tags=["sourceDocument"]
)


@router.get(
    "/{sdoc_id}",
    response_model=SourceDocumentRead,
    summary="Returns the SourceDocument with the given ID if it exists",
)
def get_by_id(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    only_if_finished: bool = True,
    authz_user: AuthzUser = Depends(),
) -> SourceDocumentRead:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    if not only_if_finished:
        crud_sdoc.get_status(db=db, sdoc_id=sdoc_id, raise_error_on_unfinished=True)

    return SourceDocumentRead.model_validate(crud_sdoc.read(db=db, id=sdoc_id))


@router.get(
    "/data/{sdoc_id}",
    response_model=SourceDocumentDataRead,
    summary="Returns the SourceDocumentData with the given ID if it exists",
)
def get_by_id_with_data(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    only_if_finished: bool = True,
    authz_user: AuthzUser = Depends(),
) -> SourceDocumentDataRead:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    if not only_if_finished:
        crud_sdoc.get_status(db=db, sdoc_id=sdoc_id, raise_error_on_unfinished=True)

    sdoc_data = crud_sdoc.read_data(db=db, id=sdoc_id)
    if sdoc_data is None:
        # if data is none, that means the document is not a text document
        # instead of returning html, we return the URL to the image / video / audio file
        sdoc = SourceDocumentRead.model_validate(crud_sdoc.read(db=db, id=sdoc_id))
        url = RepoService().get_sdoc_url(
            sdoc=sdoc,
            relative=True,
            webp=sdoc.doctype == DocType.image,
            thumbnail=False,
        )
        return SourceDocumentDataRead(
            id=sdoc_id,
            project_id=sdoc.project_id,
            token_character_offsets=[],
            tokens=[],
            sentences=[],
            html=url,
        )
    else:
        return SourceDocumentDataRead.model_validate(sdoc_data)


@router.delete(
    "/{sdoc_id}",
    response_model=SourceDocumentRead,
    summary="Removes the SourceDocument with the given ID if it exists",
)
def delete_by_id(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    authz_user: AuthzUser = Depends(),
) -> SourceDocumentRead:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    db_obj = crud_sdoc.remove(db=db, id=sdoc_id)
    return SourceDocumentRead.model_validate(db_obj)


@router.patch(
    "/{sdoc_id}",
    response_model=SourceDocumentRead,
    summary="Updates the SourceDocument with the given ID.",
)
def update_sdoc(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    sdoc: SourceDocumentUpdate,
    authz_user: AuthzUser = Depends(),
) -> SourceDocumentRead:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    db_obj = crud_sdoc.update(db=db, id=sdoc_id, update_dto=sdoc)
    return SourceDocumentRead.model_validate(db_obj)


@router.get(
    "/{sdoc_id}/linked_sdocs",
    response_model=List[int],
    summary="Returns the ids of SourceDocuments linked to the SourceDocument with the given id.",
)
def get_linked_sdocs(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[int]:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    return crud_sdoc.collect_linked_sdoc_ids(db=db, sdoc_id=sdoc_id)


@router.get(
    "/{sdoc_id}/url",
    response_model=str,
    summary="Returns the URL to the original file of the SourceDocument with the given ID if it exists.",
)
def get_file_url(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    relative: bool = True,
    webp: bool = False,
    thumbnail: bool = False,
    authz_user: AuthzUser = Depends(),
) -> str:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    sdoc_db_obj = crud_sdoc.read(db=db, id=sdoc_id)
    # TODO: FIX TYPING
    return RepoService().get_sdoc_url(
        sdoc=SourceDocumentRead.model_validate(sdoc_db_obj),
        relative=relative,
        webp=webp,
        thumbnail=thumbnail,
    )


@router.get(
    "/{sdoc_id}/metadata",
    response_model=List[SourceDocumentMetadataReadResolved],
    summary="Returns all SourceDocumentMetadata of the SourceDocument with the given ID if it exists",
)
def get_all_metadata(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[SourceDocumentMetadataReadResolved]:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    sdoc_db_obj = crud_sdoc.read(db=db, id=sdoc_id)
    return [
        SourceDocumentMetadataReadResolved.model_validate(meta)
        for meta in sdoc_db_obj.metadata_
    ]


@router.get(
    "/{sdoc_id}/metadata/{metadata_key}",
    response_model=SourceDocumentMetadataReadResolved,
    summary="Returns the SourceDocumentMetadata with the given Key if it exists.",
)
def read_metadata_by_key(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    metadata_key: str,
    authz_user: AuthzUser = Depends(),
) -> SourceDocumentMetadataReadResolved:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    metadata_db_obj = crud_sdoc_meta.read_by_sdoc_and_key(
        db=db, sdoc_id=sdoc_id, key=metadata_key
    )
    return SourceDocumentMetadataReadResolved.model_validate(metadata_db_obj)


@router.get(
    "/{sdoc_id}/annotators",
    response_model=List[int],
    summary="Returns IDs of users that annotated that SourceDocument.",
)
def get_annotators(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[int]:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    return [
        adoc.user_id for adoc in crud_sdoc.read(db=db, id=sdoc_id).annotation_documents
    ]


@router.get(
    "/{sdoc_id}/tags",
    response_model=List[DocumentTagRead],
    summary="Returns all DocumentTags linked with the SourceDocument.",
)
def get_all_tags(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[DocumentTagRead]:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    sdoc_db_obj = crud_sdoc.read(db=db, id=sdoc_id)
    return [
        DocumentTagRead.model_validate(doc_tag_db_obj)
        for doc_tag_db_obj in sdoc_db_obj.document_tags
    ]


@router.put(
    "/{sdoc_id}/memo",
    response_model=MemoRead,
    summary="Adds a Memo to the SourceDocument with the given ID if it exists",
)
def add_memo(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    memo: MemoCreate,
    authz_user: AuthzUser = Depends(),
    validate: Validate = Depends(),
) -> MemoRead:
    sdoc = crud_sdoc.read(db, sdoc_id)
    proj_id = sdoc.project_id

    authz_user.assert_in_project(sdoc.project_id)

    db_obj = crud_memo.create_for_sdoc(
        db=db,
        sdoc_id=sdoc_id,
        create_dto=MemoCreateIntern(
            **memo.model_dump(), user_id=authz_user.user.id, project_id=proj_id
        ),
    )
    memo_as_in_db_dto = MemoInDB.model_validate(db_obj)
    return MemoRead(
        **memo_as_in_db_dto.model_dump(exclude={"attached_to"}),
        attached_object_id=sdoc_id,
        attached_object_type=AttachedObjectType.source_document,
    )


@router.get(
    "/{sdoc_id}/memo",
    response_model=List[MemoRead],
    summary="Returns all Memo attached to the SourceDocument with the given ID if it exists.",
)
def get_memos(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[MemoRead]:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    db_obj = crud_sdoc.read(db=db, id=sdoc_id)
    return get_object_memos(db_obj=db_obj)


@router.get(
    "/{sdoc_id}/memo/user",
    response_model=MemoRead,
    summary=(
        "Returns the Memo attached to the SourceDocument with the given ID of the logged-in User if it exists."
    ),
)
def get_user_memo(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    authz_user: AuthzUser = Depends(),
) -> MemoRead:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    db_obj = crud_sdoc.read(db=db, id=sdoc_id)
    return get_object_memo_for_user(db_obj=db_obj, user_id=authz_user.user.id)


@router.get(
    "/{sdoc_id}/relatedmemos/user",
    response_model=List[MemoRead],
    summary=(
        "Returns the Memo attached to the SourceDocument of the logged-in User and all memos attached to its annotations."
    ),
)
def get_related_user_memos(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[MemoRead]:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    db_objs = crud_memo.read_by_user_and_sdoc(
        db=db, user_id=authz_user.user.id, sdoc_id=sdoc_id
    )
    memos = [
        crud_memo.get_memo_read_dto_from_orm(db=db, db_obj=db_obj) for db_obj in db_objs
    ]
    return memos


@router.get(
    "/{sdoc_id}/word_frequencies",
    response_model=List[WordFrequencyRead],
    summary="Returns the SourceDocument's word frequencies with the given ID if it exists",
)
def get_word_frequencies(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[WordFrequencyRead]:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    sdoc = crud_sdoc.read(db=db, id=sdoc_id)
    return [WordFrequencyRead.model_validate(wf) for wf in sdoc.word_frequencies]


@router.get(
    "/{sdoc_id}/user/span_annotations",
    response_model=Union[List[SpanAnnotationRead], List[SpanAnnotationReadResolved]],
    summary="Returns all SpanAnnotations of the logged-in User if it exists",
)
def get_all_span_annotations(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    resolve_code: bool = Depends(resolve_code_param),
    authz_user: AuthzUser = Depends(),
) -> Union[List[SpanAnnotationRead], List[SpanAnnotationReadResolved]]:
    spans = crud_span_anno.read_by_user_and_sdoc(
        db=db, user_id=authz_user.user.id, sdoc_id=sdoc_id
    )
    if resolve_code:
        return [SpanAnnotationReadResolved.model_validate(span) for span in spans]
    else:
        return [SpanAnnotationRead.model_validate(span) for span in spans]


@router.get(
    "/{sdoc_id}/span_annotations/bulk",
    response_model=Union[List[SpanAnnotationRead], List[SpanAnnotationReadResolved]],
    summary="Returns all SpanAnnotations of the Users with the given ID if it exists",
)
def get_all_span_annotations_bulk(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    user_id: Annotated[List[int], Query(default_factory=list)],
    resolve_code: bool = Depends(resolve_code_param),
    authz_user: AuthzUser = Depends(),
) -> Union[List[SpanAnnotationRead], List[SpanAnnotationReadResolved]]:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    spans = crud_span_anno.read_by_users_and_sdoc(
        db=db, user_ids=user_id, sdoc_id=sdoc_id
    )
    if resolve_code:
        return [SpanAnnotationReadResolved.model_validate(span) for span in spans]
    else:
        return [SpanAnnotationRead.model_validate(span) for span in spans]


@router.get(
    "{sdoc_id}/user/bbox_annotations",
    response_model=Union[List[BBoxAnnotationRead], List[BBoxAnnotationReadResolved]],
    summary="Returns all BBoxAnnotations of the logged-in User if it exists",
)
def get_all_bbox_annotations(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    skip_limit: Dict[str, int] = Depends(skip_limit_params),
    resolve_code: bool = Depends(resolve_code_param),
    authz_user: AuthzUser = Depends(),
) -> Union[List[BBoxAnnotationRead], List[BBoxAnnotationReadResolved]]:
    bboxes = crud_bbox_anno.read_by_user_and_sdoc(
        db=db, user_id=authz_user.user.id, sdoc_id=sdoc_id, **skip_limit
    )
    if resolve_code:
        return [BBoxAnnotationReadResolved.model_validate(bbox) for bbox in bboxes]
    else:
        return [BBoxAnnotationRead.model_validate(bbox) for bbox in bboxes]


@router.get(
    "{sdoc_id}/bbox_annotations/bulk",
    response_model=Union[List[BBoxAnnotationRead], List[BBoxAnnotationReadResolved]],
    summary="Returns all BBoxAnnotations of the Users with the given ID if it exists",
)
def get_all_bbox_annotations_bulk(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    user_id: Annotated[List[int], Query(default_factory=list)],
    skip_limit: Dict[str, int] = Depends(skip_limit_params),
    resolve_code: bool = Depends(resolve_code_param),
    authz_user: AuthzUser = Depends(),
) -> Union[List[BBoxAnnotationRead], List[BBoxAnnotationReadResolved]]:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    bboxes = crud_bbox_anno.read_by_users_and_sdoc(
        db=db, user_ids=user_id, sdoc_id=sdoc_id, **skip_limit
    )
    if resolve_code:
        return [BBoxAnnotationReadResolved.model_validate(bbox) for bbox in bboxes]
    else:
        return [BBoxAnnotationRead.model_validate(bbox) for bbox in bboxes]


@router.get(
    "{sdoc_id}/user/span_groups",
    response_model=List[SpanGroupRead],
    summary="Returns all SpanGroups of the logged-in User if it exists",
)
def get_all_span_groups(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    skip_limit: Dict[str, int] = Depends(skip_limit_params),
    authz_user: AuthzUser = Depends(),
) -> List[SpanGroupRead]:
    return [
        SpanGroupRead.model_validate(group)
        for group in crud_span_group.read_by_user_and_sdoc(
            db=db, user_id=authz_user.user.id, sdoc_id=sdoc_id, **skip_limit
        )
    ]
