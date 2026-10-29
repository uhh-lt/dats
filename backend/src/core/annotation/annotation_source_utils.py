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


def read_annotation_sources(
    db: Session,
    *,
    crud: SQLCRUDBase[AnnotationORM, Any, Any],
    create_dtos: Sequence[AnnotationCopyCreate],
    project_id_by_sdoc_id: dict[int, int],
) -> list[AnnotationORM | None]:
    """
    Read the annotations the new ones are copied from with one query and check
    that each annotates the same source document of the same project.

    Args:
        crud: The CRUD of the annotation type.
        create_dtos: The annotations to create.
        project_id_by_sdoc_id: The project of every source document of `create_dtos`.

    Returns:
        The source annotation of every create DTO (None if it is no copy), in
        the order of `create_dtos`.

    Raises:
        NoSuchElementError: If a source annotation does not exist.
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
    source_by_id = {
        db_obj.id: db_obj for db_obj in crud.read_by_ids(db=db, ids=source_ids)
    }

    sources: list[AnnotationORM | None] = []
    for create_dto in create_dtos:
        if create_dto.source_annotation_id is None:
            sources.append(None)
            continue
        source = source_by_id[create_dto.source_annotation_id]
        if (
            source.project_id != project_id_by_sdoc_id[create_dto.sdoc_id]
            or source.sdoc_id != create_dto.sdoc_id
        ):
            raise AnnotationSourceError(
                source_annotation_id=source.id, sdoc_id=create_dto.sdoc_id
            )
        sources.append(source)
    return sources


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
