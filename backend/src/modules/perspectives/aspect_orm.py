from typing import TYPE_CHECKING, List, Optional

from repos.db.orm_base import ORMBase
from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from core.doc.source_document_orm import SourceDocumentORM
    from core.project.project_orm import ProjectORM
    from modules.perspectives.cluster_orm import ClusterORM
    from modules.perspectives.document_aspect_orm import DocumentAspectORM


class AspectORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    name: Mapped[str] = mapped_column(String, nullable=False)
    doc_embedding_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    doc_modification_prompt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_hierarchical: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    most_recent_job_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
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
    clusters: Mapped[List["ClusterORM"]] = relationship(
        "ClusterORM", back_populates="aspect", cascade="all, delete-orphan"
    )

    # many to many
    document_aspects: Mapped[List["DocumentAspectORM"]] = relationship(
        "DocumentAspectORM", back_populates="aspect", cascade="all, delete-orphan"
    )
    source_documents: Mapped[List["SourceDocumentORM"]] = relationship(
        "SourceDocumentORM",
        secondary="documentaspect",
        back_populates="aspects",
        overlaps="document_aspects,source_document,aspect",
    )

    def __repr__(self) -> str:
        return f"<AspectORM(id={self.id}, name='{self.name}')>"
