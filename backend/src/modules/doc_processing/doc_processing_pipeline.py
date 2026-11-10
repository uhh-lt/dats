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
    (JobType.TEXT_EXTRACTION, JobType.TEXT_DOCUMENT_EMBEDDING): t.text_extraction_to_document_embedding,
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
    transition function belongs to no edge. The edges are between the jobs that
    compute the steps."""
    graph = pipeline_registry.graph()
    step_edges = graph.edges() | {
        (JobType.SDOC_INIT, root)
        for doctype in DocType
        for root in graph.roots(doctype)
    }
    edges = {(graph.job(a), graph.job(b)) for a, b in step_edges}
    problems = [
        f"No transition function for the edge '{a.value}' -> '{b.value}'."
        for a, b in sorted(edges - TRANSITIONS.keys())
    ] + [
        f"The transition function for '{a.value}' -> '{b.value}' belongs to no edge."
        for a, b in sorted(TRANSITIONS.keys() - edges)
    ]
    if problems:
        raise PipelineDeclarationError(problems)


js = JobService()
sqlr = SQLRepo()


def _computed_steps(job_type: JobType, input: SdocProcessingJobInput) -> list[JobType]:
    """The pipeline steps this run of the job computes."""
    return pipeline_registry.graph().job_steps(job_type, input.steps)


def _planned_steps(sdoc_id: int, steps: list[JobType]) -> list[JobType]:
    """The steps that are planned for the document (status not NULL)."""
    with sqlr.transaction() as db:
        sdoc = crud_sdoc.read(db=db, id=sdoc_id)
        return [step for step in steps if getattr(sdoc, step.value) is not None]


def _pending_steps(sdoc_id: int, steps: list[JobType]) -> list[JobType]:
    """The steps that are planned for the document and not computed yet."""
    with sqlr.transaction() as db:
        sdoc = crud_sdoc.read(db=db, id=sdoc_id)
        return [
            step
            for step in steps
            if getattr(sdoc, step.value) == SDocStatus.processing.value
        ]


def _start_jobs(
    jobs: dict[JobType, list[JobType]],
    job_type: JobType,
    input: JobInputBase,
    output: JobOutputBase | None,
    job_service: JobService,
) -> None:
    """Start each job for its steps that are planned for the document."""
    for next_job_type, steps in jobs.items():
        transition_fn = TRANSITIONS[(job_type, next_job_type)]
        job_input = transition_fn(input, output)
        if isinstance(job_input, SdocProcessingJobInput):
            planned = _planned_steps(job_input.sdoc_id, steps)
            if len(planned) == 0:
                continue
            job_input.steps = planned
        job_service.start_job(next_job_type, job_input)


def execute_pipeline_step(job_type: JobType, input, output, job_service):
    graph = pipeline_registry.graph()
    if job_type == JobType.SDOC_INIT:
        assert isinstance(output, SdocInitJobOutput), "Expected SdocInitJobOutput"
        root_jobs = graph.group_by_job(graph.roots(output.doctype))
        _start_jobs(root_jobs, job_type, input, output, job_service)
    # only the steps this run computed start their successors, so recomputing
    # e.g. the named entities does not start the steps after tokens and sentences
    finished_steps = (
        _computed_steps(job_type, input)
        if isinstance(input, SdocProcessingJobInput)
        else [job_type]
    )
    _start_jobs(graph.next_jobs(finished_steps), job_type, input, output, job_service)

    # steps of this job that were planned while it ran (a feature activation
    # plans e.g. the keywords while the spaCy job runs for tokens only): run the
    # job again for them
    if isinstance(input, SdocProcessingJobInput):
        others = [s for s in graph.job_steps(job_type) if s not in finished_steps]
        pending = _pending_steps(input.sdoc_id, others) if others else []
        if pending:
            job_service.start_job(job_type, input.model_copy(update={"steps": pending}))

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


def _set_status(job_type: JobType, input: JobInputBase, status: SDocStatus) -> None:
    """Set the status of the steps this run of the job computes."""
    if not isinstance(input, SdocProcessingJobInput):
        return
    with sqlr.transaction() as db:
        crud_sdoc.update(
            db=db,
            id=input.sdoc_id,
            update_dto=SourceDocumentUpdate.model_validate(
                {step.value: status for step in _computed_steps(job_type, input)}
            ),
        )


def handle_job_started(jobtype: JobType, input: JobInputBase):
    _set_status(jobtype, input, SDocStatus.processing)


def handle_job_error(job_type: JobType, input: JobInputBase):
    _set_status(job_type, input, SDocStatus.erroneous)


def handle_job_finished(
    job_type: JobType, input: JobInputBase, output: JobOutputBase | None
):
    _set_status(job_type, input, SDocStatus.finished)
    execute_pipeline_step(job_type=job_type, input=input, output=output, job_service=js)
