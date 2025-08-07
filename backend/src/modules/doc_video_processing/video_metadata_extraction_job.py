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


class VideoMetadataExtractionJobInput(JobInputBase):
    sdoc_id: int
    filename: str | None
    text: str | None
    filepath: Path


@register_job(
    job_type="video_metadata_extraction",
    input_type=VideoMetadataExtractionJobInput,
    output_type=None,
    priority=JobPriority.DEFAULT,
    generate_endpoints=EndpointGeneration.NONE,
)
def handle_video_metadata_extraction_job(
    payload: VideoMetadataExtractionJobInput, job: Job
) -> None:
    ffmpeg_probe = ffmpeg.probe(payload.filepath)

    metadata = {}
    for k, v in ffmpeg_probe["format"].items():
        metadata[k] = str(v)

    vidx = 0 if ffmpeg_probe["streams"][0]["codec_type"] == "video" else 1
    for md in ["width", "height", "display_aspect_ratio"]:
        if md in ffmpeg_probe["streams"][vidx]:
            metadata[md] = str(ffmpeg_probe["streams"][vidx][md])

    with sqlr.db_session() as db:
        # Store metadata in the database
        # TODO: create a new metadata crud function

        # Set db status
        crud_sdoc_status.update(
            db=db,
            id=payload.sdoc_id,
            update_dto=SourceDocumentStatusUpdate(video_metadata=True),
        )
