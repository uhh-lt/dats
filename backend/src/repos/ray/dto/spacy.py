from pydantic import BaseModel, Field


class SpacySpan(BaseModel):
    text: str = Field(description="The surface form of the span", examples=["Hamburg"])
    start_char: int = Field(
        description="The start character index of the span in the input text",
        examples=[7],
    )
    end_char: int = Field(
        description="The end character index of the span in the input text",
        examples=[14],
    )
    start_token: int = Field(
        description="The start token index of the span in the input text", examples=[1]
    )
    end_token: int = Field(
        description="The end token index of the span in the input text", examples=[2]
    )
    label: str | None = Field(
        description="The optional label of the span", examples=["GPE"], default=None
    )


class SpacyToken(BaseModel):
    text: str = Field(description="The surface form of the token", examples=["Hamburg"])
    start_char: int = Field(
        description="The start character index of the token in the input text",
        examples=[7],
    )
    end_char: int = Field(
        description="The end character index of the token in the input text",
        examples=[14],
    )
    pos: str = Field(
        description="The part-of-speech tag of the token", examples=["PROPN"]
    )
    lemma: str = Field(description="The lemma of the token", examples=["Hamburg"])
    is_stopword: bool = Field(
        description="Whether the token is a stopword", examples=[False]
    )
    is_punctuation: bool = Field(
        description="Whether the token is a punctuation", examples=[False]
    )
    is_alpha: bool = Field(
        description="Whether the token is an alphabetic character", examples=[True]
    )
    is_digit: bool = Field(description="Whether the token is a digit", examples=[False])


class SpacyInput(BaseModel):
    text: str = Field(examples=["I love Hamburg!"])
    language: str = Field(examples=["en"])


class SpacyPipelineOutput(BaseModel):
    tokens: list[SpacyToken] = Field(
        examples=[
            SpacyToken(
                text="I",
                start_char=0,
                end_char=1,
                pos="PRON",
                lemma="I",
                is_stopword=True,
                is_punctuation=False,
                is_alpha=True,
                is_digit=False,
            ),
            SpacyToken(
                text="love",
                start_char=2,
                end_char=6,
                pos="VERB",
                lemma="love",
                is_stopword=False,
                is_punctuation=False,
                is_alpha=True,
                is_digit=False,
            ),
            SpacyToken(
                text="Hamburg",
                start_char=7,
                end_char=14,
                pos="PROPN",
                lemma="Hamburg",
                is_stopword=False,
                is_punctuation=False,
                is_alpha=True,
                is_digit=False,
            ),
            SpacyToken(
                text="!",
                start_char=14,
                end_char=15,
                pos="PUNCT",
                lemma="!",
                is_stopword=False,
                is_punctuation=True,
                is_alpha=False,
                is_digit=False,
            ),
        ],
        default_factory=list,
    )

    ents: list[SpacySpan] = Field(
        examples=[
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

    sents: list[SpacySpan] = Field(
        examples=[
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
