from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql.functions import coalesce

from repos.db.orm_base import ORMBase

if TYPE_CHECKING:
    from core.annotation.bbox_annotation_orm import BBoxAnnotationORM
    from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
    from core.annotation.span_annotation_orm import SpanAnnotationORM
    from core.annotation.span_group_orm import SpanGroupORM
    from core.code.code_orm import CodeORM
    from core.doc.source_document_orm import SourceDocumentORM
    from core.memo.memo_orm import MemoORM
    from core.project.project_orm import ProjectORM
    from core.tag.tag_orm import TagORM


class ObjectHandleORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # one to many
    attached_memos: Mapped[list["MemoORM"]] = relationship(
        "MemoORM",
        back_populates="attached_to",
        cascade="all, delete-orphan",
        passive_deletes=True,
        foreign_keys="MemoORM.attached_to_id",
    )

    # many to one: the project the handle belongs to
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # one to one (ObjectHandle is child): exactly one attached object
    attached_project_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("project.id", ondelete="CASCADE"), index=True
    )
    attached_project: Mapped["ProjectORM"] = relationship(
        "ProjectORM",
        back_populates="object_handle",
        foreign_keys=[attached_project_id],
    )

    code_id: Mapped[int | None] = mapped_column(Integer, index=True)
    code: Mapped["CodeORM"] = relationship(
        "CodeORM", back_populates="object_handle", foreign_keys=[code_id]
    )

    source_document_id: Mapped[int | None] = mapped_column(Integer, index=True)
    source_document: Mapped["SourceDocumentORM"] = relationship(
        "SourceDocumentORM",
        back_populates="object_handle",
        foreign_keys=[source_document_id],
    )

    span_annotation_id: Mapped[int | None] = mapped_column(Integer, index=True)
    span_annotation: Mapped["SpanAnnotationORM"] = relationship(
        "SpanAnnotationORM",
        back_populates="object_handle",
        foreign_keys=[span_annotation_id],
    )

    span_group_id: Mapped[int | None] = mapped_column(Integer, index=True)
    span_group: Mapped["SpanGroupORM"] = relationship(
        "SpanGroupORM", back_populates="object_handle", foreign_keys=[span_group_id]
    )

    bbox_annotation_id: Mapped[int | None] = mapped_column(Integer, index=True)
    bbox_annotation: Mapped["BBoxAnnotationORM"] = relationship(
        "BBoxAnnotationORM",
        back_populates="object_handle",
        foreign_keys=[bbox_annotation_id],
    )

    sentence_annotation_id: Mapped[int | None] = mapped_column(Integer, index=True)
    sentence_annotation: Mapped["SentenceAnnotationORM"] = relationship(
        "SentenceAnnotationORM",
        back_populates="object_handle",
        foreign_keys=[sentence_annotation_id],
    )

    tag_id: Mapped[int | None] = mapped_column(Integer, index=True)
    tag: Mapped["TagORM"] = relationship(
        "TagORM", back_populates="object_handle", foreign_keys=[tag_id]
    )

    Index(
        "idx_for_uc_work_with_null",
        coalesce(attached_project_id, 0),
        coalesce(code_id, 0),
        coalesce(source_document_id, 0),
        coalesce(span_annotation_id, 0),
        coalesce(span_group_id, 0),
        coalesce(bbox_annotation_id, 0),
        coalesce(sentence_annotation_id, 0),
        coalesce(tag_id, 0),
        unique=True,
    )

    __table_args__ = (
        CheckConstraint(
            """(
                        CASE WHEN attached_project_id IS NULL THEN 0 ELSE 1 END
                        + CASE WHEN code_id IS NULL THEN 0 ELSE 1 END
                        + CASE WHEN source_document_id IS NULL THEN 0 ELSE 1 END
                        + CASE WHEN span_annotation_id IS NULL THEN 0 ELSE 1 END
                        + CASE WHEN span_group_id IS NULL THEN 0 ELSE 1 END
                        + CASE WHEN bbox_annotation_id IS NULL THEN 0 ELSE 1 END
                        + CASE WHEN sentence_annotation_id IS NULL THEN 0 ELSE 1 END
                        + CASE WHEN tag_id IS NULL THEN 0 ELSE 1 END
                    ) = 1
                    """,
            name="CC_object_handle_refers_to_exactly_one_instance",
        ),
        CheckConstraint(
            "attached_project_id IS NULL OR attached_project_id = project_id",
            name="CC_object_handle_attached_project_is_own_project",
        ),
        UniqueConstraint(
            "attached_project_id",
            "code_id",
            "source_document_id",
            "span_annotation_id",
            "span_group_id",
            "bbox_annotation_id",
            "sentence_annotation_id",
            "tag_id",
            name="UC_only_one_object_handle_per_instance",
        ),
        UniqueConstraint("project_id", "id", name="UC_objecthandle_project_id_id"),
        ForeignKeyConstraint(
            ["project_id", "code_id"],
            ["code.project_id", "code.id"],
            ondelete="CASCADE",
            name="FK_objecthandle_code_id",
        ),
        ForeignKeyConstraint(
            ["project_id", "source_document_id"],
            ["sourcedocument.project_id", "sourcedocument.id"],
            ondelete="CASCADE",
            name="FK_objecthandle_source_document_id",
        ),
        ForeignKeyConstraint(
            ["project_id", "span_annotation_id"],
            ["spanannotation.project_id", "spanannotation.id"],
            ondelete="CASCADE",
            name="FK_objecthandle_span_annotation_id",
        ),
        ForeignKeyConstraint(
            ["project_id", "span_group_id"],
            ["spangroup.project_id", "spangroup.id"],
            ondelete="CASCADE",
            name="FK_objecthandle_span_group_id",
        ),
        ForeignKeyConstraint(
            ["project_id", "bbox_annotation_id"],
            ["bboxannotation.project_id", "bboxannotation.id"],
            ondelete="CASCADE",
            name="FK_objecthandle_bbox_annotation_id",
        ),
        ForeignKeyConstraint(
            ["project_id", "sentence_annotation_id"],
            ["sentenceannotation.project_id", "sentenceannotation.id"],
            ondelete="CASCADE",
            name="FK_objecthandle_sentence_annotation_id",
        ),
        ForeignKeyConstraint(
            ["project_id", "tag_id"],
            ["tag.project_id", "tag.id"],
            ondelete="CASCADE",
            name="FK_objecthandle_tag_id",
        ),
    )

    def get_project_id(self) -> int:
        return self.project_id
