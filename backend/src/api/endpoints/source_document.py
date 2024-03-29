from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_current_user, get_db_session
from api.util import get_object_memo_for_user, get_object_memos
from api.validation import Validate
from app.core.authorization.authz_user import AuthzUser
from app.core.data.crud import Crud
from app.core.data.crud.annotation_document import crud_adoc
from app.core.data.crud.crud_base import NoSuchElementError
from app.core.data.crud.memo import crud_memo
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.crud.source_document_metadata import crud_sdoc_meta
from app.core.data.dto.annotation_document import (
    AnnotationDocumentCreate,
    AnnotationDocumentRead,
)
from app.core.data.dto.document_tag import DocumentTagRead
from app.core.data.dto.memo import AttachedObjectType, MemoCreate, MemoInDB, MemoRead
from app.core.data.dto.source_document import (
    SourceDocumentRead,
    SourceDocumentUpdate,
    SourceDocumentWithDataRead,
)
from app.core.data.dto.source_document_metadata import (
    SourceDocumentMetadataReadResolved,
)
from app.core.data.dto.word_frequency import WordFrequencyRead
from app.core.data.repo.repo_service import RepoService

router = APIRouter(
    prefix="/sdoc", dependencies=[Depends(get_current_user)], tags=["sourceDocument"]
)


@router.get(
    "/{sdoc_id}",
    response_model=SourceDocumentWithDataRead,
    summary="Returns the SourceDocument with the given ID if it exists",
)
def get_by_id(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    only_if_finished: bool = True,
    authz_user: AuthzUser = Depends(),
) -> SourceDocumentWithDataRead:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    if not only_if_finished:
        crud_sdoc.get_status(db=db, sdoc_id=sdoc_id, raise_error_on_unfinished=True)

    return crud_sdoc.read_with_data(db=db, id=sdoc_id)


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
    "/{sdoc_id}/adoc/{user_id}",
    response_model=AnnotationDocumentRead,
    summary="Returns the AnnotationDocument for the SourceDocument of the User or create the AnnotationDocument for the User if it does not exist.",
)
def get_adoc_of_user(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    user_id: int,
    authz_user: AuthzUser = Depends(),
) -> AnnotationDocumentRead:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    try:
        db_obj = crud_adoc.read_by_sdoc_and_user(
            db=db, sdoc_id=sdoc_id, user_id=user_id
        )
    except NoSuchElementError:
        db_obj = crud_adoc.create(
            db=db,
            create_dto=AnnotationDocumentCreate(
                source_document_id=sdoc_id,
                user_id=user_id,
            ),
        )

    return AnnotationDocumentRead.model_validate(db_obj)


@router.get(
    "/{sdoc_id}/adoc",
    response_model=List[AnnotationDocumentRead],
    summary="Returns all AnnotationDocuments for the SourceDocument.",
)
def get_all_adocs(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[AnnotationDocumentRead]:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    return [
        AnnotationDocumentRead.model_validate(adoc)
        for adoc in crud_sdoc.read(db=db, id=sdoc_id).annotation_documents
    ]


@router.delete(
    "/{sdoc_id}/adoc",
    response_model=List[int],
    summary="Removes all AnnotationDocuments for the SourceDocument.",
)
def remove_all_adocs(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[int]:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    return crud_adoc.remove_by_sdoc(db=db, sdoc_id=sdoc_id)


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


@router.delete(
    "/{sdoc_id}/tags",
    response_model=SourceDocumentRead,
    summary="Unlinks all DocumentTags of the SourceDocument.",
)
def unlinks_all_tags(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    authz_user: AuthzUser = Depends(),
) -> SourceDocumentRead:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    sdoc_db_obj = crud_sdoc.unlink_all_document_tags(db=db, sdoc_id=sdoc_id)
    return SourceDocumentRead.model_validate(sdoc_db_obj)


@router.patch(
    "/{sdoc_id}/tag/{tag_id}",
    response_model=SourceDocumentRead,
    summary="Links a DocumentTag with the SourceDocument with the given ID if it exists",
)
def link_tag(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    tag_id: int,
    authz_user: AuthzUser = Depends(),
    validate: Validate = Depends(),
) -> SourceDocumentRead:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)
    authz_user.assert_in_same_project_as(Crud.DOCUMENT_TAG, tag_id)
    validate.validate_objects_in_same_project(
        [(Crud.SOURCE_DOCUMENT, sdoc_id), (Crud.DOCUMENT_TAG, tag_id)]
    )

    sdoc_db_obj = crud_sdoc.link_document_tag(db=db, sdoc_id=sdoc_id, tag_id=tag_id)
    return SourceDocumentRead.model_validate(sdoc_db_obj)


@router.delete(
    "/{sdoc_id}/tag/{tag_id}",
    response_model=SourceDocumentRead,
    summary="Unlinks the DocumentTags from the SourceDocument.",
)
def unlink_tag(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    tag_id: int,
    authz_user: AuthzUser = Depends(),
) -> SourceDocumentRead:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)
    authz_user.assert_in_same_project_as(Crud.DOCUMENT_TAG, tag_id)

    sdoc_db_obj = crud_sdoc.unlink_document_tag(db=db, sdoc_id=sdoc_id, tag_id=tag_id)
    return SourceDocumentRead.model_validate(sdoc_db_obj)


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
    authz_user.assert_is_same_user(memo.user_id)
    authz_user.assert_in_project(sdoc.project_id)
    authz_user.assert_in_project(memo.project_id)
    validate.validate_condition(sdoc.project_id == memo.project_id)

    db_obj = crud_memo.create_for_sdoc(db=db, sdoc_id=sdoc_id, create_dto=memo)
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
    "/{sdoc_id}/memo/{user_id}",
    response_model=MemoRead,
    summary=(
        "Returns the Memo attached to the SourceDocument with the given ID of the User with the"
        " given ID if it exists."
    ),
)
def get_user_memo(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    user_id: int,
    authz_user: AuthzUser = Depends(),
) -> MemoRead:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    db_obj = crud_sdoc.read(db=db, id=sdoc_id)
    return get_object_memo_for_user(db_obj=db_obj, user_id=user_id)


@router.get(
    "/{sdoc_id}/relatedmemos/{user_id}",
    response_model=List[MemoRead],
    summary=(
        "Returns the Memo attached to the SourceDocument of the User with the given ID and all memos"
        " attached to its annotations."
    ),
)
def get_related_user_memos(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    user_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[MemoRead]:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    db_objs = crud_memo.read_by_user_and_sdoc(db=db, user_id=user_id, sdoc_id=sdoc_id)
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
