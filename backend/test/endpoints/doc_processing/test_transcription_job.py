from pathlib import Path

import pytest
import rq.job
from fastapi.testclient import TestClient

from common.languages_enum import Language
from core.doc.source_document_data_dto import (
    SourceDocumentDataRead,
    WordLevelTranscription,
)
from modules.doc_processing.audio.transcription_job import (
    TranscriptionJobInput,
    TranscriptionJobOutput,
    handle_transcription_job,
)
from modules.doc_processing.doc_processing_dto import ProcessingSettings
from repos.ray.dto.whisper import (
    SegmentTranscription,
    WhisperTranscriptionOutput,
    WordTranscription,
)
from repos.ray.ray_repo import RayRepo
from systems.job_system.job_dto import Job
from systems.job_system.job_service import JobService

from .conftest import AudioProject

SETTINGS = ProcessingSettings(
    extract_images=False,
    pages_per_chunk=1,
    keyword_number=5,
    keyword_deduplication_threshold=0.1,
    keyword_max_ngram_size=3,
    language=Language.auto,
    model="default",
)

# ===========================================================================
# AUDIO TRANSCRIPTION JOB (modules/doc_processing/audio/transcription_job) TESTS
# ===========================================================================
# The transcription runs as a background job of the document processing pipeline,
# so these tests call its handler directly. The Whisper model is an external
# service: the tests replace `RayRepo.whisper_transcribe` with a fixed transcript.


def _run_transcription(
    audio_project: AudioProject,
    monkeypatch: pytest.MonkeyPatch,
    whisper_output: WhisperTranscriptionOutput,
) -> TranscriptionJobOutput:
    """Run the transcription job on the audio document, with Whisper returning
    `whisper_output`."""
    monkeypatch.setattr(
        RayRepo,
        "whisper_transcribe",
        lambda self, audio_bytes, language=None: whisper_output,
    )
    output = handle_transcription_job(
        TranscriptionJobInput(
            project_id=audio_project["project"].id,
            sdoc_id=audio_project["audio_document"].id,
            settings=SETTINGS,
            filepath=Path(audio_project["audio_filepath"]),
        ),
        Job(
            rq.job.Job.create(
                handle_transcription_job, connection=JobService().redis_conn
            )
        ),
    )
    assert output is not None
    return output


def test_transcription_job_stores_and_returns_the_transcript(
    client: TestClient,
    audio_project: AudioProject,
    monkeypatch: pytest.MonkeyPatch,
):
    """The job returns the transcript with its token offsets and timings, and
    stores it as the data of the audio document.

    Regression test: the job read its output from the updated ORM object after
    the transaction was closed (DetachedInstanceError).
    """
    sdoc_id = audio_project["audio_document"].id

    output = _run_transcription(
        audio_project,
        monkeypatch,
        WhisperTranscriptionOutput(
            segments=[
                SegmentTranscription(
                    start_ms=0,
                    end_ms=900,
                    words=[
                        WordTranscription(text=" Hello", start_ms=0, end_ms=400),
                        WordTranscription(text=" world", start_ms=500, end_ms=900),
                    ],
                )
            ],
            language="en",
            language_probability=0.9,
        ),
    )

    assert output.content == "Hello world"
    assert output.raw_html == "<html><body><p>Hello world</p></body></html>"
    assert output.token_starts == [0, 6]
    assert output.token_ends == [5, 11]
    assert output.token_time_starts == [0, 500]
    assert output.token_time_ends == [400, 900]
    assert output.language == "en"
    assert output.language_probability == 0.9

    response = client.get(f"/sdoc/data/{sdoc_id}")
    assert response.status_code == 200, response.text
    data = SourceDocumentDataRead.model_validate(response.json())
    assert data.tokens == ["Hello", "world"]
    assert data.word_level_transcriptions == [
        WordLevelTranscription(text="Hello", start_ms=0, end_ms=400),
        WordLevelTranscription(text="world", start_ms=500, end_ms=900),
    ]


def test_transcription_job_writes_placeholder_text_for_audio_without_speech(
    audio_project: AudioProject,
    monkeypatch: pytest.MonkeyPatch,
):
    """When Whisper detects no words, the job stores a placeholder text whose
    tokens all have the timing 0."""
    output = _run_transcription(
        audio_project,
        monkeypatch,
        WhisperTranscriptionOutput(
            segments=[], language="en", language_probability=0.1
        ),
    )

    assert output.content == "File contains no spoken words"
    assert output.token_starts == [0, 5, 14, 17, 24]
    assert output.token_ends == [4, 13, 16, 23, 29]
    assert output.token_time_starts == [0, 0, 0, 0, 0]
    assert output.token_time_ends == [0, 0, 0, 0, 0]
