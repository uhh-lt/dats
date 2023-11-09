from typing import List

from pydantic import BaseModel, Field


class SourceDocumentDataBase(BaseModel):
    id: int = Field(description="ID of the SourceDocument")
    content: str = Field(description="Raw,original content of the SourceDocument")
    html: str = Field(description="Processed HTML of the SourceDocument")
    token_starts: List[int] = Field(
        description="Start of each token in character offsets in content"
    )
    token_ends: List[int] = Field(
        description="End of each token in character offsets in content"
    )
    sentence_starts: List[int] = Field(
        description="Start of each sentence in character offsets in content"
    )
    sentence_ends: List[int] = Field(
        description="End of each sentence in character offsets in content"
    )


class SourceDocumentDataRead(SourceDocumentDataBase):
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


# Properties for creation
class SourceDocumentDataCreate(SourceDocumentDataBase):
    pass
