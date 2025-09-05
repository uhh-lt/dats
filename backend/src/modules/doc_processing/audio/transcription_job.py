from io import BytesIO
from pathlib import Path

import ffmpeg
from loguru import logger

from common.doc_type import DocType
from common.job_type import JobType
from common.languages_enum import Language
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_data_crud import crud_sdoc_data
from core.doc.source_document_data_dto import SourceDocumentDataCreate
from core.doc.source_document_dto import SourceDocumentRead
from modules.doc_processing.doc_processing_dto import SdocProcessingJobInput
from repos.db.sql_repo import SQLRepo
from repos.filesystem_repo import FilesystemRepo
from repos.ray_repo import RayRepo
from systems.job_system.job_dto import Job, JobOutputBase
from systems.job_system.job_register_decorator import register_job

ray = RayRepo()
sqlr = SQLRepo()


class TranscriptionJobInput(SdocProcessingJobInput):
    filepath: Path


class TranscriptionJobOutput(JobOutputBase):
    token_starts: list[int]
    token_ends: list[int]
    token_time_starts: list[int]
    token_time_ends: list[int]
    content: str
    html: str
    language: str
    language_probability: float


@register_job(
    job_type=JobType.AUDIO_TRANSCRIPTION,
    input_type=TranscriptionJobInput,
    output_type=TranscriptionJobOutput,
    device="api",
)
def handle_transcription_job(
    payload: TranscriptionJobInput, job: Job
) -> TranscriptionJobOutput:
    # convert audio file to uncompessed PCM format
    pcm_bytes = convert_to_pcm(payload.filepath)

    with sqlr.db_session() as db:
        # get required data to create sdoc data
        sdoc = crud_sdoc.read(db, payload.sdoc_id)
        url = FilesystemRepo().get_sdoc_url(
            sdoc=SourceDocumentRead.model_validate(sdoc),
            relative=True,
            webp=sdoc.doctype == DocType.image,
            thumbnail=False,
        )

        # generate transcription using ray
        transcription = generate_automatic_transcription(
            payload=payload, audio_bytes=pcm_bytes
        )

        # create sdoc data
        sdoc_data = crud_sdoc_data.create(
            db=db,
            create_dto=SourceDocumentDataCreate(
                id=payload.sdoc_id,
                repo_url=url,
                sentence_starts=[],
                sentence_ends=[],
                token_starts=transcription["token_starts"],
                token_ends=transcription["token_ends"],
                token_time_starts=transcription["token_time_starts"],
                token_time_ends=transcription["token_time_ends"],
                content=transcription["content"],
                html=transcription["html"],
            ),
        )

    return TranscriptionJobOutput(
        token_starts=sdoc_data.token_starts,
        token_ends=sdoc_data.token_ends,
        token_time_starts=sdoc_data.token_time_starts,
        token_time_ends=sdoc_data.token_time_ends,
        content=sdoc_data.content,
        html=sdoc_data.html,
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

    # Create Wordlevel Transcriptions and token info in one pass
    tokens: list[str] = []
    token_starts: list[int] = []
    token_ends: list[int] = []
    token_time_starts: list[int] = []
    token_time_ends: list[int] = []
    current_position = 0
    for segment in output.segments:
        for word in segment.words:
            text = word.text.strip()
            token_time_starts.append(word.start_ms)
            token_time_ends.append(word.end_ms)
            tokens.append(text)
            current_word_length = len(text)
            token_starts.append(current_position)
            token_ends.append(current_position + current_word_length)
            current_position += current_word_length + 1

    if len(tokens) == 0:
        # no spoken words detected: inform user by writing informative fake data
        logger.warning(
            f"Document {payload.sdoc_id} {payload.filepath.name} seems to contain no spoken words. Using dummy text data."
        )
        tokens = ["File", "contains", "no", "spoken", "words"]
        token_starts = [0, 5, 14, 17, 24]
        token_ends = [4, 13, 16, 23, 29]
        token_time_starts = [0, 0, 0, 0, 0]
        token_time_ends = token_time_starts

    transcription = " ".join([token for token in tokens])

    return {
        "token_starts": token_starts,
        "token_ends": token_ends,
        "token_time_starts": token_time_starts,
        "token_time_ends": token_time_ends,
        "content": transcription,
        "html": f"<html><body><p>{transcription}</p></body></html>",
        "language": output.language,
        "language_probability": output.language_probability,
    }
