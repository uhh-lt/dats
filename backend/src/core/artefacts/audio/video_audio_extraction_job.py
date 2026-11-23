from pathlib import Path

from common.doc_type_enum import DocType
from core.artefacts.audio.audio_artefact import AUDIO
from core.artefacts.video_utils import extract_audio_stream
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_dto import SourceDocumentRead
from core.doc.source_document_file_crud import crud_sdoc_file
from repos.db.sql_repo import SQLRepo
from systems.artefact_system.artefact_dto import SdocProcessingJobInput
from systems.artefact_system.pipeline_step_decorator import pipeline_step
from systems.job_system.job_dto import Job, JobOutputBase
from systems.job_system.job_register_decorator import register_job

sqlr = SQLRepo()


class VideoAudioExtractionJobInput(SdocProcessingJobInput):
    filename: str


class VideoAudioExtractionJobOutput(JobOutputBase):
    filepath: Path


def enrich_for_recompute(
    payload: SdocProcessingJobInput,
) -> VideoAudioExtractionJobInput:
    with sqlr.transaction() as db:
        sdoc = SourceDocumentRead.model_validate(
            crud_sdoc.read(db=db, id=payload.sdoc_id)
        )
        assert sdoc.doctype == DocType.video, (
            f"SourceDocument with {payload.sdoc_id=} is not a video file!"
        )

    assert crud_sdoc_file.exists(
        project_id=sdoc.project_id, id=sdoc.id, name=sdoc.filename
    ), f"The file of SourceDocument {sdoc.id} does not exist!"
    return VideoAudioExtractionJobInput(**payload.model_dump(), filename=sdoc.filename)


@pipeline_step(
    requires=set(),
    produces={AUDIO},
    doctypes={DocType.video},
)
@register_job(
    job_type="video_audio_extraction",
    input_type=VideoAudioExtractionJobInput,
    output_type=VideoAudioExtractionJobOutput,
    enricher=enrich_for_recompute,
)
def handle_video_audio_extraction_job(
    payload: VideoAudioExtractionJobInput, job: Job
) -> VideoAudioExtractionJobOutput:
    filepath = crud_sdoc_file.path(
        project_id=payload.project_id, id=payload.sdoc_id, name=payload.filename
    )
    return VideoAudioExtractionJobOutput(
        filepath=extract_audio_stream(
            project_id=payload.project_id, sdoc_id=payload.sdoc_id, video_path=filepath
        )
    )
