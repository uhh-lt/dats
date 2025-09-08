from pydantic import BaseModel, Field


class WordTranscription(BaseModel):
    start_ms: int = Field(
        description="The start time of the word in milliseconds.", examples=[0]
    )
    end_ms: int = Field(
        description="The end time of the word in milliseconds.", examples=[1000]
    )
    text: str = Field(
        description="The surface form of the transcriped word.", examples=["word"]
    )


class SegmentTranscription(BaseModel):
    start_ms: int = Field(
        description="The start time of the word in milliseconds.", examples=[0]
    )
    end_ms: int = Field(
        description="The end time of the word in milliseconds.", examples=[1000]
    )
    words: list[WordTranscription] = Field(
        description="The words of the transcription segment.",
        examples=[{"text": "word", "start_ms": 0, "end_ms": 1000}],
        default_factory=list,
    )


class WhisperTranscriptionOutput(BaseModel):
    segments: list[SegmentTranscription] = Field(
        description="The transcription of the audio file.",
        examples=[
            {
                "start_ms": 0,
                "end_ms": 1000,
                "words": [
                    {
                        "text": "word",
                        "start_ms": 0,
                        "end_ms": 1000,
                    }
                ],
            }
        ],
    )
    language: str = Field(
        description="Detected language of the audio file", examples=["de", "en"]
    )
    language_probability: float = Field(
        description="Probability of the detected language", examples=[0.99, 0.8]
    )
