from pathlib import Path

from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from common.languages_enum import Language
from common.sdoc_status_enum import SDocStatus
from core.artefacts.transcript.transcription_job import TranscriptionJobInput
from core.artefacts.video_utils import audio_stream_path
from core.doc.source_document_crud import crud_sdoc
from core.doc_processing.doc_processing_dto import SdocInitJobInput
from core.doc_processing.entrypoints.init_sdoc_job import SDOC_INIT_JOB
from job_test_utils import HeldJobs
from pipeline_test_utils import core_steps, read_all_step_status
from systems.artefact_system.artefact_dto import (
    ProcessingSettings,
    SdocProcessingJobInput,
)
from systems.artefact_system.artefact_registry import artefact_registry
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
    "extract_html",
    "audio_metadata",
    "audio_thumbnail",
    "video_metadata",
    "video_thumbnail",
    "video_audio_extraction",
    "image_metadata_extraction",
    "image_thumbnail",
}


def _follow(
    held_jobs: HeldJobs, project_id: int, filepath: Path, doctype: DocType
) -> dict[str, SdocProcessingJobInput]:
    """Upload the file and run the document creation and the runnable steps
    until none is held. Returns the enriched input of every held step job."""
    JobService().start_job(
        SDOC_INIT_JOB,
        SdocInitJobInput(
            project_id=project_id,
            filepath=filepath,
            doctype=doctype,
            folder_id=None,
            settings=SETTINGS,
        ),
    )
    held_jobs.run(SDOC_INIT_JOB, *RUNNABLE)
    held: dict[str, SdocProcessingJobInput] = {}
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
    assert set(held) == {"audio_transcription"}
    transcription = held["audio_transcription"]
    assert isinstance(transcription, TranscriptionJobInput)
    assert transcription.sdoc_id == sdoc_id
    assert transcription.filepath.name == p["audio"].name
    status = read_all_step_status(db_session, sdoc_id)
    ran = {step for step, value in status.items() if value == FINISHED}
    assert ran | set(held) == set(artefact_registry.graph().roots(DocType.audio))
    assert status["audio_metadata"] == FINISHED
    assert status["audio_thumbnail"] == FINISHED
    assert status["audio_transcription"] == PROCESSING


def test_video_extracts_its_audio_and_transcribes_it(
    db_session: Session, media_uploads: MediaUploads, held_jobs: HeldJobs
):
    """An uploaded video runs its metadata extraction, thumbnail and audio
    extraction; the finished audio extraction starts the transcription, whose
    enricher finds the extracted audio stream."""
    p = media_uploads

    held = _follow(held_jobs, p["project"].id, p["video"], DocType.video)

    sdoc_id = _sdoc_id(db_session, p["project"].id, DocType.video)
    assert set(held) == {"audio_transcription"}
    transcription = held["audio_transcription"]
    assert isinstance(transcription, TranscriptionJobInput)
    assert transcription.sdoc_id == sdoc_id
    assert transcription.filepath.name == audio_stream_path(p["video"]).name
    assert transcription.filepath.exists()
    status = read_all_step_status(db_session, sdoc_id)
    assert status["video_audio_extraction"] == FINISHED
    assert status["video_metadata"] == FINISHED
    assert status["video_thumbnail"] == FINISHED
    assert status["audio_transcription"] == PROCESSING


def test_an_image_extracted_from_a_document_runs_its_roots(
    db_session: Session, media_uploads: MediaUploads, held_jobs: HeldJobs
):
    """extract_html of page.html stores its embedded image and creates an image
    document for it (an entry point); the image document starts and finishes its
    metadata extraction and thumbnail, whose enrichers find the stored image,
    and starts its caption, which stays processing (its model is hosted)."""
    p = media_uploads

    held = _follow(held_jobs, p["project"].id, p["html_with_image"], DocType.text)

    image_id = _sdoc_id(db_session, p["project"].id, DocType.image)
    assert [t for t, payload in held.items() if payload.sdoc_id == image_id] == [
        "image_caption"
    ]
    assert read_all_step_status(db_session, image_id) == {
        **dict.fromkeys(core_steps(DocType.image), PROCESSING),
        "image_metadata_extraction": FINISHED,
        "image_thumbnail": FINISHED,
    }
