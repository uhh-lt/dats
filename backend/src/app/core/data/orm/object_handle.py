from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql.functions import coalesce

from app.core.data.orm.orm_base import ORMBase

if TYPE_CHECKING:
    from app.core.data.orm.bbox_annotation import BBoxAnnotationORM
    from app.core.data.orm.code import CodeORM
    from app.core.data.orm.document_tag import DocumentTagORM
    from app.core.data.orm.memo import MemoORM
    from app.core.data.orm.project import ProjectORM
    from app.core.data.orm.sentence_annotation import SentenceAnnotationORM
    from app.core.data.orm.source_document import SourceDocumentORM
    from app.core.data.orm.span_annotation import SpanAnnotationORM
    from app.core.data.orm.span_group import SpanGroupORM
    from app.core.data.orm.user import UserORM


class ObjectHandleORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # one to many
    attached_memos: Mapped[List["MemoORM"]] = relationship(
        "MemoORM",
        back_populates="attached_to",
        passive_deletes=True,
        foreign_keys="memo.c.attached_to_id",
    )

    # one to one (ObjectHandle is child)
    user_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("user.id", ondelete="CASCADE"), index=True
    )
    user: Mapped["UserORM"] = relationship("UserORM", back_populates="object_handle")

    project_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("project.id", ondelete="CASCADE"), index=True
    )
    project: Mapped["ProjectORM"] = relationship(
        "ProjectORM", back_populates="object_handle"
    )

    memo_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("memo.id", ondelete="CASCADE"), index=True
    )
    memo: Mapped["MemoORM"] = relationship(
        "MemoORM", back_populates="object_handle", foreign_keys="objecthandle.c.memo_id"
    )

    code_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("code.id", ondelete="CASCADE"), index=True
    )
    code: Mapped["CodeORM"] = relationship("CodeORM", back_populates="object_handle")

    source_document_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("sourcedocument.id", ondelete="CASCADE"), index=True
    )
    source_document: Mapped["SourceDocumentORM"] = relationship(
        "SourceDocumentORM", back_populates="object_handle"
    )

    span_annotation_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("spanannotation.id", ondelete="CASCADE"), index=True
    )
    span_annotation: Mapped["SpanAnnotationORM"] = relationship(
        "SpanAnnotationORM", back_populates="object_handle"
    )

    span_group_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("spangroup.id", ondelete="CASCADE"), index=True
    )
    span_group: Mapped["SpanGroupORM"] = relationship(
        "SpanGroupORM", back_populates="object_handle"
    )

    bbox_annotation_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("bboxannotation.id", ondelete="CASCADE"), index=True
    )
    bbox_annotation: Mapped["BBoxAnnotationORM"] = relationship(
        "BBoxAnnotationORM", back_populates="object_handle"
    )

    sentence_annotation_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("sentenceannotation.id", ondelete="CASCADE"), index=True
    )
    sentence_annotation: Mapped["SentenceAnnotationORM"] = relationship(
        "SentenceAnnotationORM", back_populates="object_handle"
    )

    document_tag_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("documenttag.id", ondelete="CASCADE"), index=True
    )
    document_tag: Mapped["DocumentTagORM"] = relationship(
        "DocumentTagORM", back_populates="object_handle"
    )

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
        coalesce(document_tag_id, 0),
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
                        + CASE WHEN document_tag_id IS NULL THEN 0 ELSE 1 END
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
            "document_tag_id",
            name="UC_only_one_object_handle_per_instance",
        ),
    )
