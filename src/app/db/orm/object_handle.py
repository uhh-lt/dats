from sqlalchemy import Column, Integer, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship

from app.db.orm.orm_base import ORMBase


class ObjectHandleORM(ORMBase):
    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey('user.id', ondelete="CASCADE"), index=True)
    user = relationship("UserORM", back_populates="object_handle")

    project_id = Column(Integer, ForeignKey('project.id', ondelete="CASCADE"), index=True)
    project = relationship("ProjectORM", back_populates="object_handle")

    memo_id = Column(Integer, ForeignKey('memo.id', ondelete="CASCADE"), index=True)
    memo = relationship("MemoORM", back_populates="object_handle")

    code_id = Column(Integer, ForeignKey('code.id', ondelete="CASCADE"), index=True)
    code = relationship("CodeORM", back_populates="object_handle")

    current_code_id = Column(Integer, ForeignKey('currentcode.id', ondelete="CASCADE"), index=True)
    current_code = relationship("CurrentCodeORM", back_populates="object_handle")

    source_document_id = Column(Integer, ForeignKey('sourcedocument.id', ondelete="CASCADE"), index=True)
    source_document = relationship("SourceDocumentORM", back_populates="object_handle")

    source_document_metadata_id = Column(Integer, ForeignKey('sourcedocumentmetadata.id', ondelete="CASCADE"),
                                         index=True)
    source_document_metadata = relationship("SourceDocumentMetadataORM", back_populates="object_handle")

    annotation_document_id = Column(Integer, ForeignKey('annotationdocument.id', ondelete="CASCADE"), index=True)
    annotation_document = relationship("AnnotationDocumentORM", back_populates="object_handle")

    span_annotation_id = Column(Integer, ForeignKey('spanannotation.id', ondelete="CASCADE"), index=True)
    span_annotation = relationship("SpanAnnotationORM", back_populates="object_handle")

    document_tag_id = Column(Integer, ForeignKey('documenttag.id', ondelete="CASCADE"), index=True)
    document_tag = relationship("DocumentTagORM", back_populates="object_handle")

    action_id = Column(Integer, ForeignKey('action.id', ondelete="CASCADE"), index=True)
    action = relationship("ActionORM", back_populates="object_handle")

    action_target_id = Column(Integer, ForeignKey('actiontarget.id', ondelete="CASCADE"), index=True)
    action_target = relationship("ActionTargetORM", back_populates="object_handle")

    filter_id = Column(Integer, ForeignKey('filter.id', ondelete="CASCADE"), index=True)
    filter = relationship("FilterORM", back_populates="object_handle")

    query_id = Column(Integer, ForeignKey('query.id', ondelete="CASCADE"), index=True)
    query = relationship("QueryORM", back_populates="object_handle")

    __table_args__ = (
        # CHECK constraint that asserts that exactly one of the IDs is NOT NULL
        CheckConstraint("""(
                        CASE WHEN user_id IS NULL THEN 0 ELSE 1 END
                        + CASE WHEN project_id IS NULL THEN 0 ELSE 1 END
                        + CASE WHEN memo_id IS NULL THEN 0 ELSE 1 END
                        + CASE WHEN code_id IS NULL THEN 0 ELSE 1 END
                        + CASE WHEN current_code_id IS NULL THEN 0 ELSE 1 END
                        + CASE WHEN source_document_id IS NULL THEN 0 ELSE 1 END
                        + CASE WHEN source_document_metadata_id IS NULL THEN 0 ELSE 1 END
                        + CASE WHEN annotation_document_id IS NULL THEN 0 ELSE 1 END
                        + CASE WHEN span_annotation_id IS NULL THEN 0 ELSE 1 END
                        + CASE WHEN document_tag_id IS NULL THEN 0 ELSE 1 END
                        + CASE WHEN action_id IS NULL THEN 0 ELSE 1 END
                        + CASE WHEN action_target_id IS NULL THEN 0 ELSE 1 END
                        + CASE WHEN filter_id IS NULL THEN 0 ELSE 1 END
                        + CASE WHEN query_id IS NULL THEN 0 ELSE 1 END
                    ) = 1
                    """, name="CC_object_handle_refers_to_exactly_one_instance"),
    )
