from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    ForeignKey,
    Integer,
    PrimaryKeyConstraint,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from repos.db.orm_base import ORMBase

if TYPE_CHECKING:
    from core.metadata.source_document_metadata_orm import SourceDocumentMetadataORM
    from core.project.project_orm import ProjectORM


class ProjectMetadataORM(ORMBase):
    # the primary key is (project_id, id), see __table_args__
    id: Mapped[int] = mapped_column(Integer, autoincrement=True, index=True)
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
        foreign_keys="SourceDocumentMetadataORM.project_metadata_id",
    )

    # many to one
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
    )
    project: Mapped["ProjectORM"] = relationship(
        "ProjectORM", back_populates="metadata_"
    )

    __table_args__ = (
        PrimaryKeyConstraint("project_id", "id", name="projectmetadata_pkey"),
        UniqueConstraint(
            "project_id",
            "key",
            "doctype",
            name="UC_unique_metadata_key_doctype_per_project",
        ),
        UniqueConstraint("project_id", "id", name="UC_projectmetadata_project_id_id"),
    )
