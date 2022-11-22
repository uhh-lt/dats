from typing import TYPE_CHECKING, List

from sqlalchemy import Column, Integer, ForeignKey, String, DateTime, func, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.data.orm.orm_base import ORMBase

if TYPE_CHECKING:
    from app.core.data.orm.annotation_document import AnnotationDocumentORM
    from app.core.data.orm.document_tag import DocumentTagORM
    from app.core.data.orm.object_handle import ObjectHandleORM
    from app.core.data.orm.project import ProjectORM
    from app.core.data.orm.source_document_metadata import SourceDocumentMetadataORM
    from app.core.data.orm.source_document_link import SourceDocumentLinkORM


class SourceDocumentORM(ORMBase):
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False, index=True)
    content = Column(String, nullable=False, index=False)  # TODO Flo: This will go to ES soon!
    doctype = Column(String, nullable=False, index=True)
    status = Column(String, nullable=False, index=True)
    created = Column(DateTime, server_default=func.now(), index=True)
    updated = Column(DateTime, server_default=func.now(), onupdate=func.current_timestamp())

    # one to one
    object_handle: "ObjectHandleORM" = relationship("ObjectHandleORM",
                                                    uselist=False,
                                                    back_populates="source_document",
                                                    passive_deletes=True)

    # many to one
    project_id = Column(Integer, ForeignKey('project.id', ondelete="CASCADE"), nullable=False, index=True)
    project: "ProjectORM" = relationship("ProjectORM", back_populates="source_documents")

    # one to many
    metadata_: List["SourceDocumentMetadataORM"] = relationship("SourceDocumentMetadataORM",
                                                                back_populates="source_document",
                                                                passive_deletes=True)

    annotation_documents: List["AnnotationDocumentORM"] = relationship("AnnotationDocumentORM",
                                                                       back_populates="source_document",
                                                                       passive_deletes=True)

    source_document_links: List["SourceDocumentLinkORM"] = relationship("SourceDocumentLinkORM",
                                                                        back_populates="parent_source_document",
                                                                        passive_deletes=True,
                                                                        foreign_keys="sourcedocumentlink.c.parent_source_document_id")

    # many to many
    document_tags: List["DocumentTagORM"] = relationship("DocumentTagORM",
                                                         secondary="SourceDocumentDocumentTagLinkTable".lower(),
                                                         back_populates="source_documents",
                                                         passive_deletes=True)
    __table_args__ = (
        UniqueConstraint("project_id",
                         "filename",
                         name="UC_unique_filename_in_project"),
    )
