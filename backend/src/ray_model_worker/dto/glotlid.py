from pydantic import BaseModel, Field


class DetectedLanguage(BaseModel):
    lang_code: str = Field(examples=["eng_Latn", "deu_Latn"])
    lang_name: str = Field(examples=["English", "German"])
    confidence: float = Field(examples=[0.9, 0.8])


class GlotLIDInput(BaseModel):
    text: str = Field(
        examples=["Some random text. E.g., the content of an SDoc or any other text."],
        description="The text for which the language should be detected.",
    )
    top_k: int = Field(
        default=3,
        examples=[3],
        description="The number of top languages to return.",
    )


class GlotLIDOutput(BaseModel):
    best_match: DetectedLanguage = Field(
        examples=[
            DetectedLanguage(lang_code="eng_Latn", lang_name="English", confidence=0.9)
        ]
    )
    detected_languages: list[DetectedLanguage] = Field(
        examples=[
            [
                DetectedLanguage(
                    lang_code="eng_Latn", lang_name="English", confidence=0.9
                ),
                DetectedLanguage(
                    lang_code="deu_Latn", lang_name="German", confidence=0.1
                ),
            ]
        ]
    )
