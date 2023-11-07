from app.core.data.orm.orm_base import ORMBase
from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import ARRAY


class SourceDocumentDataORM(ORMBase):
    id = Column(
        Integer,
        ForeignKey("sourcedocument.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
        index=True,
    )
    content = Column(String, nullable=False, index=False)
    html = Column(String, nullable=False, index=False)
    token_starts = Column(ARRAY(Integer), nullable=False, index=False)
    token_ends = Column(ARRAY(Integer), nullable=False, index=False)
    sentence_starts = Column(ARRAY(Integer), nullable=False, index=False)
    sentence_ends = Column(ARRAY(Integer), nullable=False, index=False)

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
