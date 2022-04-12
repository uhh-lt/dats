from typing import TYPE_CHECKING, List

from sqlalchemy import Column, Integer, ForeignKey, String, DateTime, func
from sqlalchemy.orm import relationship

from app.core.data.orm.orm_base import ORMBase

if TYPE_CHECKING:
    from app.core.data.orm.annotation_document import AnnotationDocumentORM
    from app.core.data.orm.document_tag import DocumentTagORM
    from app.core.data.orm.object_handle import ObjectHandleORM
    from app.core.data.orm.project import ProjectORM


class SourceDocumentORM(ORMBase):
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False, index=True)
    content = Column(String, nullable=False, index=False)  # TODO Flo: This will go to ES soon!
    doctype = Column(Integer, nullable=False, index=True)
    created = Column(DateTime, server_default=func.now(), index=True)

    # one to one
    object_handle: "ObjectHandleORM" = relationship("ObjectHandleORM",
                                                    uselist=False,
                                                    back_populates="source_document",
                                                    cascade="all, delete",
                                                    passive_deletes=True)

    # many to one
    project_id = Column(Integer, ForeignKey('project.id', ondelete="CASCADE"), index=True)
    project: "ProjectORM" = relationship("ProjectORM", back_populates="source_documents")

    # one to many
    metadata_: List["SourceDocumentMetadataORM"] = relationship("SourceDocumentMetadataORM",
                                                                back_populates="source_document",
                                                                cascade="all, delete",
                                                                passive_deletes=True)

    annotation_documents: List["AnnotationDocumentORM"] = relationship("AnnotationDocumentORM",
                                                                       back_populates="source_document",
                                                                       cascade="all, delete",
                                                                       passive_deletes=True)

    # many to many
    document_tags: List["DocumentTagORM"] = relationship("DocumentTagORM",
                                                         secondary="SourceDocumentDocumentTagLinkTable".lower(),
                                                         back_populates="source_documents")


class SourceDocumentMetadataORM(ORMBase):
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, nullable=False, index=True)
    value = Column(String, index=True)

    # one to one
    object_handle: "ObjectHandleORM" = relationship("ObjectHandleORM",
                                                    uselist=False,
                                                    back_populates="source_document_metadata",
                                                    cascade="all, delete",
                                                    passive_deletes=True)

    # many to one
    source_document_id = Column(Integer, ForeignKey('sourcedocument.id', ondelete="CASCADE"), index=True)
    source_document: "SourceDocumentORM" = relationship("SourceDocumentORM", back_populates="metadata_")
