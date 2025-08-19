from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from repos.db.orm_base import ORMBase

if TYPE_CHECKING:
    from core.metadata.source_document_metadata_orm import SourceDocumentMetadataORM
    from core.project.project_orm import ProjectORM


class ProjectMetadataORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    key: Mapped[str] = mapped_column(String, nullable=False, index=False)
    metatype: Mapped[str] = mapped_column(String, nullable=False, index=False)
    read_only: Mapped[bool] = mapped_column(Boolean, nullable=False, index=False)
    doctype: Mapped[str] = mapped_column(String, nullable=False, index=False)
    description: Mapped[str] = mapped_column(String, nullable=False, index=False)

    # one to many
    sdoc_metadata: Mapped[list["SourceDocumentMetadataORM"]] = relationship(
        "SourceDocumentMetadataORM",
        back_populates="project_metadata",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    # many to one
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project: Mapped["ProjectORM"] = relationship(
        "ProjectORM", back_populates="metadata_"
    )

    __table_args__ = (
        UniqueConstraint(
            "project_id",
            "key",
            "doctype",
            name="UC_unique_metadata_key_doctype_per_project",
        ),
    )

    def get_project_id(self) -> int:
        return self.project_id
