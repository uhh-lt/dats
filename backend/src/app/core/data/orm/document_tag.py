from typing import TYPE_CHECKING, List

from app.core.data.orm.orm_base import ORMBase
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

if TYPE_CHECKING:
    from app.core.data.orm.object_handle import ObjectHandleORM
    from app.core.data.orm.project import ProjectORM
    from app.core.data.orm.source_document import SourceDocumentORM


class DocumentTagORM(ORMBase):
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    description = Column(String, nullable=True, index=True)
    color = Column(String, nullable=True)
    created = Column(DateTime, server_default=func.now(), index=True)
    updated = Column(
        DateTime, server_default=func.now(), onupdate=func.current_timestamp()
    )

    # one to one
    object_handle: "ObjectHandleORM" = relationship(
        "ObjectHandleORM",
        uselist=False,
        back_populates="document_tag",
        passive_deletes=True,
    )

    # many to one
    project_id = Column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project: "ProjectORM" = relationship("ProjectORM", back_populates="document_tags")

    # many to many
    source_documents: List["SourceDocumentORM"] = relationship(
        "SourceDocumentORM",
        secondary="SourceDocumentDocumentTagLinkTable".lower(),
        back_populates="document_tags",
        passive_deletes=True,
    )


class SourceDocumentDocumentTagLinkTable(ORMBase):
    source_document_id = Column(
        Integer, ForeignKey("sourcedocument.id", ondelete="CASCADE"), primary_key=True
    )
    document_tag_id = Column(
        Integer, ForeignKey("documenttag.id", ondelete="CASCADE"), primary_key=True
    )
