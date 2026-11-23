import pytest
import rq.job
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from common.languages_enum import Language
from core.artefacts.transcript.transcription_job import (
    TranscriptionJobInput,
    TranscriptionJobOutput,
    handle_transcription_job,
)
from core.doc.source_document_data_dto import (
    SourceDocumentDataRead,
    WordLevelTranscription,
)
from pipeline_test_utils import artefact_named
from repos.ray.dto.whisper import (
    SegmentTranscription,
    WhisperTranscriptionOutput,
    WordTranscription,
)
from repos.ray.ray_repo import RayRepo
from systems.artefact_system.artefact_dto import (
    ProcessingSettings,
    SdocProcessingJobInput,
)
from systems.job_system.job_dto import Job
from systems.job_system.job_service import JobService
from text_steps_test_utils import run_step_handler, spacy_output

from .conftest import AudioProject

SETTINGS = ProcessingSettings(
    extract_images=False,
    pages_per_chunk=1,
    language=Language.auto,
    model="default",
)

# Whisper hears "Hello" (0-400 ms) and "world." (500-900 ms)
HELLO_WORLD = WhisperTranscriptionOutput(
    segments=[
        SegmentTranscription(
            start_ms=0,
            end_ms=900,
            words=[
                WordTranscription(text=" Hello", start_ms=0, end_ms=400),
                WordTranscription(text=" world.", start_ms=500, end_ms=900),
            ],
        )
    ],
    language="en",
    language_probability=0.9,
)

# ===========================================================================
# AUDIO TRANSCRIPTION JOB (core/artefacts/transcript/transcription_job) TESTS
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
            doctype=DocType.audio,
            filename=audio_project["audio_document"].filename,
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
    db_session: Session,
    audio_project: AudioProject,
    monkeypatch: pytest.MonkeyPatch,
):
    """The job returns the transcript with its word offsets and timings, and
    stores the words as the transcript and the text as raw HTML; the content
    and the tokens are left to their own steps.

    Regression test: the job read its output from the updated ORM object after
    the transaction was closed (DetachedInstanceError).
    """
    sdoc_id = audio_project["audio_document"].id
    output = _run_transcription(audio_project, monkeypatch, HELLO_WORLD)

    assert output.content == "Hello world."
    assert output.raw_html == "<html><body><p>Hello world.</p></body></html>"
    assert output.word_starts == [0, 6]
    assert output.word_ends == [5, 12]
    assert output.word_time_starts == [0, 500]
    assert output.word_time_ends == [400, 900]
    assert output.language == "en"
    assert output.language_probability == 0.9

    db_session.expire_all()
    data = artefact_named("transcript").store.read(db=db_session, sdoc_id=sdoc_id)
    assert (
        data.transcript_word_starts,
        data.transcript_word_ends,
        data.transcript_word_time_starts,
        data.transcript_word_time_ends,
    ) == ([0, 6], [5, 12], [0, 500], [400, 900])
    assert data.raw_html == "<html><body><p>Hello world.</p></body></html>"
    assert (data.content, data.token_starts) == ("", [])


def test_tokens_of_a_transcript_are_its_words_with_their_times(
    client: TestClient,
    audio_project: AudioProject,
    monkeypatch: pytest.MonkeyPatch,
):
    """After the transcription, text_extraction and tokens_sentences, the tokens
    of the audio are the words of its transcript, not the tokens of spaCy (which
    splits off the "."), so each token has the time of its word."""
    sdoc_id = audio_project["audio_document"].id
    output = _run_transcription(audio_project, monkeypatch, HELLO_WORLD)
    run_step_handler(
        "text_extraction",
        {
            "project_id": audio_project["project"].id,
            "sdoc_id": sdoc_id,
            "settings": SETTINGS,
            "raw_html": output.raw_html,
            "filename": "silence.wav",
            "doctype": DocType.audio,
        },
    )
    monkeypatch.setattr(
        RayRepo,
        "spacy_pipline",
        lambda self, spacy_input: spacy_output(spacy_input.text, {}),
    )
    registered = JobService().job_registry["tokens_sentences"]
    enricher = registered["enricher"]
    assert enricher is not None
    payload = enricher(
        SdocProcessingJobInput(
            project_id=audio_project["project"].id,
            sdoc_id=sdoc_id,
            settings=SETTINGS,
        )
    )
    registered["handler"](
        payload,
        Job(
            rq.job.Job.create(registered["handler"], connection=JobService().redis_conn)
        ),
    )

    response = client.get(f"/sdoc/data/{sdoc_id}")
    assert response.status_code == 200, response.text
    data = SourceDocumentDataRead.model_validate(response.json())
    assert data.tokens == ["Hello", "world."]
    assert data.word_level_transcriptions == [
        WordLevelTranscription(text="Hello", start_ms=0, end_ms=400),
        WordLevelTranscription(text="world.", start_ms=500, end_ms=900),
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
    assert output.word_starts == [0, 5, 14, 17, 24]
    assert output.word_ends == [4, 13, 16, 23, 29]
    assert output.word_time_starts == [0, 0, 0, 0, 0]
    assert output.word_time_ends == [0, 0, 0, 0, 0]
