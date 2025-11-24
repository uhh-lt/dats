from pathlib import Path

import ffmpeg

from common.doc_type import DocType
from common.job_type import JobType
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_dto import SourceDocumentRead
from core.metadata.source_document_metadata_crud import crud_sdoc_meta
from modules.doc_processing.doc_processing_dto import SdocProcessingJobInput
from repos.db.sql_repo import SQLRepo
from repos.filesystem_repo import FilesystemRepo
from systems.job_system.job_dto import Job
from systems.job_system.job_register_decorator import register_job

fsr = FilesystemRepo()
sqlr = SQLRepo()

EXPECTED_METADATA = [
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


class VideoMetadataExtractionJobInput(SdocProcessingJobInput):
    filepath: Path


def enrich_for_recompute(
    payload: SdocProcessingJobInput,
) -> VideoMetadataExtractionJobInput:
    with sqlr.db_session() as db:
        sdoc = SourceDocumentRead.model_validate(
            crud_sdoc.read(db=db, id=payload.sdoc_id)
        )
        assert sdoc.doctype == DocType.video, (
            f"SourceDocument with {payload.sdoc_id=} is not a video file!"
        )

    video_path = fsr.get_path_to_sdoc_file(sdoc, raise_if_not_exists=True)

    return VideoMetadataExtractionJobInput(
        **payload.model_dump(),
        filepath=video_path,
    )


@register_job(
    job_type=JobType.VIDEO_METADATA_EXTRACTION,
    input_type=VideoMetadataExtractionJobInput,
    enricher=enrich_for_recompute,
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
        crud_sdoc_meta.update_multi_with_doctype(
            db=db,
            project_id=payload.project_id,
            sdoc_id=payload.sdoc_id,
            doctype=DocType.video,
            keys=list(metadata.keys()),
            values=list(metadata.values()),
        )
