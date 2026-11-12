from loguru import logger

from common.job_type_enum import JobType
from modules.doc_processing.doc_processing_dto import FeatureActivationJobInput
from modules.doc_processing.step_planning_service import StepPlanningService
from modules.doc_processing.step_run import start_steps
from repos.db.sql_repo import SQLRepo
from systems.job_system.job_dto import Job
from systems.job_system.job_register_decorator import register_job
from systems.job_system.job_system_enum import JobPriority, JobTiming

sqlr = SQLRepo()


@register_job(
    job_type=JobType.FEATURE_ACTIVATION,
    input_type=FeatureActivationJobInput,
    priority=JobPriority.LOW,
    timeout=JobTiming.ONE_DAY,
)
def handle_feature_activation_job(payload: FeatureActivationJobInput, job: Job) -> None:
    """Plan and start the steps that enabling, completing or restarting a feature
    needs for the project's existing documents, in batches of documents with one
    transaction each (`StepPlanningService.plan_activation_batch`), on the
    low-priority queue with the settings chosen by the user. After each batch
    commits, its steps whose inputs are finished start, enriched like a
    recompute; the steps after them start through the normal advancing. A step
    job that cannot be started (its input data is missing) sets its steps and the
    pending steps after them to erroneous, like a failed job, and the other
    documents still start.

    The job stops when the feature is disabled or another activation of it
    replaces this one. At the end, also when it fails, it removes the feature's
    pending activation, so the feature reads partly available and Complete plans
    the documents it did not reach."""
    service = StepPlanningService()
    logger.info(
        f"Planning {payload.feature.value} for the documents of project "
        f"{payload.project_id} up to {payload.last_sdoc_id}..."
    )
    after_sdoc_id = 0
    documents = 0
    failed = 0
    try:
        while True:
            with sqlr.transaction() as db:
                batch = service.plan_activation_batch(
                    db=db, activation=payload, after_sdoc_id=after_sdoc_id
                )
            if batch is None:
                break
            after_sdoc_id, sdoc_steps = batch
            for sdoc_id, steps in sdoc_steps.items():
                started = start_steps(
                    project_id=payload.project_id,
                    sdoc_id=sdoc_id,
                    steps=steps,
                    settings=payload.settings,
                    raise_on_failure=False,
                    priority=JobPriority.LOW,
                )
                failed += sum(job is None for job in started.values())
            documents += len(sdoc_steps)
            job.update(
                status_message=f"Planned the documents up to {after_sdoc_id} of "
                f"{payload.last_sdoc_id}; started the steps of {documents} documents"
            )
    finally:
        with sqlr.transaction() as db:
            service.finish_activation(db=db, activation=payload)
    if failed:
        job.update(
            status_message=f"Started the steps of {documents} documents; {failed} "
            f"step jobs could not start, their steps are erroneous"
        )
