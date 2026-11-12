from pathlib import Path

from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from common.job_type_enum import JobType
from common.languages_enum import Language
from common.sdoc_status_enum import SDocStatus
from core.doc.source_document_crud import crud_sdoc
from job_test_utils import HeldJobs
from modules.doc_processing.audio.transcription_job import TranscriptionJobInput
from modules.doc_processing.doc_processing_dto import (
    ProcessingSettings,
    SdocProcessingJobInput,
)
from modules.doc_processing.entrypoints.init_sdoc_job import SdocInitJobInput
from modules.doc_processing.pipeline.pipeline_graph import pipeline_registry
from modules.doc_processing.video.video_utils import audio_stream_path
from pipeline_test_utils import read_all_step_status
from systems.job_system.job_service import JobService

from .conftest import MediaUploads

SETTINGS = ProcessingSettings(
    extract_images=True,
    pages_per_chunk=10,
    keyword_number=5,
    keyword_deduplication_threshold=0.5,
    keyword_max_ngram_size=2,
    language=Language.english,
    model="default",
)

FINISHED = SDocStatus.finished.value
PROCESSING = SDocStatus.processing.value

# ===========================================================================
# THE GENERIC TRANSITIONS PER DOCTYPE
# ===========================================================================
# An upload is followed through the pipeline with held jobs, run in-process
# through the real job handler: a finished step starts its successors, whose
# enrichers complete their input. Steps that run on ffmpeg or PIL run; the jobs
# of the hosted models (transcription, language detection, ...) stay held with
# their enriched input, and the steps after them are not followed.

# the steps that run in the tests (no hosted model)
RUNNABLE = {
    JobType.EXTRACT_HTML,
    JobType.AUDIO_METADATA_EXTRACTION,
    JobType.AUDIO_THUMBNAIL,
    JobType.VIDEO_METADATA_EXTRACTION,
    JobType.VIDEO_THUMBNAIL,
    JobType.VIDEO_AUDIO_EXTRACTION,
    JobType.IMAGE_METADATA_EXTRACTION,
    JobType.IMAGE_THUMBNAIL,
}


def _follow(
    held_jobs: HeldJobs, project_id: int, filepath: Path, doctype: DocType
) -> dict[JobType, SdocProcessingJobInput]:
    """Upload the file and run the document creation and the runnable steps
    until none is held. Returns the enriched input of every held step job."""
    JobService().start_job(
        JobType.SDOC_INIT,
        SdocInitJobInput(
            project_id=project_id,
            filepath=filepath,
            doctype=doctype,
            folder_id=None,
            settings=SETTINGS,
        ),
    )
    held_jobs.run(JobType.SDOC_INIT, *RUNNABLE)
    held: dict[JobType, SdocProcessingJobInput] = {}
    for job_type, payload in held_jobs.jobs():
        assert isinstance(payload, SdocProcessingJobInput)
        held[job_type] = payload
    return held


def _sdoc_id(db: Session, project_id: int, doctype: DocType) -> int:
    """The id of the one document of the doctype in the project."""
    db.expire_all()
    (sdoc,) = [
        sdoc
        for sdoc in crud_sdoc.read_by_project(
            db=db, project_id=project_id, only_finished=False
        )
        if sdoc.doctype == doctype
    ]
    db.commit()
    return sdoc.id


def test_audio_runs_its_roots_and_transcribes_the_uploaded_file(
    db_session: Session, media_uploads: MediaUploads, held_jobs: HeldJobs
):
    """An uploaded audio file starts its metadata extraction, thumbnail and
    transcription; the first two run and finish, the transcription gets the
    uploaded file and stays processing (its model is hosted)."""
    p = media_uploads

    held = _follow(held_jobs, p["project"].id, p["audio"], DocType.audio)

    sdoc_id = _sdoc_id(db_session, p["project"].id, DocType.audio)
    assert set(held) == {JobType.AUDIO_TRANSCRIPTION}
    transcription = held[JobType.AUDIO_TRANSCRIPTION]
    assert isinstance(transcription, TranscriptionJobInput)
    assert transcription.sdoc_id == sdoc_id
    assert transcription.filepath.name == p["audio"].name
    status = read_all_step_status(db_session, sdoc_id)
    ran = {JobType(step) for step, value in status.items() if value == FINISHED}
    assert ran | set(held) == set(pipeline_registry.graph().roots(DocType.audio))
    assert status[JobType.AUDIO_METADATA_EXTRACTION.value] == FINISHED
    assert status[JobType.AUDIO_THUMBNAIL.value] == FINISHED
    assert status[JobType.AUDIO_TRANSCRIPTION.value] == PROCESSING


def test_video_extracts_its_audio_and_transcribes_it(
    db_session: Session, media_uploads: MediaUploads, held_jobs: HeldJobs
):
    """An uploaded video runs its metadata extraction, thumbnail and audio
    extraction; the finished audio extraction starts the transcription, whose
    enricher finds the extracted audio stream."""
    p = media_uploads

    held = _follow(held_jobs, p["project"].id, p["video"], DocType.video)

    sdoc_id = _sdoc_id(db_session, p["project"].id, DocType.video)
    assert set(held) == {JobType.AUDIO_TRANSCRIPTION}
    transcription = held[JobType.AUDIO_TRANSCRIPTION]
    assert isinstance(transcription, TranscriptionJobInput)
    assert transcription.sdoc_id == sdoc_id
    assert transcription.filepath.name == audio_stream_path(p["video"]).name
    assert transcription.filepath.exists()
    status = read_all_step_status(db_session, sdoc_id)
    assert status[JobType.VIDEO_AUDIO_EXTRACTION.value] == FINISHED
    assert status[JobType.VIDEO_METADATA_EXTRACTION.value] == FINISHED
    assert status[JobType.VIDEO_THUMBNAIL.value] == FINISHED
    assert status[JobType.AUDIO_TRANSCRIPTION.value] == PROCESSING


def test_an_image_extracted_from_a_document_runs_its_roots(
    db_session: Session, media_uploads: MediaUploads, held_jobs: HeldJobs
):
    """extract_html of page.html stores its embedded image and creates an image
    document for it (an entry point); the image document starts and finishes its
    metadata extraction and thumbnail, whose enrichers find the stored image."""
    p = media_uploads

    held = _follow(held_jobs, p["project"].id, p["html_with_image"], DocType.text)

    image_id = _sdoc_id(db_session, p["project"].id, DocType.image)
    assert all(payload.sdoc_id != image_id for payload in held.values())
    status = read_all_step_status(db_session, image_id)
    assert status == {
        JobType.IMAGE_METADATA_EXTRACTION.value: FINISHED,
        JobType.IMAGE_THUMBNAIL.value: FINISHED,
    }
