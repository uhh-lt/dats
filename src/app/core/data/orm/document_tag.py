from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

from app.core.data.orm.orm_base import ORMBase


class DocumentTagORM(ORMBase):
    id = Column(Integer, primary_key=True, index=True)
    value = Column(String, nullable=False, index=True)

    # one to one
    object_handle = relationship("ObjectHandleORM",
                                 uselist=False,
                                 back_populates="document_tag",
                                 cascade="all, delete",
                                 passive_deletes=True)

    # many to one
    project_id = Column(Integer, ForeignKey('project.id', ondelete="CASCADE"), index=True)
    project = relationship("ProjectORM", back_populates="document_tags")

    # many to many
    source_documents = relationship("SourceDocumentORM",
                                    secondary="SourceDocumentDocumentTagLinkTable".lower(),
                                    back_populates="document_tags")


class SourceDocumentDocumentTagLinkTable(ORMBase):
    source_document_id = Column(Integer, ForeignKey("sourcedocument.id"), primary_key=True)
    document_tag_id = Column(Integer, ForeignKey("documenttag.id"), primary_key=True)
