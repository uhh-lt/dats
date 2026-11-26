from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    Float,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    PrimaryKeyConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from repos.db.orm_base import ORMBase

if TYPE_CHECKING:
    from core.doc.source_document_orm import SourceDocumentORM
    from modules.perspectives.cluster_orm import ClusterORM


class DocumentClusterORM(ORMBase):
    sdoc_id: Mapped[int] = mapped_column(Integer, index=True)
    cluster_id: Mapped[int] = mapped_column(Integer, index=True)
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
    )

    similarity: Mapped[float | None] = mapped_column(Float)
    is_accepted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # many to one
    source_document: Mapped["SourceDocumentORM"] = relationship(
        "SourceDocumentORM",
        back_populates="document_clusters",
        primaryjoin="and_(SourceDocumentORM.project_id == DocumentClusterORM.project_id, SourceDocumentORM.id == foreign(DocumentClusterORM.sdoc_id))",
    )
    cluster: Mapped["ClusterORM"] = relationship(
        "ClusterORM",
        back_populates="document_clusters",
        primaryjoin="and_(ClusterORM.project_id == DocumentClusterORM.project_id, ClusterORM.id == foreign(DocumentClusterORM.cluster_id))",
    )

    __table_args__ = (
        PrimaryKeyConstraint(
            "project_id", "sdoc_id", "cluster_id", name="documentcluster_pkey"
        ),
        ForeignKeyConstraint(
            ["project_id", "sdoc_id"],
            ["sourcedocument.project_id", "sourcedocument.id"],
            ondelete="CASCADE",
            name="FK_documentcluster_sdoc_id",
        ),
        ForeignKeyConstraint(
            ["project_id", "cluster_id"],
            ["cluster.project_id", "cluster.id"],
            ondelete="CASCADE",
            name="FK_documentcluster_cluster_id",
        ),
    )

    def __repr__(self) -> str:
        return f"<DocumentClusterORM(sdoc_id={self.sdoc_id}, cluster_id={self.cluster_id}, is_accepted={self.is_accepted})>"
