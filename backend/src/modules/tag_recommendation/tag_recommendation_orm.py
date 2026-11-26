from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    Float,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    PrimaryKeyConstraint,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from repos.db.orm_base import ORMBase

if TYPE_CHECKING:
    from core.doc.source_document_orm import SourceDocumentORM
    from core.tag.tag_orm import TagORM


class TagRecommendationLinkORM(ORMBase):
    # the primary key is (project_id, id), see __table_args__
    id: Mapped[int] = mapped_column(Integer, autoincrement=True, index=True)
    # the id of the tag recommendation job (named before it became a job of its own)
    ml_job_id: Mapped[str | None] = mapped_column(String, index=True)
    prediction_score: Mapped[float | None] = mapped_column(Float, index=True)
    is_reviewed: Mapped[bool | None] = mapped_column(Boolean, index=True)

    # many to one
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
    )

    source_document_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    source_document: Mapped["SourceDocumentORM"] = relationship(
        "SourceDocumentORM",
        back_populates="tag_recommendation_link",
        foreign_keys=[source_document_id],
    )

    predicted_tag_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    predicted_tag: Mapped["TagORM"] = relationship(
        "TagORM",
        back_populates="tag_recommendation_links",
        foreign_keys=[predicted_tag_id],
    )

    __table_args__ = (
        PrimaryKeyConstraint("project_id", "id", name="tagrecommendationlink_pkey"),
        ForeignKeyConstraint(
            ["project_id", "source_document_id"],
            ["sourcedocument.project_id", "sourcedocument.id"],
            ondelete="CASCADE",
            name="FK_tagrecommendationlink_source_document_id",
        ),
        ForeignKeyConstraint(
            ["project_id", "predicted_tag_id"],
            ["tag.project_id", "tag.id"],
            ondelete="CASCADE",
            name="FK_tagrecommendationlink_predicted_tag_id",
        ),
    )
