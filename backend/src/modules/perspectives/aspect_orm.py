from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from repos.db.orm_base import ORMBase

if TYPE_CHECKING:
    from core.doc.source_document_orm import SourceDocumentORM
    from core.project.project_orm import ProjectORM
    from modules.perspectives.cluster_orm import ClusterORM
    from modules.perspectives.document_aspect_orm import DocumentAspectORM


class AspectORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    name: Mapped[str] = mapped_column(String, nullable=False)
    doc_embedding_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    doc_modification_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_hierarchical: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    most_recent_job_id: Mapped[str | None] = mapped_column(String, nullable=True)
    embedding_model: Mapped[str] = mapped_column(
        String, server_default="default", nullable=False
    )

    # many to one
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project: Mapped["ProjectORM"] = relationship("ProjectORM", back_populates="aspects")

    # one to many
    clusters: Mapped[list["ClusterORM"]] = relationship(
        "ClusterORM", back_populates="aspect", cascade="all, delete-orphan"
    )

    # many to many
    document_aspects: Mapped[list["DocumentAspectORM"]] = relationship(
        "DocumentAspectORM", back_populates="aspect", cascade="all, delete-orphan"
    )
    source_documents: Mapped[list["SourceDocumentORM"]] = relationship(
        "SourceDocumentORM",
        secondary="documentaspect",
        back_populates="aspects",
        overlaps="document_aspects,source_document,aspect",
    )

    def __repr__(self) -> str:
        return f"<AspectORM(id={self.id}, name='{self.name}')>"

    def get_project_id(self) -> int:
        return self.project_id
