from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.data.orm.orm_base import ORMBase

if TYPE_CHECKING:
    from app.core.data.orm.source_document import SourceDocumentORM


class WordFrequencyORM(ORMBase):
    sdoc_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("sourcedocument.id", ondelete="CASCADE"), primary_key=True
    )
    source_document: Mapped["SourceDocumentORM"] = relationship(
        "SourceDocumentORM", back_populates="word_frequencies"
    )

    word: Mapped[str] = mapped_column(String, primary_key=True)
    count: Mapped[int] = mapped_column(Integer)
