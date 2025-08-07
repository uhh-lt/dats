from pathlib import Path

import ffmpeg
from core.doc.source_document_status_crud import crud_sdoc_status
from core.doc.source_document_status_dto import SourceDocumentStatusUpdate
from repos.db.sql_repo import SQLRepo
from systems.job_system.job_dto import (
    EndpointGeneration,
    Job,
    JobInputBase,
    JobPriority,
)
from systems.job_system.job_register_decorator import register_job

sqlr = SQLRepo()

EXPECTED_METADATA = [
    "url",
    "duration",
    "format_name",
    "format_long_name",
    "size",
    "bit_rate",
    "tags",
]


class AudioMetadataExtractionJobInput(JobInputBase):
    filepath: Path
    sdoc_id: int


@register_job(
    job_type="audio_metadata_extraction",
    input_type=AudioMetadataExtractionJobInput,
    output_type=None,
    priority=JobPriority.DEFAULT,
    generate_endpoints=EndpointGeneration.NONE,
)
def handle_audio_metadata_extraction_job(
    payload: AudioMetadataExtractionJobInput, job: Job
) -> None:
    audio_metadata = {key: None for key in EXPECTED_METADATA}
    ffmpeg_probe = ffmpeg.probe(payload.filepath)
    for k, v in ffmpeg_probe["format"].items():
        if k in audio_metadata:
            audio_metadata[k] = v

    # Store audio_metadata in db
    # TODO: We need a better function in metadata_crud to handle this

    with sqlr.db_session() as db:
        # Set db status
        crud_sdoc_status.update(
            db=db,
            id=payload.sdoc_id,
            update_dto=SourceDocumentStatusUpdate(audio_metadata=True),
        )
