from typing import TYPE_CHECKING

from sqlalchemy import (
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


class WordFrequencyORM(ORMBase):
    # many to one
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
    )
    sdoc_id: Mapped[int] = mapped_column(Integer, index=True)
    source_document: Mapped["SourceDocumentORM"] = relationship(
        "SourceDocumentORM",
        back_populates="word_frequencies",
        primaryjoin="and_(SourceDocumentORM.project_id == WordFrequencyORM.project_id, SourceDocumentORM.id == foreign(WordFrequencyORM.sdoc_id))",
    )

    word: Mapped[str] = mapped_column(String, index=True)
    count: Mapped[int] = mapped_column(Integer, index=True)

    __table_args__ = (
        PrimaryKeyConstraint(
            "project_id", "sdoc_id", "word", name="wordfrequency_pkey"
        ),
        ForeignKeyConstraint(
            ["project_id", "sdoc_id"],
            ["sourcedocument.project_id", "sourcedocument.id"],
            ondelete="CASCADE",
            name="FK_wordfrequency_sdoc_id",
        ),
    )
