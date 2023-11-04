from typing import TYPE_CHECKING, List

from app.core.data.orm.orm_base import ORMBase
from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship

if TYPE_CHECKING:
    from app.core.data.orm.project import ProjectORM
    from app.core.data.orm.source_document_metadata import SourceDocumentMetadataORM


class ProjectMetadataORM(ORMBase):
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, nullable=False, index=False)
    metatype = Column(String, nullable=False, index=False)
    read_only = Column(Boolean, nullable=False, index=False)
    doctype = Column(String, nullable=False, index=False)

    # one to many
    sdoc_metadata: List["SourceDocumentMetadataORM"] = relationship(
        "SourceDocumentMetadataORM",
        back_populates="project_metadata",
        passive_deletes=True,
    )

    # many to one
    project_id = Column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project: "ProjectORM" = relationship("ProjectORM", back_populates="metadata_")

    __table_args__ = (
        UniqueConstraint(
            "project_id",
            "key",
            "doctype",
            name="UC_unique_metadata_key_doctype_per_project",
        ),
    )
