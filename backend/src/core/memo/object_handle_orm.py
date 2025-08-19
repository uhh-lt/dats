from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer, UniqueConstraint
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
    from core.user.user_orm import UserORM


class ObjectHandleORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # one to many
    attached_memos: Mapped[list["MemoORM"]] = relationship(
        "MemoORM",
        back_populates="attached_to",
        cascade="all, delete-orphan",
        passive_deletes=True,
        foreign_keys="memo.c.attached_to_id",
    )

    # one to one (ObjectHandle is child)
    user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("user.id", ondelete="CASCADE"), index=True
    )
    user: Mapped["UserORM"] = relationship("UserORM", back_populates="object_handle")

    project_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("project.id", ondelete="CASCADE"), index=True
    )
    project: Mapped["ProjectORM"] = relationship(
        "ProjectORM", back_populates="object_handle"
    )

    memo_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("memo.id", ondelete="CASCADE"), index=True
    )
    memo: Mapped["MemoORM"] = relationship(
        "MemoORM", back_populates="object_handle", foreign_keys="objecthandle.c.memo_id"
    )

    code_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("code.id", ondelete="CASCADE"), index=True
    )
    code: Mapped["CodeORM"] = relationship("CodeORM", back_populates="object_handle")

    source_document_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("sourcedocument.id", ondelete="CASCADE"), index=True
    )
    source_document: Mapped["SourceDocumentORM"] = relationship(
        "SourceDocumentORM", back_populates="object_handle"
    )

    span_annotation_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("spanannotation.id", ondelete="CASCADE"), index=True
    )
    span_annotation: Mapped["SpanAnnotationORM"] = relationship(
        "SpanAnnotationORM", back_populates="object_handle"
    )

    span_group_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("spangroup.id", ondelete="CASCADE"), index=True
    )
    span_group: Mapped["SpanGroupORM"] = relationship(
        "SpanGroupORM", back_populates="object_handle"
    )

    bbox_annotation_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("bboxannotation.id", ondelete="CASCADE"), index=True
    )
    bbox_annotation: Mapped["BBoxAnnotationORM"] = relationship(
        "BBoxAnnotationORM", back_populates="object_handle"
    )

    sentence_annotation_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("sentenceannotation.id", ondelete="CASCADE"), index=True
    )
    sentence_annotation: Mapped["SentenceAnnotationORM"] = relationship(
        "SentenceAnnotationORM", back_populates="object_handle"
    )

    tag_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("tag.id", ondelete="CASCADE"), index=True
    )
    tag: Mapped["TagORM"] = relationship("TagORM", back_populates="object_handle")

    # Flo: https://stackoverflow.com/questions/60207228/postgres-unique-constraint-with-multiple-columns-and-null-values
    Index(
        "idx_for_uc_work_with_null",
        coalesce(user_id, 0),
        coalesce(project_id, 0),
        coalesce(code_id, 0),
        coalesce(source_document_id, 0),
        coalesce(span_annotation_id, 0),
        coalesce(bbox_annotation_id, 0),
        coalesce(sentence_annotation_id, 0),
        coalesce(span_group_id, 0),
        coalesce(tag_id, 0),
        coalesce(memo_id, 0),
        unique=True,
    )

    __table_args__ = (
        # CHECK constraint that asserts that exactly one of the IDs is NOT NULL
        CheckConstraint(
            """(
                        CASE WHEN user_id IS NULL THEN 0 ELSE 1 END
                        + CASE WHEN project_id IS NULL THEN 0 ELSE 1 END
                        + CASE WHEN code_id IS NULL THEN 0 ELSE 1 END
                        + CASE WHEN memo_id IS NULL THEN 0 ELSE 1 END
                        + CASE WHEN source_document_id IS NULL THEN 0 ELSE 1 END
                        + CASE WHEN span_annotation_id IS NULL THEN 0 ELSE 1 END
                        + CASE WHEN bbox_annotation_id IS NULL THEN 0 ELSE 1 END
                        + CASE WHEN sentence_annotation_id IS NULL THEN 0 ELSE 1 END
                        + CASE WHEN span_group_id IS NULL THEN 0 ELSE 1 END
                        + CASE WHEN tag_id IS NULL THEN 0 ELSE 1 END
                    ) = 1
                    """,
            name="CC_object_handle_refers_to_exactly_one_instance",
        ),
        UniqueConstraint(
            "user_id",
            "project_id",
            "code_id",
            "memo_id",
            "source_document_id",
            "span_annotation_id",
            "bbox_annotation_id",
            "sentence_annotation_id",
            "span_group_id",
            "tag_id",
            name="UC_only_one_object_handle_per_instance",
        ),
    )

    def get_project_id(self) -> int:
        if self.project_id is not None:
            return self.project_id
        elif self.memo_id is not None:
            return self.memo.get_project_id()
        elif self.code_id is not None:
            return self.code.get_project_id()
        elif self.source_document_id is not None:
            return self.source_document.get_project_id()
        elif self.span_annotation_id is not None:
            return self.span_annotation.get_project_id()
        elif self.bbox_annotation_id is not None:
            return self.bbox_annotation.get_project_id()
        elif self.sentence_annotation_id is not None:
            return self.sentence_annotation.get_project_id()
        elif self.span_group_id is not None:
            return self.span_group.get_project_id()
        elif self.tag_id is not None:
            return self.tag.get_project_id()
        else:
            raise ValueError(
                "No project ID available for this ObjectHandleORM instance."
            )
