"""Step runs: the start, the skip, the finish and the failure of the jobs that
compute pipeline steps of a document. A step run is one run of a job for some of
the steps of one document.

- `start_steps` is the only start of a step job: the advancing (here), the
  feature activation job and recompute call it. A retry requeues the stored job
  (`DocProcessingService.retry_jobs`), which re-enters through the hooks.
- `handle_job_started`, `handle_job_finished` and `handle_job_error` are the job
  lifecycle hooks the job handler calls around every job
  (`bootstrap.register_jobs`): they track the step statuses and start what
  follows a finished job, the entry points included.
"""

from loguru import logger

from common.job_type_enum import JobType
from common.sdoc_status_enum import SDocStatus
from core.doc.source_document_step_status_crud import crud_sdoc_step_status
from modules.doc_processing.doc_processing_dto import (
    ProcessingJobInput,
    ProcessingSettings,
    SdocInitJobOutput,
    SdocProcessingJobInput,
)
from modules.doc_processing.pipeline import pipeline_transitions as t
from modules.doc_processing.pipeline.pipeline_graph import pipeline_registry
from modules.doc_processing.pipeline.pipeline_operators import LoopBranchOperator
from repos.db.sql_repo import SQLRepo
from systems.job_system.job_dto import Job, JobInputBase, JobOutputBase
from systems.job_system.job_service import JobService
from systems.job_system.job_system_enum import JobPriority

# --- ENTRY POINTS ---
# Jobs that are no pipeline steps: they create the documents. Their successors
# are not derived from artefacts, as they loop over files or switch by doctype.
# The pipeline steps need no such table: a finished step starts its planned
# successors with a bare SdocProcessingJobInput, and the enricher of each
# successor loads its input from the data the steps before it stored.
# fmt: off
_ENTRY_POINTS = {
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
# fmt: on

js = JobService()
sqlr = SQLRepo()


def _computed_steps(job_type: JobType, input: SdocProcessingJobInput) -> list[JobType]:
    """The pipeline steps this run of the job computes."""
    return pipeline_registry.graph().job_steps(job_type, input.steps)


def _planned_steps(sdoc_id: int, steps: list[JobType]) -> list[JobType]:
    """The steps that are planned for the document (they have a status)."""
    with sqlr.transaction() as db:
        status = crud_sdoc_step_status.read_by_sdoc(db=db, sdoc_id=sdoc_id)
    return [step for step in steps if step in status]


def _pending_steps(sdoc_id: int, steps: list[JobType]) -> list[JobType]:
    """The steps that are planned for the document and not computed yet."""
    with sqlr.transaction() as db:
        status = crud_sdoc_step_status.read_by_sdoc(db=db, sdoc_id=sdoc_id)
    return [step for step in steps if status.get(step) == SDocStatus.processing]


def start_steps(
    *,
    project_id: int,
    sdoc_id: int,
    steps: list[JobType],
    settings: ProcessingSettings,
    raise_on_failure: bool,
    priority: JobPriority | None = None,
) -> dict[JobType, Job | None]:
    """Start the steps of the document: one job per job type that computes some
    of them, with a bare input, which the job's enricher completes from the
    document's stored data. Returns the started job per job type.

    A job that cannot start (e.g. its input data is missing) raises if
    `raise_on_failure`, and nothing is marked (recompute). Otherwise its steps
    and the pending steps after them become erroneous, like a failed job, its
    job type maps to None, and the other jobs still start (advancing, feature
    activation)."""
    started: dict[JobType, Job | None] = {}
    for job_type, job_steps in pipeline_registry.graph().group_by_job(steps).items():
        job_input = SdocProcessingJobInput(
            project_id=project_id, sdoc_id=sdoc_id, settings=settings, steps=job_steps
        )
        if raise_on_failure:
            started[job_type] = js.start_job(job_type, job_input, priority=priority)
            continue
        try:
            started[job_type] = js.start_job(job_type, job_input, priority=priority)
        except Exception as e:
            logger.warning(f"Cannot start {job_type.value} of document {sdoc_id}: {e}")
            handle_job_error(job_type, job_input)
            started[job_type] = None
    return started


def _start_planned(
    jobs: dict[JobType, list[JobType]], input: ProcessingJobInput, sdoc_id: int
) -> None:
    """Start each job for its steps that are planned for the document, with the
    settings of the run."""
    if not jobs:
        return
    with sqlr.transaction() as db:
        status = crud_sdoc_step_status.read_by_sdoc(db=db, sdoc_id=sdoc_id)
    for steps in jobs.values():
        planned = [step for step in steps if step in status]
        if not planned:
            continue
        start_steps(
            project_id=input.project_id,
            sdoc_id=sdoc_id,
            steps=planned,
            settings=input.settings,
            raise_on_failure=False,
        )


def _start_next(
    job_type: JobType, input: JobInputBase, output: JobOutputBase | None
) -> None:
    """Start what follows a finished job: the planned successors of the steps it
    computed, the root steps of a new document, and the jobs of entry points."""
    graph = pipeline_registry.graph()
    if isinstance(input, SdocProcessingJobInput):
        # only the steps this run computed start their successors, so recomputing
        # e.g. the named entities does not start the steps after tokens and sentences
        finished_steps = _computed_steps(job_type, input)
        _start_planned(graph.next_jobs(finished_steps), input, input.sdoc_id)

        # steps of this job that were planned while it ran (a feature activation
        # plans e.g. the keywords while the spaCy job runs for tokens only): run
        # the job again for them
        others = [s for s in graph.job_steps(job_type) if s not in finished_steps]
        pending = _pending_steps(input.sdoc_id, others) if others else []
        if pending:
            start_steps(
                project_id=input.project_id,
                sdoc_id=input.sdoc_id,
                steps=pending,
                settings=input.settings,
                raise_on_failure=False,
            )

    if job_type == JobType.SDOC_INIT:
        assert isinstance(input, ProcessingJobInput), "Expected ProcessingJobInput"
        assert isinstance(output, SdocInitJobOutput), "Expected SdocInitJobOutput"
        roots = graph.group_by_job(graph.roots(output.doctype))
        _start_planned(roots, input, output.sdoc_id)

    for step in _ENTRY_POINTS.get(job_type, []):
        if isinstance(step, LoopBranchOperator):
            jobs = step.get_next_jobs(input, output)
            for transition_fn, next_job_type, idx in jobs:
                job_input = transition_fn(input, output, idx)
                js.start_job(next_job_type, job_input)
        else:
            transition_fn, next_job_type = step
            job_input = transition_fn(input, output)
            js.start_job(next_job_type, job_input)


def _set_status(
    job_type: JobType,
    input: JobInputBase,
    status: SDocStatus,
    steps: list[JobType] | None = None,
) -> None:
    """Set the status of the steps this run of the job computes (or of `steps`)."""
    if not isinstance(input, SdocProcessingJobInput):
        return
    if steps is None:
        steps = _computed_steps(job_type, input)
    if not steps:
        return
    with sqlr.transaction() as db:
        crud_sdoc_step_status.update_status(
            db=db, sdoc_ids=[input.sdoc_id], steps=steps, status=status
        )


def handle_job_started(jobtype: JobType, input: JobInputBase) -> JobInputBase | None:
    """Set the steps of the run to processing and return the input to run. Steps
    that are not planned for the document anymore (their feature was disabled
    while the job waited in the queue) are dropped from the run: the returned
    input is a copy narrowed to the planned steps, the stored input is never
    changed. Returns None if no step is left, and the job is skipped."""
    if isinstance(input, SdocProcessingJobInput):
        computed = _computed_steps(jobtype, input)
        planned = _planned_steps(input.sdoc_id, computed)
        if not planned:
            logger.info(
                f"Skipping job {jobtype.value} of document {input.sdoc_id}: "
                f"its steps are not planned anymore."
            )
            return None
        if len(planned) < len(computed):
            input = input.model_copy(update={"steps": planned})
    _set_status(jobtype, input, SDocStatus.processing)
    return input


def handle_job_error(job_type: JobType, input: JobInputBase) -> None:
    """Set the steps of the run to erroneous, and the pending steps after them
    too: they cannot run without their input, so they do not stay processing.
    Recomputing the input starts them again (see `_start_next`)."""
    if not isinstance(input, SdocProcessingJobInput):
        return
    # a step unplanned while the job ran (its feature was disabled) stays unplanned
    computed = _computed_steps(job_type, input)
    _set_status(
        job_type, input, SDocStatus.erroneous, _planned_steps(input.sdoc_id, computed)
    )
    with sqlr.transaction() as db:
        crud_sdoc_step_status.update_pending_to_erroneous(
            db=db,
            sdoc_id=input.sdoc_id,
            steps=pipeline_registry.graph().descendants(computed),
        )


def handle_job_finished(
    job_type: JobType, input: JobInputBase, output: JobOutputBase | None
) -> None:
    """Set the steps of the run to finished and start what follows the job."""
    _set_status(job_type, input, SDocStatus.finished)
    _start_next(job_type=job_type, input=input, output=output)
