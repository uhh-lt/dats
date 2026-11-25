from typing import TYPE_CHECKING

from sqlalchemy import (
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
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
        index=True,
    )
    sdoc_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    source_document: Mapped["SourceDocumentORM"] = relationship(
        "SourceDocumentORM", back_populates="word_frequencies", foreign_keys=[sdoc_id]
    )

    word: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    count: Mapped[int] = mapped_column(Integer, index=True)

    __table_args__ = (
        ForeignKeyConstraint(
            ["project_id", "sdoc_id"],
            ["sourcedocument.project_id", "sourcedocument.id"],
            ondelete="CASCADE",
            name="FK_wordfrequency_sdoc_id",
        ),
    )

    def get_project_id(self) -> int:
        return self.project_id
