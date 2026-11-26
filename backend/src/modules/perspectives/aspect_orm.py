from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    Boolean,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    PrimaryKeyConstraint,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from repos.db.orm_base import ORMBase

if TYPE_CHECKING:
    from core.doc.source_document_orm import SourceDocumentORM
    from core.project.project_orm import ProjectORM
    from core.tag.tag_orm import TagORM
    from modules.perspectives.cluster_orm import ClusterORM
    from modules.perspectives.document_aspect_orm import DocumentAspectORM


class AspectORM(ORMBase):
    # the primary key is (project_id, id), see __table_args__
    id: Mapped[int] = mapped_column(Integer, autoincrement=True, index=True)

    name: Mapped[str] = mapped_column(String, nullable=False)
    doc_embedding_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    doc_modification_prompt: Mapped[str | None] = mapped_column(Text)
    is_hierarchical: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    most_recent_job_id: Mapped[str | None] = mapped_column(String)
    embedding_model: Mapped[str] = mapped_column(
        String, server_default="default", nullable=False
    )
    modality: Mapped[str] = mapped_column(String, nullable=False, server_default="text")
    pipeline_settings: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )

    # many to one
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
    )
    project: Mapped["ProjectORM"] = relationship("ProjectORM", back_populates="aspects")

    tag_id: Mapped[int | None] = mapped_column(Integer, index=True)
    tag: Mapped["TagORM | None"] = relationship(
        "TagORM",
        primaryjoin="and_(TagORM.project_id == AspectORM.project_id, TagORM.id == foreign(AspectORM.tag_id))",
    )

    # one to many
    clusters: Mapped[list["ClusterORM"]] = relationship(
        "ClusterORM",
        back_populates="aspect",
        cascade="all, delete-orphan",
        passive_deletes=True,
        primaryjoin="and_(AspectORM.project_id == ClusterORM.project_id, AspectORM.id == foreign(ClusterORM.aspect_id))",
    )

    # many to many
    document_aspects: Mapped[list["DocumentAspectORM"]] = relationship(
        "DocumentAspectORM",
        back_populates="aspect",
        cascade="all, delete-orphan",
        passive_deletes=True,
        primaryjoin="and_(AspectORM.project_id == DocumentAspectORM.project_id, AspectORM.id == foreign(DocumentAspectORM.aspect_id))",
    )
    source_documents: Mapped[list["SourceDocumentORM"]] = relationship(
        "SourceDocumentORM",
        secondary="documentaspect",
        back_populates="aspects",
        viewonly=True,
    )

    __table_args__ = (
        PrimaryKeyConstraint("project_id", "id", name="aspect_pkey"),
        ForeignKeyConstraint(
            ["project_id", "tag_id"],
            ["tag.project_id", "tag.id"],
            ondelete="CASCADE",
            name="FK_aspect_tag_id",
        ),
    )

    def __repr__(self) -> str:
        return f"<AspectORM(id={self.id}, name='{self.name}')>"
