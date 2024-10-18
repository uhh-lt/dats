from typing import TYPE_CHECKING, List

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.data.orm.orm_base import ORMBase

if TYPE_CHECKING:
    from app.core.data.orm.source_document import SourceDocumentORM


class SourceDocumentDataORM(ORMBase):
    id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("sourcedocument.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
        index=True,
    )
    source_document: Mapped["SourceDocumentORM"] = relationship(
        "SourceDocumentORM", back_populates="data"
    )
    content: Mapped[str] = mapped_column(String, nullable=False, index=False)
    html: Mapped[str] = mapped_column(String, nullable=False, index=False)
    token_starts: Mapped[List[int]] = mapped_column(
        ARRAY(Integer), nullable=False, index=False
    )
    token_ends: Mapped[List[int]] = mapped_column(
        ARRAY(Integer), nullable=False, index=False
    )
    sentence_starts: Mapped[List[int]] = mapped_column(
        ARRAY(Integer), nullable=False, index=False
    )
    sentence_ends: Mapped[List[int]] = mapped_column(
        ARRAY(Integer), nullable=False, index=False
    )

    @property
    def project_id(self) -> int:
        return self.source_document.project_id

    @property
    def tokens(self):
        return [self.content[s:e] for s, e in zip(self.token_starts, self.token_ends)]

    @property
    def token_character_offsets(self):
        return [(s, e) for s, e in zip(self.token_starts, self.token_ends)]

    @property
    def sentences(self):
        return [
            self.content[s:e] for s, e in zip(self.sentence_starts, self.sentence_ends)
        ]

    @property
    def sentence_character_offsets(self):
        return [(s, e) for s, e in zip(self.sentence_starts, self.sentence_ends)]
