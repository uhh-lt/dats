from typing import TYPE_CHECKING, List

from sqlalchemy import Column, Integer, ForeignKey, CheckConstraint, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql.functions import coalesce

from app.core.data.orm.orm_base import ORMBase

if TYPE_CHECKING:
    from app.core.data.orm.project import ProjectORM
    from app.core.data.orm.source_document import SourceDocumentORM
    from app.core.data.orm.source_document_metadata import SourceDocumentMetadataORM
    from app.core.data.orm.span_annotation import SpanAnnotationORM
    from app.core.data.orm.span_group import SpanGroupORM
    from app.core.data.orm.bbox_annotation import BBoxAnnotationORM
    from app.core.data.orm.user import UserORM
    from app.core.data.orm.annotation_document import AnnotationDocumentORM
    from app.core.data.orm.code import CodeORM, CurrentCodeORM
    from app.core.data.orm.document_tag import DocumentTagORM
    from app.core.data.orm.memo import MemoORM


class ObjectHandleORM(ORMBase):
    id = Column(Integer, primary_key=True, index=True)

    # one to many
    attached_memos: List["MemoORM"] = relationship("MemoORM",
                                                   back_populates="attached_to",
                                                   passive_deletes=True)

    # one to one (ObjectHandle is child)
    user_id = Column(Integer, ForeignKey('user.id', ondelete="CASCADE"), index=True)
    user: "UserORM" = relationship("UserORM", back_populates="object_handle")

    project_id = Column(Integer, ForeignKey('project.id', ondelete="CASCADE"), index=True)
    project: "ProjectORM" = relationship("ProjectORM", back_populates="object_handle")

    # FIXME Flo: SQLAlchemy ambiguous FK issue...
    # memo_id = Column(Integer, ForeignKey('memo.id', ondelete="CASCADE"), index=True)
    # memo = relationship("MemoORM", back_populates="object_handle", foreign_keys=[memo_id])

    code_id = Column(Integer, ForeignKey('code.id', ondelete="CASCADE"), index=True)
    code: "CodeORM" = relationship("CodeORM", back_populates="object_handle")

    current_code_id = Column(Integer, ForeignKey('currentcode.id', ondelete="CASCADE"), index=True)
    current_code: "CurrentCodeORM" = relationship("CurrentCodeORM", back_populates="object_handle")

    source_document_id = Column(Integer, ForeignKey('sourcedocument.id', ondelete="CASCADE"), index=True)
    source_document: "SourceDocumentORM" = relationship("SourceDocumentORM", back_populates="object_handle")

    source_document_metadata_id = Column(Integer, ForeignKey('sourcedocumentmetadata.id', ondelete="CASCADE"),
                                         index=True)
    source_document_metadata: "SourceDocumentMetadataORM" = relationship("SourceDocumentMetadataORM",
                                                                         back_populates="object_handle")

    annotation_document_id = Column(Integer, ForeignKey('annotationdocument.id', ondelete="CASCADE"), index=True)
    annotation_document: "AnnotationDocumentORM" = relationship("AnnotationDocumentORM", back_populates="object_handle")

    span_annotation_id = Column(Integer, ForeignKey('spanannotation.id', ondelete="CASCADE"), index=True)
    span_annotation: "SpanAnnotationORM" = relationship("SpanAnnotationORM", back_populates="object_handle")

    span_group_id = Column(Integer, ForeignKey('spangroup.id', ondelete="CASCADE"), index=True)
    span_group: "SpanGroupORM" = relationship("SpanGroupORM", back_populates="object_handle")

    bbox_annotation_id = Column(Integer, ForeignKey('bboxannotation.id', ondelete="CASCADE"), index=True)
    bbox_annotation: "BBoxAnnotationORM" = relationship("BBoxAnnotationORM", back_populates="object_handle")

    document_tag_id = Column(Integer, ForeignKey('documenttag.id', ondelete="CASCADE"), index=True)
    document_tag: "DocumentTagORM" = relationship("DocumentTagORM", back_populates="object_handle")

    # Flo: https://stackoverflow.com/questions/60207228/postgres-unique-constraint-with-multiple-columns-and-null-values
    Index('idx_for_uc_work_with_null',
          coalesce(user_id, 0),
          coalesce(project_id, 0),
          coalesce(code_id, 0),
          coalesce(current_code_id, 0),
          coalesce(source_document_id, 0),
          coalesce(source_document_metadata_id, 0),
          coalesce(annotation_document_id, 0),
          coalesce(span_annotation_id, 0),
          coalesce(bbox_annotation_id, 0),
          coalesce(span_group_id, 0),
          coalesce(document_tag_id, 0),
          unique=True)

    __table_args__ = (
        # FIXME Flo: SQLAlchemy ambiguous FK issue...
        #  + CASE WHEN memo_id IS NULL THEN 0 ELSE 1 END
        # CHECK constraint that asserts that exactly one of the IDs is NOT NULL
        CheckConstraint("""(
                        CASE WHEN user_id IS NULL THEN 0 ELSE 1 END
                        + CASE WHEN project_id IS NULL THEN 0 ELSE 1 END
                        + CASE WHEN code_id IS NULL THEN 0 ELSE 1 END
                        + CASE WHEN current_code_id IS NULL THEN 0 ELSE 1 END
                        + CASE WHEN source_document_id IS NULL THEN 0 ELSE 1 END
                        + CASE WHEN source_document_metadata_id IS NULL THEN 0 ELSE 1 END
                        + CASE WHEN annotation_document_id IS NULL THEN 0 ELSE 1 END
                        + CASE WHEN span_annotation_id IS NULL THEN 0 ELSE 1 END
                        + CASE WHEN bbox_annotation_id IS NULL THEN 0 ELSE 1 END
                        + CASE WHEN span_group_id IS NULL THEN 0 ELSE 1 END
                        + CASE WHEN document_tag_id IS NULL THEN 0 ELSE 1 END
                    ) = 1
                    """, name="CC_object_handle_refers_to_exactly_one_instance"),
        UniqueConstraint("user_id",
                         "project_id",
                         "code_id",
                         "current_code_id",
                         "source_document_id",
                         "source_document_metadata_id",
                         "annotation_document_id",
                         "span_annotation_id",
                         "span_group_id",
                         "document_tag_id",
                         name="UC_only_one_object_handle_per_instance"),
    )
