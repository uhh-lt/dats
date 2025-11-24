from io import BytesIO
from pathlib import Path

import ffmpeg
from PIL import Image

from common.doc_type import DocType
from common.job_type import JobType
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_data_crud import crud_sdoc_data
from core.doc.source_document_data_dto import SourceDocumentDataUpdate
from core.doc.source_document_dto import SourceDocumentRead
from modules.doc_processing.doc_processing_dto import SdocProcessingJobInput
from repos.db.sql_repo import SQLRepo
from repos.filesystem_repo import FilesystemRepo
from systems.job_system.job_dto import Job
from systems.job_system.job_register_decorator import register_job

fsr = FilesystemRepo()
sqlr = SQLRepo()


class VideoThumbnailJobInput(SdocProcessingJobInput):
    filepath: Path


def enrich_for_recompute(
    payload: SdocProcessingJobInput,
) -> VideoThumbnailJobInput:
    with sqlr.db_session() as db:
        sdoc = SourceDocumentRead.model_validate(
            crud_sdoc.read(db=db, id=payload.sdoc_id)
        )
        assert sdoc.doctype == DocType.video, (
            f"SourceDocument with {payload.sdoc_id=} is not a video file!"
        )

    video_path = fsr.get_path_to_sdoc_file(sdoc, raise_if_not_exists=True)

    return VideoThumbnailJobInput(
        **payload.model_dump(),
        filepath=video_path,
    )


@register_job(
    job_type=JobType.VIDEO_THUMBNAIL,
    input_type=VideoThumbnailJobInput,
)
def handle_video_thumbnail_job(payload: VideoThumbnailJobInput, job: Job) -> None:
    start_frame, err = (
        ffmpeg.input(payload.filepath, ss=0)
        .output("pipe:", vframes=1, format="image2", vcodec="png")
        .run(quiet=True)
    )

    thumbnail_filename = fsr.generate_sdoc_filename(
        payload.filepath, webp=True, thumbnail=True
    )
    with Image.open(BytesIO(start_frame)) as im:
        im.thumbnail((256, 256))
        im.save(
            thumbnail_filename,
            "WEBP",
            quality=50,
            lossless=True,
            method=6,
        )

    # Store link to thumbnail in DB
    with sqlr.db_session() as db:
        sdoc = SourceDocumentRead.model_validate(
            crud_sdoc.read(db=db, id=payload.sdoc_id)
        )
        repo_url = FilesystemRepo().get_sdoc_url(
            sdoc=sdoc,
            relative=True,
            webp=True,
            thumbnail=True,
        )
        crud_sdoc_data.update(
            db=db,
            id=payload.sdoc_id,
            update_dto=SourceDocumentDataUpdate(repo_url=repo_url),
        )
