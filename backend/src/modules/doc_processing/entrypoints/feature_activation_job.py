from loguru import logger

from common.job_type_enum import JobType
from modules.doc_processing.doc_processing_dto import SdocProcessingJobInput
from modules.doc_processing.doc_processing_pipeline import start_step_job
from systems.feature_system.feature_dto import FeatureActivationJobInput
from systems.job_system.job_dto import Job
from systems.job_system.job_register_decorator import register_job
from systems.job_system.job_system_enum import JobPriority, JobTiming
from systems.job_system.pipeline_graph import pipeline_registry


@register_job(
    job_type=JobType.FEATURE_ACTIVATION,
    input_type=FeatureActivationJobInput,
    priority=JobPriority.LOW,
    timeout=JobTiming.ONE_DAY,
)
def handle_feature_activation_job(payload: FeatureActivationJobInput, job: Job) -> None:
    """Start the steps that a feature activation planned for existing documents,
    on the low-priority queue, with the settings chosen by the user. Each step job
    is enriched with the document's data like a recompute; the steps after it
    start through the normal advancing. A step job that cannot be started (its
    input data is missing) sets its steps and the pending steps after them to
    erroneous, like a failed job, and the other documents still start."""
    graph = pipeline_registry.graph()
    total = len(payload.sdoc_steps)
    failed = 0
    logger.info(
        f"Starting the newly planned steps of {total} documents of project "
        f"{payload.project_id}..."
    )
    for idx, (sdoc_id, steps) in enumerate(payload.sdoc_steps.items()):
        for job_type, job_steps in graph.group_by_job(steps).items():
            job_input = SdocProcessingJobInput(
                project_id=payload.project_id,
                sdoc_id=sdoc_id,
                settings=payload.settings,
                steps=job_steps,
            )
            if not start_step_job(job_type, job_input, priority=JobPriority.LOW):
                failed += 1
        if idx % 1000 == 0:
            job.update(status_message=f"Started the steps of {idx}/{total} documents")
    if failed:
        job.update(
            status_message=f"Started the steps of {total} documents; {failed} "
            f"step jobs could not start, their steps are erroneous"
        )
