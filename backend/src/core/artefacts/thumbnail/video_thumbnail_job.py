from common.doc_type_enum import DocType
from core.artefacts.thumbnail.thumbnail_artefact import THUMBNAIL
from core.artefacts.video_utils import store_video_thumbnail
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_dto import SourceDocumentRead
from core.doc.source_document_file_crud import crud_sdoc_file
from repos.db.sql_repo import SQLRepo
from systems.artefact_system.artefact_dto import SdocProcessingJobInput
from systems.artefact_system.pipeline_step_decorator import pipeline_step
from systems.job_system.job_dto import Job
from systems.job_system.job_register_decorator import register_job

sqlr = SQLRepo()


class VideoThumbnailJobInput(SdocProcessingJobInput):
    filename: str


def enrich_for_recompute(
    payload: SdocProcessingJobInput,
) -> VideoThumbnailJobInput:
    with sqlr.transaction() as db:
        sdoc = SourceDocumentRead.model_validate(
            crud_sdoc.read(db=db, project_id=payload.project_id, id=payload.sdoc_id)
        )
        assert sdoc.doctype == DocType.video, (
            f"SourceDocument with {payload.sdoc_id=} is not a video file!"
        )

    assert crud_sdoc_file.exists(
        project_id=sdoc.project_id, id=sdoc.id, name=sdoc.filename
    ), f"The file of SourceDocument {sdoc.id} does not exist!"
    return VideoThumbnailJobInput(**payload.model_dump(), filename=sdoc.filename)


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
    filepath = crud_sdoc_file.path(
        project_id=payload.project_id, id=payload.sdoc_id, name=payload.filename
    )
    store_video_thumbnail(
        project_id=payload.project_id, sdoc_id=payload.sdoc_id, video_path=filepath
    )
