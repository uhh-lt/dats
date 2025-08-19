from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from repos.db.orm_base import ORMBase

if TYPE_CHECKING:
    from core.doc.source_document_orm import SourceDocumentORM


class WordFrequencyORM(ORMBase):
    sdoc_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("sourcedocument.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )
    source_document: Mapped["SourceDocumentORM"] = relationship(
        "SourceDocumentORM", back_populates="word_frequencies"
    )

    word: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    count: Mapped[int] = mapped_column(Integer, index=True)

    def get_project_id(self) -> int:
        return self.source_document.get_project_id()
