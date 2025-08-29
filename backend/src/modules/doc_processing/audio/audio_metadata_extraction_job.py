from pathlib import Path

import ffmpeg

from common.doc_type import DocType
from common.job_type import JobType
from core.metadata.source_document_metadata_crud import crud_sdoc_meta
from modules.doc_processing.doc_processing_dto import SdocProcessingJobInput
from repos.db.sql_repo import SQLRepo
from systems.job_system.job_dto import Job
from systems.job_system.job_register_decorator import register_job

sqlr = SQLRepo()

EXPECTED_METADATA = [
    "duration",
    "format_name",
    "format_long_name",
    "size",
    "bit_rate",
    "tags",
]


class AudioMetadataExtractionJobInput(SdocProcessingJobInput):
    filepath: Path


@register_job(
    job_type=JobType.AUDIO_METADATA_EXTRACTION,
    input_type=AudioMetadataExtractionJobInput,
)
def handle_audio_metadata_extraction_job(
    payload: AudioMetadataExtractionJobInput, job: Job
) -> None:
    audio_metadata = {}
    ffmpeg_probe = ffmpeg.probe(payload.filepath)
    for k, v in ffmpeg_probe["format"].items():
        if k == "format_name":
            audio_metadata[k] = str(v).split(",")
        elif k in EXPECTED_METADATA:
            audio_metadata[k] = str(v)

    with sqlr.db_session() as db:
        # Store audio_metadata in db
        crud_sdoc_meta.update_multi_with_doctype(
            db=db,
            project_id=payload.project_id,
            sdoc_id=payload.sdoc_id,
            doctype=DocType.audio,
            keys=list(audio_metadata.keys()),
            values=list(audio_metadata.values()),
        )
