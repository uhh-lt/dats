from pathlib import Path
from unittest.mock import MagicMock

from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from common.job_type_enum import JobType
from common.languages_enum import Language
from common.sdoc_status_enum import SDocStatus
from modules.doc_processing.audio.transcription_job import TranscriptionJobInput
from modules.doc_processing.doc_processing_dto import (
    ProcessingSettings,
    SdocProcessingJobInput,
)
from modules.doc_processing.entrypoints.init_sdoc_job import (
    SdocInitJobInput,
    handle_init_sdoc_job,
)
from modules.doc_processing.pipeline.pipeline_graph import pipeline_registry
from modules.doc_processing.step_run import handle_job_finished
from modules.doc_processing.video.video_utils import audio_stream_path
from pipeline_test_utils import (
    enrich_job_input,
    read_all_step_status,
    run_job,
)
from systems.job_system.job_dto import JobInputBase

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
# An upload is followed through the pipeline with captured jobs: each started
# step job gets its input from its enricher, as a finished step starts its
# successors with a bare input. Steps that run on ffmpeg or PIL run; steps of
# the hosted models (transcription, language detection, ...) only build their
# input, and the steps after them are not followed.

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
    started_jobs: list[tuple[JobType, JobInputBase]],
) -> dict[tuple[int, JobType], JobInputBase]:
    """Run the captured jobs until none is left: documents are created, the
    runnable steps run, the other steps only get their input. Returns the
    enriched input of every step job per document."""
    inputs: dict[tuple[int, JobType], JobInputBase] = {}
    while started_jobs:
        job_type, payload = started_jobs.pop(0)
        if job_type == JobType.SDOC_INIT:
            assert isinstance(payload, SdocInitJobInput)
            output = handle_init_sdoc_job(payload, MagicMock())
            handle_job_finished(JobType.SDOC_INIT, payload, output)
            continue
        assert isinstance(payload, SdocProcessingJobInput)
        inputs[(payload.sdoc_id, job_type)] = enrich_job_input(job_type, payload)
        if job_type in RUNNABLE:
            run_job(job_type, payload)
    return inputs


def _upload(project_id: int, filepath: Path, doctype: DocType) -> SdocInitJobInput:
    return SdocInitJobInput(
        project_id=project_id,
        filepath=filepath,
        doctype=doctype,
        folder_id=None,
        settings=SETTINGS,
    )


def _sdoc_ids(inputs: dict[tuple[int, JobType], JobInputBase]) -> set[int]:
    return {sdoc_id for sdoc_id, _ in inputs}


def test_audio_runs_its_roots_and_transcribes_the_uploaded_file(
    db_session: Session,
    media_uploads: MediaUploads,
    started_jobs: list[tuple[JobType, JobInputBase]],
):
    """An uploaded audio file starts its metadata extraction, thumbnail and
    transcription; the first two run and finish, the transcription gets the
    uploaded file and stays processing (its model is hosted)."""
    p = media_uploads
    started_jobs.append(
        (JobType.SDOC_INIT, _upload(p["project"].id, p["audio"], DocType.audio))
    )

    inputs = _follow(started_jobs)

    (sdoc_id,) = _sdoc_ids(inputs)
    assert {step for _, step in inputs} == set(
        pipeline_registry.graph().roots(DocType.audio)
    )
    transcription = inputs[(sdoc_id, JobType.AUDIO_TRANSCRIPTION)]
    assert isinstance(transcription, TranscriptionJobInput)
    assert transcription.filepath.name == p["audio"].name
    status = read_all_step_status(db_session, sdoc_id)
    assert status[JobType.AUDIO_METADATA_EXTRACTION.value] == FINISHED
    assert status[JobType.AUDIO_THUMBNAIL.value] == FINISHED
    assert status[JobType.AUDIO_TRANSCRIPTION.value] == PROCESSING


def test_video_extracts_its_audio_and_transcribes_it(
    db_session: Session,
    media_uploads: MediaUploads,
    started_jobs: list[tuple[JobType, JobInputBase]],
):
    """An uploaded video runs its metadata extraction, thumbnail and audio
    extraction; the finished audio extraction starts the transcription, whose
    enricher finds the extracted audio stream."""
    p = media_uploads
    started_jobs.append(
        (JobType.SDOC_INIT, _upload(p["project"].id, p["video"], DocType.video))
    )

    inputs = _follow(started_jobs)

    (sdoc_id,) = _sdoc_ids(inputs)
    assert {step for _, step in inputs} == {
        JobType.VIDEO_METADATA_EXTRACTION,
        JobType.VIDEO_THUMBNAIL,
        JobType.VIDEO_AUDIO_EXTRACTION,
        JobType.AUDIO_TRANSCRIPTION,
    }
    transcription = inputs[(sdoc_id, JobType.AUDIO_TRANSCRIPTION)]
    assert isinstance(transcription, TranscriptionJobInput)
    assert transcription.filepath.name == audio_stream_path(p["video"]).name
    assert transcription.filepath.exists()
    status = read_all_step_status(db_session, sdoc_id)
    assert status[JobType.VIDEO_AUDIO_EXTRACTION.value] == FINISHED
    assert status[JobType.VIDEO_METADATA_EXTRACTION.value] == FINISHED
    assert status[JobType.VIDEO_THUMBNAIL.value] == FINISHED
    assert status[JobType.AUDIO_TRANSCRIPTION.value] == PROCESSING


def test_an_image_extracted_from_a_document_runs_its_roots(
    db_session: Session,
    media_uploads: MediaUploads,
    started_jobs: list[tuple[JobType, JobInputBase]],
):
    """extract_html of page.html stores its embedded image and creates an image
    document for it (an entry point); the image document starts and finishes its
    metadata extraction and thumbnail, whose enrichers find the stored image."""
    p = media_uploads
    started_jobs.append(
        (
            JobType.SDOC_INIT,
            _upload(p["project"].id, p["html_with_image"], DocType.text),
        )
    )

    inputs = _follow(started_jobs)

    image_roots = {JobType.IMAGE_METADATA_EXTRACTION, JobType.IMAGE_THUMBNAIL}
    (image_id,) = {sdoc_id for sdoc_id, step in inputs if step in image_roots}
    assert {step for sdoc_id, step in inputs if sdoc_id == image_id} == image_roots
    status = read_all_step_status(db_session, image_id)
    assert status == {
        JobType.IMAGE_METADATA_EXTRACTION.value: FINISHED,
        JobType.IMAGE_THUMBNAIL.value: FINISHED,
    }
