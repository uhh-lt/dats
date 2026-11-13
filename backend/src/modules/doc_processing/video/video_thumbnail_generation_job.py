from io import BytesIO
from pathlib import Path

import ffmpeg
from PIL import Image
from sqlalchemy.orm import Session

from common.artefact_enum import Artefact
from common.doc_type_enum import DocType
from common.job_type_enum import JobType
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_data_crud import crud_sdoc_data
from core.doc.source_document_data_dto import SourceDocumentDataUpdate
from core.doc.source_document_dto import SourceDocumentRead
from modules.doc_processing.doc_processing_dto import SdocProcessingJobInput
from modules.doc_processing.pipeline.pipeline_step_decorator import pipeline_step
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
    with sqlr.transaction() as db:
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


@pipeline_step(
    requires=set(),
    produces={Artefact.THUMBNAIL},
    doctypes={DocType.video},
)
@register_job(
    job_type=JobType.VIDEO_THUMBNAIL,
    input_type=VideoThumbnailJobInput,
    enricher=enrich_for_recompute,
)
def handle_video_thumbnail_job(payload: VideoThumbnailJobInput, job: Job) -> None:
    with sqlr.transaction() as db:
        sdoc = SourceDocumentRead.model_validate(
            crud_sdoc.read(db=db, id=payload.sdoc_id)
        )
        store_video_thumbnail(db=db, sdoc=sdoc, video_path=payload.filepath)


def store_video_thumbnail(
    db: Session, sdoc: SourceDocumentRead, video_path: Path
) -> None:
    """Write the thumbnail of the video's first frame next to the video and link
    it as the document's `repo_url`."""
    start_frame, err = (
        ffmpeg.input(video_path, ss=0)
        .output("pipe:", vframes=1, format="image2", vcodec="png")
        .run(quiet=True)
    )

    thumbnail_filename = fsr.generate_sdoc_filename(
        video_path, webp=True, thumbnail=True
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
    repo_url = fsr.get_sdoc_url(sdoc=sdoc, relative=True, webp=True, thumbnail=True)
    crud_sdoc_data.update(
        db=db,
        id=sdoc.id,
        update_dto=SourceDocumentDataUpdate(repo_url=repo_url),
    )
