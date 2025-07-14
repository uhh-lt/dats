from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.data.orm.orm_base import ORMBase

if TYPE_CHECKING:
    from app.core.data.orm.cluster import ClusterORM
    from app.core.data.orm.document_aspect import DocumentAspectORM
    from app.core.data.orm.project import ProjectORM
    from app.core.data.orm.source_document import SourceDocumentORM


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
