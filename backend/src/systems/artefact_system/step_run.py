"""Step runs: the start, the skip, the finish and the failure of the jobs that
compute pipeline steps of a document. A step run is one run of a job for some of
the steps of one document.

- `start_steps` is the only start of a step job: the advancing (here), the
  feature activation job and recompute call it. A retry requeues the stored job
  (`DocProcessingService.retry_jobs`), which re-enters through the hooks.
- `handle_job_started`, `handle_job_finished` and `handle_job_error` are the job
  lifecycle hooks the job system calls around every job
  (`bootstrap.register_jobs`): they track the step statuses and start what
  follows a finished job, the entry points included. `handle_job_error` runs
  for every failed job, also when its worker died (RQ's failure callback).

One failure rule: whatever goes wrong, the step becomes erroneous, with the
pending steps after it, and Complete or Recompute starts it again. See
`systems/artefact_system/README.md`.
"""

from loguru import logger

from common.job_type_enum import JobType
from common.sdoc_status_enum import SDocStatus
from modules.doc_processing.doc_processing_dto import (
    FeatureActivationJobInput,
    SdocInitJobOutput,
)
from modules.doc_processing.pipeline import pipeline_transitions as t
from modules.doc_processing.pipeline.pipeline_operators import LoopBranchOperator
from repos.db.sql_repo import SQLRepo
from systems.artefact_system.artefact_dto import (
    ProcessingJobInput,
    ProcessingSettings,
    SdocProcessingJobInput,
)
from systems.artefact_system.artefact_registry import artefact_registry
from systems.artefact_system.source_document_step_status_crud import (
    crud_sdoc_step_status,
)
from systems.job_system.job_dto import Job, JobInputBase, JobOutputBase
from systems.job_system.job_exceptions import JobInputError, JobQueueUnavailableError
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
    return artefact_registry.graph().job_steps(job_type, input.steps)


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
    priority: JobPriority | None = None,
) -> dict[JobType, Job | None]:
    """Start the steps of the document: one job per job type that computes some
    of them, with a bare input, which the job's enricher completes from the
    document's stored data. Returns the started job per job type.

    A job that cannot be queued, because its input cannot be built (the
    document's input data is missing) or the queue (Redis) cannot be reached,
    does not start: its steps and the pending steps after them become
    erroneous, like after a failed job, its job type maps to None, and the
    other jobs still start. Anything else raises as it is."""
    started: dict[JobType, Job | None] = {}
    for job_type, job_steps in artefact_registry.graph().group_by_job(steps).items():
        job_input = SdocProcessingJobInput(
            project_id=project_id, sdoc_id=sdoc_id, settings=settings, steps=job_steps
        )
        try:
            started[job_type] = js.start_job(job_type, job_input, priority=priority)
        except (JobInputError, JobQueueUnavailableError) as e:
            logger.warning(f"Cannot start {job_type.value} of document {sdoc_id}: {e}")
            handle_job_error(job_type, job_input)
            started[job_type] = None
    return started


def _start_planned(
    jobs: dict[JobType, list[JobType]], input: ProcessingJobInput, sdoc_id: int
) -> None:
    """Start each job for its steps that are planned for the document, with the
    settings of the run. The job that finished stays finished: a step that
    cannot start becomes erroneous itself (`start_steps`)."""
    if not jobs:
        return
    with sqlr.transaction() as db:
        status = crud_sdoc_step_status.read_by_sdoc(db=db, sdoc_id=sdoc_id)
    planned = [step for steps in jobs.values() for step in steps if step in status]
    if planned:
        start_steps(
            project_id=input.project_id,
            sdoc_id=sdoc_id,
            steps=planned,
            settings=input.settings,
        )


def _start_next(
    job_type: JobType, input: JobInputBase, output: JobOutputBase | None
) -> None:
    """Start what follows a finished job: the planned successors of the steps it
    computed, the root steps of a new document, and the jobs of entry points."""
    graph = artefact_registry.graph()
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
            _start_planned({job_type: pending}, input, input.sdoc_id)

    if job_type == JobType.SDOC_INIT:
        assert isinstance(input, ProcessingJobInput), "Expected ProcessingJobInput"
        assert isinstance(output, SdocInitJobOutput), "Expected SdocInitJobOutput"
        roots = graph.group_by_job(graph.roots(output.doctype))
        _start_planned(roots, input, output.sdoc_id)

    # like _start_planned, a queue outage is only logged: the finished job (e.g.
    # extract_html, which starts the sdoc_init of its extracted images) stays
    # finished, as its data is stored
    try:
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
    except JobQueueUnavailableError as e:
        logger.error(f"Cannot start the jobs after a finished {job_type.value}: {e}")


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


def handle_job_started(jobtype: JobType, input: JobInputBase) -> None:
    """Set the steps of the run to processing (a retried job's steps are
    erroneous until then)."""
    _set_status(jobtype, input, SDocStatus.processing)


def handle_job_error(job_type: JobType, input: JobInputBase) -> None:
    """Set the steps of the run to erroneous, and the pending steps after them
    too: they cannot run without their input, so they do not stay processing.
    Recomputing the input starts them again (see `_start_next`). A failed
    feature activation ends (`StepPlanningService.end_activation`)."""
    if isinstance(input, FeatureActivationJobInput):
        # imported here: the step planning starts its steps with `start_steps`
        from modules.doc_processing.step_planning_service import StepPlanningService

        with sqlr.transaction() as db:
            StepPlanningService().end_activation(db=db, activation=input)
        return
    if not isinstance(input, SdocProcessingJobInput):
        return
    _set_status(job_type, input, SDocStatus.erroneous)
    with sqlr.transaction() as db:
        crud_sdoc_step_status.update_pending_to_erroneous(
            db=db,
            sdoc_id=input.sdoc_id,
            steps=artefact_registry.graph().descendants(
                _computed_steps(job_type, input)
            ),
        )


def handle_job_finished(
    job_type: JobType, input: JobInputBase, output: JobOutputBase | None
) -> None:
    """Set the steps of the run to finished and start what follows the job."""
    _set_status(job_type, input, SDocStatus.finished)
    _start_next(job_type=job_type, input=input, output=output)
