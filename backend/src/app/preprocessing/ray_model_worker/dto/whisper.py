from typing import List

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
    words: List[WordTranscription] = Field(
        description="The words of the transcription segment.",
        examples=[{"text": "word", "start_ms": 0, "end_ms": 1000}],
        default_factory=list,
    )


class WhisperFilePathInput(BaseModel):
    uncompressed_audio_fp: str = Field(examples=["/path/to/uncompressed/audio.wav"])


class WhisperTranscriptionOutput(BaseModel):
    segments: List[SegmentTranscription] = Field(
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
