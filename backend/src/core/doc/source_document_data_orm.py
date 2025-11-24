from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.doc.source_document_data_dto import WordLevelTranscription
from repos.db.orm_base import ORMBase

if TYPE_CHECKING:
    from core.doc.source_document_orm import SourceDocumentORM


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
    raw_html: Mapped[str] = mapped_column(String, nullable=False, index=False)
    html: Mapped[str] = mapped_column(String, nullable=False, index=False)
    repo_url: Mapped[str] = mapped_column(String, nullable=False, index=False)
    token_starts: Mapped[list[int]] = mapped_column(
        ARRAY(Integer), nullable=False, index=False
    )
    token_ends: Mapped[list[int]] = mapped_column(
        ARRAY(Integer), nullable=False, index=False
    )
    sentence_starts: Mapped[list[int]] = mapped_column(
        ARRAY(Integer), nullable=False, index=False
    )
    sentence_ends: Mapped[list[int]] = mapped_column(
        ARRAY(Integer), nullable=False, index=False
    )
    token_time_starts: Mapped[list[int]] = mapped_column(
        ARRAY(Integer), nullable=True, index=False
    )
    token_time_ends: Mapped[list[int]] = mapped_column(
        ARRAY(Integer), nullable=True, index=False
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

    @property
    def sentence_token_starts(self):
        char2tok = {c: i for i, c in enumerate(self.token_starts)}
        return [char2tok[s] for s in self.sentence_starts]

    @property
    def sentence_token_ends(self):
        char2tok = {c: i for i, c in enumerate(self.token_ends)}
        return [char2tok[e] for e in self.sentence_ends]

    @property
    def tokenized_sentences(self):
        tokens = self.tokens
        return [
            tokens[s : e + 1]
            for s, e in zip(self.sentence_token_starts, self.sentence_token_ends)
        ]

    @property
    def word_level_transcriptions(self) -> list[WordLevelTranscription] | None:
        print(self.token_time_starts)
        print(self.token_time_ends)
        if self.token_time_starts is None or self.token_time_ends is None:
            return None
        else:
            assert (
                len(self.tokens)
                == len(self.token_time_starts)
                == len(self.token_time_ends)
            )
            result = []
            for t, s, e in zip(
                self.tokens, self.token_time_starts, self.token_time_ends
            ):
                result.append(WordLevelTranscription(text=t, start_ms=s, end_ms=e))
            return result

    @property
    def token_sentence_ids(self):
        """returns a list with the sentence id of every token, e.g. [0,0,0,1,1,1,1,2]"""
        sentence_ids = []
        current_sent = 0
        current_sent_end = self.sentence_ends[current_sent]
        for c in self.token_starts:
            if c >= current_sent_end:
                current_sent += 1
                current_sent_end = self.sentence_ends[current_sent]
            sentence_ids.append(current_sent)
        return sentence_ids

    def get_project_id(self) -> int:
        return self.project_id
