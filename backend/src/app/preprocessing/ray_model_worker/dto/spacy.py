from typing import List, Optional

from pydantic import BaseModel, Field


class SpacySpan(BaseModel):
    text: str = Field(description="The surface form of the span", example="Hamburg")
    start_char: int = Field(
        description="The start character index of the span in the input text", example=7
    )
    end_char: int = Field(
        description="The end character index of the span in the input text", example=14
    )
    start_token: int = Field(
        description="The start token index of the span in the input text", example=1
    )
    end_token: int = Field(
        description="The end token index of the span in the input text", example=2
    )
    label: Optional[str] = Field(
        description="The optional label of the span", example="GPE", default=None
    )


class SpacyToken(BaseModel):
    text: str = Field(description="The surface form of the token", example="Hamburg")
    start_char: int = Field(
        description="The start character index of the token in the input text",
        example=7,
    )
    end_char: int = Field(
        description="The end character index of the token in the input text", example=14
    )
    pos: str = Field(description="The part-of-speech tag of the token", example="PROPN")
    lemma: str = Field(description="The lemma of the token", example="Hamburg")
    stopword: bool = Field(description="Whether the token is a stopword", example=False)
    punctuation: bool = Field(
        description="Whether the token is a punctuation", example=False
    )
    alpha: bool = Field(
        description="Whether the token is an alphabetic character", example=True
    )
    digit: bool = Field(description="Whether the token is a digit", example=False)


class SpacyInput(BaseModel):
    text: str = Field(example="I love Hamburg!")
    language: str = Field(example="en")


class SpacyPipelineOutput(BaseModel):
    tokens: Optional[List[SpacyToken]] = Field(
        example=[
            SpacyToken(
                text="I",
                start_char=0,
                end_char=1,
                pos="PRON",
                lemma="I",
                stopword=True,
                punctuation=False,
                alpha=True,
                digit=False,
            ),
            SpacyToken(
                text="love",
                start_char=2,
                end_char=6,
                pos="VERB",
                lemma="love",
                stopword=False,
                punctuation=False,
                alpha=True,
                digit=False,
            ),
            SpacyToken(
                text="Hamburg",
                start_char=7,
                end_char=14,
                pos="PROPN",
                lemma="Hamburg",
                stopword=False,
                punctuation=False,
                alpha=True,
                digit=False,
            ),
            SpacyToken(
                text="!",
                start_char=14,
                end_char=15,
                pos="PUNCT",
                lemma="!",
                stopword=False,
                punctuation=True,
                alpha=False,
                digit=False,
            ),
        ],
        default_factory=list,
    )

    ents: Optional[List[SpacySpan]] = Field(
        example=[
            SpacySpan(
                label="GPE",
                text="Hamburg",
                start_char=7,
                end_char=14,
                start_token=1,
                end_token=2,
            )
        ],
        default_factory=list,
    )

    sents: Optional[List[SpacySpan]] = Field(
        example=[
            SpacySpan(
                text="I love Hamburg!",
                start_char=0,
                end_char=15,
                start_token=0,
                end_token=3,
            )
        ],
        default_factory=list,
    )
