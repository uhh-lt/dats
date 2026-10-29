from typing import Any, Protocol, Sequence, TypeVar

from sqlalchemy.orm import Session

from core.annotation.annotation_exceptions import AnnotationSourceError
from core.annotation.bbox_annotation_orm import BBoxAnnotationORM
from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.memo.memo_enum import AttachedObjectType
from core.memo.memo_service import MemoService
from repos.db.crud_base import SQLCRUDBase

AnnotationORM = TypeVar(
    "AnnotationORM", SpanAnnotationORM, SentenceAnnotationORM, BBoxAnnotationORM
)


class AnnotationCopyCreate(Protocol):
    """A create DTO of an annotation that may be a copy of another annotation."""

    @property
    def sdoc_id(self) -> int: ...

    @property
    def source_annotation_id(self) -> int | None: ...


AnnotationCreate = TypeVar("AnnotationCreate", bound=AnnotationCopyCreate)


def read_annotation_sources(
    db: Session,
    *,
    crud: SQLCRUDBase[AnnotationORM, Any, Any],
    create_dtos: Sequence[AnnotationCreate],
    project_id_by_sdoc_id: dict[int, int],
) -> list[tuple[AnnotationCreate, AnnotationORM | None]]:
    """
    Read the annotations the new ones are copied from with one query and check
    that each annotates the same source document of the same project.

    A copy whose source annotation no longer exists (e.g. it was deleted after the
    user opened the annotation comparison) is skipped silently, so the other
    annotations of a batch are still created.

    Args:
        crud: The CRUD of the annotation type.
        create_dtos: The annotations to create.
        project_id_by_sdoc_id: The project of every source document of `create_dtos`.

    Returns:
        The annotations to create, each with its source annotation (None if it is
        no copy), in the order of `create_dtos`, without the skipped copies.

    Raises:
        AnnotationSourceError: If a source annotation does not annotate the same
            source document of the same project.
    """
    source_ids = list(
        dict.fromkeys(
            create_dto.source_annotation_id
            for create_dto in create_dtos
            if create_dto.source_annotation_id is not None
        )
    )
    source_by_id = crud.read_existing_by_ids(db=db, ids=source_ids)

    annotations: list[tuple[AnnotationCreate, AnnotationORM | None]] = []
    for create_dto in create_dtos:
        if create_dto.source_annotation_id is None:
            annotations.append((create_dto, None))
            continue
        source = source_by_id.get(create_dto.source_annotation_id)
        if source is None:
            continue
        if (
            source.project_id != project_id_by_sdoc_id[create_dto.sdoc_id]
            or source.sdoc_id != create_dto.sdoc_id
        ):
            raise AnnotationSourceError(
                source_annotation_id=source.id, sdoc_id=create_dto.sdoc_id
            )
        annotations.append((create_dto, source))
    return annotations


def copy_annotation_source_memos(
    db: Session,
    *,
    attached_object_type: AttachedObjectType,
    sources: Sequence[AnnotationORM | None],
    copies: Sequence[AnnotationORM],
) -> None:
    """
    Copy the memos of the source annotations onto their copies (by their original
    authors).

    Args:
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
        attached_object_type=attached_object_type,
        source_object_ids=[source_id for source_id, _ in pairs],
        target_object_ids=[copy_id for _, copy_id in pairs],
    )
