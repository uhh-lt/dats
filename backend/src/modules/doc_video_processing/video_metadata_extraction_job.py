from pathlib import Path

import ffmpeg
from common.doc_type import DocType
from common.job_type import JobType
from core.metadata.source_document_metadata_crud import crud_sdoc_meta
from repos.db.sql_repo import SQLRepo
from systems.job_system.job_dto import Job, SdocJobInput
from systems.job_system.job_register_decorator import register_job

sqlr = SQLRepo()

EXPECTED_METADATA = [
    "url",
    "language",
    "transcription_keywords",
    "width",
    "height",
    "duration",
    "format_name",
    "format_long_name",
    "size",
    "bit_rate",
    "tags",
]


class VideoMetadataExtractionJobInput(SdocJobInput):
    filepath: Path


@register_job(
    job_type=JobType.VIDEO_METADATA_EXTRACTION,
    input_type=VideoMetadataExtractionJobInput,
)
def handle_video_metadata_extraction_job(
    payload: VideoMetadataExtractionJobInput, job: Job
) -> None:
    ffmpeg_probe = ffmpeg.probe(payload.filepath)

    metadata = {}
    for k, v in ffmpeg_probe["format"].items():
        if k == "format_name":
            metadata[k] = str(v).split(",")
        elif k in EXPECTED_METADATA:
            metadata[k] = str(v)

    vidx = 0 if ffmpeg_probe["streams"][0]["codec_type"] == "video" else 1
    for k, v in ffmpeg_probe["streams"][vidx].items():
        if k in EXPECTED_METADATA:
            metadata[k] = str(v)

    with sqlr.db_session() as db:
        # Store video metadata in db
        crud_sdoc_meta.create_multi_with_doctype(
            db=db,
            project_id=payload.project_id,
            sdoc_id=payload.sdoc_id,
            doctype=DocType.video,
            keys=list(metadata.keys()),
            values=list(metadata.values()),
        )
