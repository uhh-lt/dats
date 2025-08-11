from io import BytesIO
from pathlib import Path

import ffmpeg
from common.job_type import JobType
from core.doc.source_document_data_crud import crud_sdoc_data
from core.doc.source_document_data_dto import SourceDocumentDataUpdate
from loguru import logger
from repos.db.sql_repo import SQLRepo
from repos.ray_repo import RayRepo
from systems.job_system.job_dto import Job, JobOutputBase, SdocJobInput
from systems.job_system.job_register_decorator import register_job

ray = RayRepo()
sqlr = SQLRepo()


class TranscriptionJobInput(SdocJobInput):
    filepath: Path


class TranscriptionJobOutput(JobOutputBase):
    token_starts: list[int]
    token_ends: list[int]
    token_time_starts: list[int]
    token_time_ends: list[int]
    content: str
    html: str


@register_job(
    job_type=JobType.AUDIO_TRANSCRIPTION,
    input_type=TranscriptionJobInput,
    output_type=TranscriptionJobOutput,
)
def handle_transcription_job(
    payload: TranscriptionJobInput, job: Job
) -> TranscriptionJobOutput:
    # convert audio file to uncompessed PCM format
    pcm_bytes = convert_to_pcm(payload.filepath)

    # generate transcription using ray
    sdoc_data = generate_automatic_transcription(pcm_bytes)

    with sqlr.db_session() as db:
        # TODO: are the tokens overwritten by the text pipeline?
        # update sdoc data
        crud_sdoc_data.update(db=db, id=payload.sdoc_id, update_dto=sdoc_data)
    return TranscriptionJobOutput(
        token_starts=sdoc_data.token_starts,  # type: ignore
        token_ends=sdoc_data.token_ends,  # type: ignore
        token_time_starts=sdoc_data.token_time_starts,  # type: ignore
        token_time_ends=sdoc_data.token_time_ends,  # type: ignore
        content=sdoc_data.content,  # type: ignore
        html=sdoc_data.html,  # type: ignore
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


def generate_automatic_transcription(audio_bytes) -> SourceDocumentDataUpdate:
    logger.debug("Generating automatic transcription ...")

    # send the audio bytes to the whisper model to get the transcript
    transcription = ray.whisper_transcribe(audio_bytes=audio_bytes)
    logger.info(f"Generated transcript {transcription}")

    # Create Wordlevel Transcriptions and token info in one pass
    tokens: list[str] = []
    token_starts: list[int] = []
    token_ends: list[int] = []
    token_time_starts: list[int] = []
    token_time_ends: list[int] = []
    current_position = 0
    for segment in transcription.segments:
        for word in segment.words:
            text = word.text.strip()
            token_time_starts.append(word.start_ms)
            token_time_ends.append(word.end_ms)
            tokens.append(text)
            current_word_length = len(text)
            token_starts.append(current_position)
            token_ends.append(current_position + current_word_length)
            current_position += current_word_length + 1

    transcription = " ".join([token for token in tokens])

    return SourceDocumentDataUpdate(
        token_starts=token_starts,
        token_ends=token_ends,
        token_time_starts=token_time_starts,
        token_time_ends=token_time_ends,
        content=transcription,
        html=f"<html><body><p>{transcription}</p></body></html>",
    )
