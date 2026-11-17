from pathlib import Path

from common.doc_type_enum import DocType
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_dto import SourceDocumentRead
from core.doc_processing.artefacts import AUDIO
from core.doc_processing.video_utils import extract_audio_stream
from repos.db.sql_repo import SQLRepo
from repos.filesystem_repo import FilesystemRepo
from systems.artefact_system.artefact_dto import SdocProcessingJobInput
from systems.artefact_system.pipeline_step_decorator import pipeline_step
from systems.job_system.job_dto import Job, JobOutputBase
from systems.job_system.job_register_decorator import register_job

fsr = FilesystemRepo()
sqlr = SQLRepo()


class VideoAudioExtractionJobInput(SdocProcessingJobInput):
    filepath: Path


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

    video_path = fsr.get_path_to_sdoc_file(sdoc, raise_if_not_exists=True)

    return VideoAudioExtractionJobInput(
        **payload.model_dump(),
        filepath=video_path,
    )


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
def create_and_store_audio_stream_file(
    payload: VideoAudioExtractionJobInput, job: Job
) -> VideoAudioExtractionJobOutput:
    return VideoAudioExtractionJobOutput(
        filepath=extract_audio_stream(payload.filepath)
    )
