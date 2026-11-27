from typing import Any, Protocol, Sequence, TypeVar

from sqlalchemy.orm import Session

from core.annotation.annotation_document_crud import crud_adoc
from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.annotation.annotation_exceptions import AnnotationSourceError
from core.annotation.bbox_annotation_orm import BBoxAnnotationORM
from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.memo.memo_enum import AttachedObjectType
from core.memo.memo_service import MemoService
from repos.db.project_crud_base import ProjectCRUDBase

AnnotationORM = TypeVar(
    "AnnotationORM", SpanAnnotationORM, SentenceAnnotationORM, BBoxAnnotationORM
)


class AnnotationCopyCreate(Protocol):
    """A create DTO of an annotation that may be a copy of another annotation."""

    @property
    def sdoc_id(self) -> int: ...

    @property
    def source_annotation_id(self) -> int | None: ...

    @property
    def user_id(self) -> int | None: ...


AnnotationCreate = TypeVar("AnnotationCreate", bound=AnnotationCopyCreate)


def read_annotation_documents(
    db: Session,
    *,
    project_id: int,
    user_id: int,
    create_dtos: Sequence[AnnotationCopyCreate],
) -> dict[tuple[int, int], AnnotationDocumentORM]:
    """
    Find or create the annotation document of every user and source document of
    the new annotations, one query per user.

    Args:
        project_id: The project of the new annotations.
        user_id: The user of the annotations whose `user_id` is not set.
        create_dtos: The annotations to create.

    Returns:
        The annotation documents by (user id, source document id).
    """
    sdoc_ids_by_user: dict[int, list[int]] = {}
    for create_dto in create_dtos:
        sdoc_ids = sdoc_ids_by_user.setdefault(create_dto.user_id or user_id, [])
        if create_dto.sdoc_id not in sdoc_ids:
            sdoc_ids.append(create_dto.sdoc_id)
    return {
        (adoc_user_id, sdoc_id): adoc
        for adoc_user_id, sdoc_ids in sdoc_ids_by_user.items()
        for sdoc_id, adoc in crud_adoc.exists_or_create_multi(
            db=db, project_id=project_id, user_id=adoc_user_id, sdoc_ids=sdoc_ids
        ).items()
    }


def read_annotation_sources(
    db: Session,
    *,
    crud: ProjectCRUDBase[AnnotationORM, Any, Any],
    project_id: int,
    create_dtos: Sequence[AnnotationCreate],
) -> list[tuple[AnnotationCreate, AnnotationORM | None]]:
    """
    Read the annotations the new ones are copied from with one query and check
    that each annotates the same source document.

    A copy whose source annotation does not exist in the project (e.g. it was
    deleted after the user opened the annotation comparison) is skipped silently,
    so the other annotations of a batch are still created.

    Args:
        crud: The CRUD of the annotation type.
        project_id: The project of the new annotations.
        create_dtos: The annotations to create.

    Returns:
        The annotations to create, each with its source annotation (None if it is
        no copy), in the order of `create_dtos`, without the skipped copies.

    Raises:
        AnnotationSourceError: If a source annotation does not annotate the same
            source document.
    """
    source_ids = list(
        dict.fromkeys(
            create_dto.source_annotation_id
            for create_dto in create_dtos
            if create_dto.source_annotation_id is not None
        )
    )
    source_by_id = crud.read_existing_by_ids(
        db=db, project_id=project_id, ids=source_ids
    )

    annotations: list[tuple[AnnotationCreate, AnnotationORM | None]] = []
    for create_dto in create_dtos:
        if create_dto.source_annotation_id is None:
            annotations.append((create_dto, None))
            continue
        source = source_by_id.get(create_dto.source_annotation_id)
        if source is None:
            continue
        if source.sdoc_id != create_dto.sdoc_id:
            raise AnnotationSourceError(
                source_annotation_id=source.id, sdoc_id=create_dto.sdoc_id
            )
        annotations.append((create_dto, source))
    return annotations


def copy_annotation_source_memos(
    db: Session,
    *,
    project_id: int,
    attached_object_type: AttachedObjectType,
    sources: Sequence[AnnotationORM | None],
    copies: Sequence[AnnotationORM],
) -> None:
    """
    Copy the memos of the source annotations onto their copies (by their original
    authors).

    Args:
        project_id: The project of the annotations.
        attached_object_type: The type of the annotations.
        sources: The source annotation of every created annotation (None if it is
            no copy), parallel to `copies`.
        copies: The created annotations.
    """
    pairs = [
        (source.id, copy.id)
        for source, copy in zip(sources, copies)
        if source is not None
    ]
    MemoService().copy_to_attached_objects(
        db=db,
        project_id=project_id,
        attached_object_type=attached_object_type,
        source_object_ids=[source_id for source_id, _ in pairs],
        target_object_ids=[copy_id for _, copy_id in pairs],
    )
