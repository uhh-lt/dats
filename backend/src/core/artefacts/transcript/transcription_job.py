from io import BytesIO
from pathlib import Path

import ffmpeg
from loguru import logger

from common.doc_type_enum import DocType
from common.languages_enum import Language
from core.artefacts.audio.audio_artefact import AUDIO, audio_stream_path
from core.artefacts.raw_html.raw_html_artefact import RAW_HTML
from core.artefacts.transcript.transcript_artefact import TRANSCRIPT
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_data_dto import (
    SourceDocumentDataUpdate,
)
from core.doc.source_document_dto import SourceDocumentRead
from repos.db.sql_repo import SQLRepo
from repos.ray.ray_repo import RayRepo
from systems.artefact_system.artefact_dto import SdocProcessingJobInput
from systems.artefact_system.pipeline_step_decorator import pipeline_step
from systems.job_system.job_dto import Job, JobOutputBase
from systems.job_system.job_register_decorator import register_job

ray = RayRepo()
sqlr = SQLRepo()


class TranscriptionJobInput(SdocProcessingJobInput):
    doctype: DocType
    filename: str


class TranscriptionJobOutput(JobOutputBase):
    word_starts: list[int]
    word_ends: list[int]
    word_time_starts: list[int]
    word_time_ends: list[int]
    content: str
    raw_html: str
    language: str
    language_probability: float


def enrich_for_recompute(
    payload: SdocProcessingJobInput,
) -> TranscriptionJobInput:
    with sqlr.transaction() as db:
        sdoc = SourceDocumentRead.model_validate(
            crud_sdoc.read(db=db, id=payload.sdoc_id)
        )
        assert sdoc.doctype in {DocType.audio, DocType.video}, (
            f"SourceDocument with {payload.sdoc_id=} is not an audio or video file!"
        )

    # of a video, the audio stream extracted by the video_audio_extraction step
    assert audio_stream_path(
        project_id=sdoc.project_id,
        sdoc_id=sdoc.id,
        doctype=sdoc.doctype,
        filename=sdoc.filename,
    ).exists(), f"The audio stream of SourceDocument {sdoc.id} does not exist!"

    return TranscriptionJobInput(
        **payload.model_dump(), doctype=sdoc.doctype, filename=sdoc.filename
    )


@pipeline_step(
    requires={AUDIO},
    produces={TRANSCRIPT, RAW_HTML},
    doctypes={DocType.audio, DocType.video},
)
@register_job(
    job_type="transcription",
    input_type=TranscriptionJobInput,
    output_type=TranscriptionJobOutput,
    device="api",
    enricher=enrich_for_recompute,
)
def handle_transcription_job(
    payload: TranscriptionJobInput, job: Job
) -> TranscriptionJobOutput:
    # convert audio file to uncompessed PCM format
    audio_path = audio_stream_path(
        project_id=payload.project_id,
        sdoc_id=payload.sdoc_id,
        doctype=payload.doctype,
        filename=payload.filename,
    )
    pcm_bytes = convert_to_pcm(audio_path)

    # generate transcription using ray
    transcription = generate_automatic_transcription(
        payload=payload, audio_bytes=pcm_bytes
    )

    # store the words of the transcript and its text as raw HTML, from which the
    # step text_extraction writes the content the word offsets point into
    with sqlr.transaction() as db:
        TRANSCRIPT.store.write(
            db=db,
            sdoc_id=payload.sdoc_id,
            update=SourceDocumentDataUpdate(
                transcript_word_starts=transcription["word_starts"],
                transcript_word_ends=transcription["word_ends"],
                transcript_word_time_starts=transcription["word_time_starts"],
                transcript_word_time_ends=transcription["word_time_ends"],
            ),
        )
        RAW_HTML.store.write(
            db=db,
            sdoc_id=payload.sdoc_id,
            update=SourceDocumentDataUpdate(raw_html=transcription["html"]),
        )

    return TranscriptionJobOutput(
        word_starts=transcription["word_starts"],
        word_ends=transcription["word_ends"],
        word_time_starts=transcription["word_time_starts"],
        word_time_ends=transcription["word_time_ends"],
        content=transcription["content"],
        raw_html=transcription["html"],
        language=transcription["language"],
        language_probability=transcription["language_probability"],
    )


def convert_to_pcm(filepath: Path):
    # Use ffmpeg to convert to PCM WAV and pipe output to memory
    out, _ = (
        ffmpeg.input(str(filepath))
        .output("pipe:", format="wav", acodec="pcm_s16le", ac=1, ar="16k")
        .run(capture_stdout=True, capture_stderr=True)
    )
    pcm_bytes = BytesIO(out)
    return pcm_bytes.getvalue()


def generate_automatic_transcription(
    payload: TranscriptionJobInput, audio_bytes
) -> dict:
    logger.debug("Generating automatic transcription ...")

    # send the audio bytes to the whisper model to get the transcript
    output = ray.whisper_transcribe(
        audio_bytes=audio_bytes,
        language=None
        if payload.settings.language == Language.auto
        else payload.settings.language,
    )
    logger.info(f"Generated transcript {output}")

    # the words with their offsets in the text and their times in one pass
    words: list[str] = []
    word_starts: list[int] = []
    word_ends: list[int] = []
    word_time_starts: list[int] = []
    word_time_ends: list[int] = []
    current_position = 0
    for segment in output.segments:
        for word in segment.words:
            text = word.text.strip()
            word_time_starts.append(word.start_ms)
            word_time_ends.append(word.end_ms)
            words.append(text)
            current_word_length = len(text)
            word_starts.append(current_position)
            word_ends.append(current_position + current_word_length)
            current_position += current_word_length + 1

    if len(words) == 0:
        # no spoken words detected: inform user by writing informative fake data
        logger.warning(
            f"Document {payload.sdoc_id} {payload.filename} seems to contain no spoken words. Using dummy text data."
        )
        words = ["File", "contains", "no", "spoken", "words"]
        word_starts = [0, 5, 14, 17, 24]
        word_ends = [4, 13, 16, 23, 29]
        word_time_starts = [0, 0, 0, 0, 0]
        word_time_ends = word_time_starts

    transcription = " ".join(words)

    return {
        "word_starts": word_starts,
        "word_ends": word_ends,
        "word_time_starts": word_time_starts,
        "word_time_ends": word_time_ends,
        "content": transcription,
        "html": f"<html><body><p>{transcription}</p></body></html>",
        "language": output.language,
        "language_probability": output.language_probability,
    }
