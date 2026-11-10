from typing import Callable

from common.doc_type_enum import DocType
from common.job_type_enum import JobType
from common.sdoc_status_enum import SDocStatus
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_dto import SourceDocumentUpdate
from modules.doc_processing.doc_processing_dto import SdocProcessingJobInput
from modules.doc_processing.entrypoints.init_sdoc_job import SdocInitJobOutput
from modules.doc_processing.pipeline import pipeline_transitions as t
from modules.doc_processing.pipeline.pipeline_operators import LoopBranchOperator
from repos.db.sql_repo import SQLRepo
from systems.job_system.job_dto import (
    JobInputBase,
    JobOutputBase,
)
from systems.job_system.job_exceptions import PipelineDeclarationError
from systems.job_system.job_service import JobService
from systems.job_system.pipeline_graph import pipeline_registry

# --- ENTRY POINTS ---
# Jobs that are no pipeline steps: they create the documents. Their successors
# are not derived from artefacts, as they loop over files or switch by doctype.
# fmt: off
ENTRY_POINTS = {
    JobType.CRAWLER: [
        (t.crawler_to_extract_archive, JobType.EXTRACT_ARCHIVE),
    ],
    # extract archive is called if user uploads zip archive or user triggers the crawler
    JobType.EXTRACT_ARCHIVE: [
        LoopBranchOperator(
            loop_variable=lambda output: output.file_paths,
            next_jobs=[(t.extract_archive_to_pdf_chunking, JobType.DOC_CHUNKING)],
        )
    ],
    # doc chunking is called if text documents are preprocessed
    JobType.DOC_CHUNKING: [
        LoopBranchOperator(
            loop_variable=lambda output: output.files,
            next_jobs=[
                (t.doc_chunking_to_sdoc_init, JobType.SDOC_INIT),
            ],
        ),
    ],
    # images extracted from text documents become documents of their own
    JobType.EXTRACT_HTML: [
        LoopBranchOperator(
            loop_variable=lambda output: output.image_paths,
            next_jobs=[
                (t.extract_html_to_image_sdoc_init, JobType.SDOC_INIT),
            ],
        ),
    ],
}

# --- PIPELINE STEPS ---
# The order of the steps is derived from their declarations in @register_job
# (systems/job_system/pipeline_graph.py). Each edge needs a transition function
# that builds the input of the next step.
TRANSITIONS: dict[tuple[JobType, JobType], Callable] = {
    # sdoc init starts the root steps of the document's doctype
    (JobType.SDOC_INIT, JobType.EXTRACT_HTML): t.sdoc_init_to_extract_html,
    (JobType.SDOC_INIT, JobType.IMAGE_CAPTION): t.sdoc_init_to_image_caption,
    (JobType.SDOC_INIT, JobType.IMAGE_EMBEDDING): t.sdoc_init_to_image_embedding,
    (JobType.SDOC_INIT, JobType.IMAGE_METADATA_EXTRACTION): t.sdoc_init_to_image_metadata_extraction,
    (JobType.SDOC_INIT, JobType.IMAGE_THUMBNAIL): t.sdoc_init_to_image_thumbnail,
    (JobType.SDOC_INIT, JobType.IMAGE_OBJECT_DETECTION): t.sdoc_init_to_image_object_detection,
    (JobType.SDOC_INIT, JobType.AUDIO_METADATA_EXTRACTION): t.sdoc_init_to_audio_metadata_extraction,
    (JobType.SDOC_INIT, JobType.AUDIO_TRANSCRIPTION): t.sdoc_init_to_audio_transcription,
    (JobType.SDOC_INIT, JobType.AUDIO_THUMBNAIL): t.sdoc_init_to_audio_thumbnail,
    (JobType.SDOC_INIT, JobType.VIDEO_METADATA_EXTRACTION): t.sdoc_init_to_video_metadata_extraction,
    (JobType.SDOC_INIT, JobType.VIDEO_THUMBNAIL): t.sdoc_init_to_video_thumbnail,
    (JobType.SDOC_INIT, JobType.VIDEO_AUDIO_EXTRACTION): t.sdoc_init_to_video_audio_extraction,
    # TEXT
    (JobType.EXTRACT_HTML, JobType.TEXT_EXTRACTION): t.extract_html_to_text_extraction,
    # HTML
    (JobType.TEXT_EXTRACTION, JobType.TEXT_LANGUAGE_DETECTION): t.text_extraction_to_language_detection,
    (JobType.TEXT_EXTRACTION, JobType.TEXT_ES_INDEX): t.text_extraction_to_es_index,
    (JobType.TEXT_LANGUAGE_DETECTION, JobType.TEXT_SPACY): t.language_detection_to_spacy,
    (JobType.TEXT_SPACY, JobType.TEXT_HTML_MAPPING): t.spacy_to_html_mapping,
    (JobType.TEXT_SPACY, JobType.TEXT_SENTENCE_EMBEDDING): t.spacy_to_sentence_embedding,
    # VIDEO -> AUDIO
    (JobType.VIDEO_AUDIO_EXTRACTION, JobType.AUDIO_TRANSCRIPTION): t.video_audio_extraction_to_audio_transcription,
    # AUDIO -> TEXT
    (JobType.AUDIO_TRANSCRIPTION, JobType.TEXT_EXTRACTION): t.audio_transcription_to_text_extraction,
    # IMAGE -> TEXT
    (JobType.IMAGE_CAPTION, JobType.TEXT_EXTRACTION): t.image_caption_to_text_extraction,
}
# fmt: on


def check_transitions() -> None:
    """Raise if an edge of the derived pipeline has no transition function, or a
    transition function belongs to no edge."""
    graph = pipeline_registry.graph()
    edges = graph.edges() | {
        (JobType.SDOC_INIT, root)
        for doctype in DocType
        for root in graph.roots(doctype)
    }
    problems = [
        f"No transition function for the edge '{a.value}' -> '{b.value}'."
        for a, b in sorted(edges - TRANSITIONS.keys())
    ] + [
        f"The transition function for '{a.value}' -> '{b.value}' belongs to no edge."
        for a, b in sorted(TRANSITIONS.keys() - edges)
    ]
    if problems:
        raise PipelineDeclarationError(problems)


def _start(job_type: JobType, next_job_type: JobType, input, output, job_service):
    transition_fn = TRANSITIONS[(job_type, next_job_type)]
    job_service.start_job(next_job_type, transition_fn(input, output))


def execute_pipeline_step(job_type: JobType, input, output, job_service):
    graph = pipeline_registry.graph()
    if job_type == JobType.SDOC_INIT:
        assert isinstance(output, SdocInitJobOutput), "Expected SdocInitJobOutput"
        for next_job_type in graph.roots(output.doctype):
            _start(job_type, next_job_type, input, output, job_service)
    for next_job_type in graph.successors(job_type):
        _start(job_type, next_job_type, input, output, job_service)

    for step in ENTRY_POINTS.get(job_type, []):
        if isinstance(step, LoopBranchOperator):
            jobs = step.get_next_jobs(input, output)
            for transition_fn, next_job_type, idx in jobs:
                job_input = transition_fn(input, output, idx)
                job_service.start_job(next_job_type, job_input)
        else:
            transition_fn, next_job_type = step
            job_input = transition_fn(input, output)
            job_service.start_job(next_job_type, job_input)


js = JobService()
sqlr = SQLRepo()


def handle_job_started(jobtype: JobType, input: JobInputBase):
    if isinstance(input, SdocProcessingJobInput):
        with sqlr.transaction() as db:
            crud_sdoc.update(
                db,
                id=input.sdoc_id,
                update_dto=SourceDocumentUpdate(
                    **{jobtype.value: SDocStatus.processing},  # type: ignore
                ),
            )


def handle_job_error(job_type: JobType, input: JobInputBase):
    if isinstance(input, SdocProcessingJobInput):
        with sqlr.transaction() as db:
            crud_sdoc.update(
                db,
                id=input.sdoc_id,
                update_dto=SourceDocumentUpdate(
                    **{job_type.value: SDocStatus.erroneous}  # type: ignore
                ),
            )


def handle_job_finished(
    job_type: JobType, input: JobInputBase, output: JobOutputBase | None
):
    if isinstance(input, SdocProcessingJobInput):
        with sqlr.transaction() as db:
            crud_sdoc.update(
                db,
                id=input.sdoc_id,
                update_dto=SourceDocumentUpdate(
                    **{job_type.value: SDocStatus.finished}  # type: ignore
                ),
            )

    execute_pipeline_step(job_type=job_type, input=input, output=output, job_service=js)
