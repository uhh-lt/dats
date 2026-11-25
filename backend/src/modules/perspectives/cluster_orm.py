from typing import TYPE_CHECKING

from sqlalchemy import (
    ARRAY,
    Boolean,
    Float,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from repos.db.orm_base import ORMBase

if TYPE_CHECKING:
    from core.doc.source_document_orm import SourceDocumentORM
    from modules.perspectives.aspect_orm import AspectORM
    from modules.perspectives.document_cluster_orm import DocumentClusterORM


class ClusterORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    is_outlier: Mapped[bool] = mapped_column(Boolean, nullable=False)
    is_user_edited: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    name: Mapped[str | None] = mapped_column(String)
    description: Mapped[str | None] = mapped_column(Text)
    top_words: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    top_word_scores: Mapped[list[float] | None] = mapped_column(ARRAY(Float))
    level: Mapped[int] = mapped_column(Integer)
    top_docs: Mapped[list[int] | None] = mapped_column(ARRAY(Integer))

    # 2D coordinates for visualization
    x: Mapped[float | None] = mapped_column(Float)
    y: Mapped[float | None] = mapped_column(Float)

    # hierarchy reference
    parent_cluster_id: Mapped[int | None] = mapped_column(Integer, index=True)
    parent_cluster: Mapped["ClusterORM | None"] = relationship(
        "ClusterORM",
        remote_side=[id],
        back_populates="child_clusters",
        foreign_keys=[parent_cluster_id],
    )
    child_clusters: Mapped[list["ClusterORM"]] = relationship(
        "ClusterORM",
        back_populates="parent_cluster",
        foreign_keys=[parent_cluster_id],
    )

    # many to one
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    aspect_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    aspect: Mapped["AspectORM"] = relationship(
        "AspectORM", back_populates="clusters", foreign_keys=[aspect_id]
    )

    # many to many
    document_clusters: Mapped[list["DocumentClusterORM"]] = relationship(
        "DocumentClusterORM",
        back_populates="cluster",
        cascade="all, delete-orphan",
        passive_deletes=True,
        foreign_keys="DocumentClusterORM.cluster_id",
    )
    source_documents: Mapped[list["SourceDocumentORM"]] = relationship(
        "SourceDocumentORM",
        secondary="documentcluster",
        back_populates="clusters",
        viewonly=True,
    )

    __table_args__ = (
        UniqueConstraint("project_id", "id", name="UC_cluster_project_id_id"),
        ForeignKeyConstraint(
            ["project_id", "aspect_id"],
            ["aspect.project_id", "aspect.id"],
            ondelete="CASCADE",
            name="FK_cluster_aspect_id",
        ),
        ForeignKeyConstraint(
            ["project_id", "parent_cluster_id"],
            ["cluster.project_id", "cluster.id"],
            ondelete="SET NULL (parent_cluster_id)",
            name="FK_cluster_parent_cluster_id",
        ),
    )

    def __repr__(self) -> str:
        return f"<ClusterORM(id={self.id}, name='{self.name}')>"

    def get_project_id(self) -> int:
        return self.project_id
