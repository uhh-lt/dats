from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Float, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from repos.db.orm_base import ORMBase

if TYPE_CHECKING:
    from core.doc.source_document_orm import SourceDocumentORM
    from modules.perspectives.cluster_orm import ClusterORM


class DocumentClusterORM(ORMBase):
    sdoc_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("sourcedocument.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )
    cluster_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("cluster.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )

    similarity: Mapped[float] = mapped_column(Float, nullable=True)
    is_accepted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # many to many
    source_document: Mapped["SourceDocumentORM"] = relationship(
        "SourceDocumentORM",
        back_populates="document_clusters",
    )
    cluster: Mapped["ClusterORM"] = relationship(
        "ClusterORM",
        back_populates="document_clusters",
    )

    def __repr__(self) -> str:
        return f"<DocumentClusterORM(sdoc_id={self.sdoc_id}, cluster_id={self.cluster_id}, is_accepted={self.is_accepted})>"

    def get_project_id(self) -> int:
        return self.source_document.get_project_id()
