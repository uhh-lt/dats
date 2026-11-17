from pathlib import Path

from common.doc_type_enum import DocType
from core.artefacts.thumbnail.thumbnail_artefact import THUMBNAIL
from core.artefacts.video_utils import store_video_thumbnail
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_dto import SourceDocumentRead
from repos.db.sql_repo import SQLRepo
from repos.filesystem_repo import FilesystemRepo
from systems.artefact_system.artefact_dto import SdocProcessingJobInput
from systems.artefact_system.pipeline_step_decorator import pipeline_step
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
    produces={THUMBNAIL},
    doctypes={DocType.video},
)
@register_job(
    job_type="video_thumbnail",
    input_type=VideoThumbnailJobInput,
    enricher=enrich_for_recompute,
)
def handle_video_thumbnail_job(payload: VideoThumbnailJobInput, job: Job) -> None:
    with sqlr.transaction() as db:
        sdoc = SourceDocumentRead.model_validate(
            crud_sdoc.read(db=db, id=payload.sdoc_id)
        )
        store_video_thumbnail(db=db, sdoc=sdoc, video_path=payload.filepath)
