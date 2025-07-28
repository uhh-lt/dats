from typing import TYPE_CHECKING, List, Optional

from repos.db.orm_base import ORMBase
from sqlalchemy import ARRAY, Boolean, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from core.doc.source_document_orm import SourceDocumentORM
    from modules.perspectives.aspect_orm import AspectORM
    from modules.perspectives.document_cluster_orm import DocumentClusterORM


class ClusterORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    is_outlier: Mapped[bool] = mapped_column(Boolean, nullable=False)
    name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    top_words: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True)
    top_word_scores: Mapped[Optional[List[float]]] = mapped_column(
        ARRAY(Float), nullable=True
    )
    level: Mapped[int] = mapped_column(Integer)
    top_docs: Mapped[Optional[List[int]]] = mapped_column(ARRAY(Integer), nullable=True)

    # 2D coordinates for visualization
    x: Mapped[float] = mapped_column(Float, nullable=True)
    y: Mapped[float] = mapped_column(Float, nullable=True)

    # many to one
    parent_cluster_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("cluster.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    parent_cluster: Mapped[Optional["ClusterORM"]] = relationship(
        "ClusterORM", remote_side=[id], back_populates="child_clusters"
    )
    child_clusters: Mapped[List["ClusterORM"]] = relationship(
        "ClusterORM", back_populates="parent_cluster"
    )

    aspect_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("aspect.id", ondelete="CASCADE"), nullable=False, index=True
    )
    aspect: Mapped["AspectORM"] = relationship("AspectORM", back_populates="clusters")

    # many to many
    document_clusters: Mapped[List["DocumentClusterORM"]] = relationship(
        "DocumentClusterORM", back_populates="cluster", cascade="all, delete-orphan"
    )
    source_documents: Mapped[List["SourceDocumentORM"]] = relationship(
        "SourceDocumentORM",
        secondary="documentcluster",
        back_populates="clusters",
        overlaps="document_clusters,source_document,cluster",
    )

    def __repr__(self) -> str:
        return f"<ClusterORM(id={self.id}, name='{self.name}')>"

    def get_project_id(self) -> int:
        return self.aspect.get_project_id()
