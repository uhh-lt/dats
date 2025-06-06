from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.data.orm.orm_base import ORMBase

if TYPE_CHECKING:
    from app.core.data.orm.document_tag import DocumentTagORM
    from app.core.data.orm.source_document import SourceDocumentORM


class DocumentTagRecommendationLinkORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    ml_job_id: Mapped[str] = mapped_column(String, index=True, nullable=True)
    prediction_score: Mapped[float] = mapped_column(Float, index=True, nullable=True)
    is_reviewed: Mapped[bool] = mapped_column(Boolean, index=True, nullable=True)

    # many to one
    source_document_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("sourcedocument.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    source_document: Mapped["SourceDocumentORM"] = relationship(
        "SourceDocumentORM", back_populates="document_tag_recommendation_link"
    )
    predicted_tag_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("documenttag.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    predicted_tag: Mapped["DocumentTagORM"] = relationship(
        "DocumentTagORM",
        back_populates="document_tag_recommendation_links",
    )
