from systems.artefact_system.artefact_dto import ArtefactComputationJobInput
from systems.job_system.job_dto import Job
from systems.job_system.job_register_decorator import register_job
from systems.job_system.job_system_enum import JobPriority, JobTiming

ARTEFACT_COMPUTATION_JOB = "artefact_computation"


@register_job(
    job_type=ARTEFACT_COMPUTATION_JOB,
    input_type=ArtefactComputationJobInput,
    priority=JobPriority.LOW,
    timeout=JobTiming.ONE_DAY,
)
def handle_artefact_computation_job(
    payload: ArtefactComputationJobInput, job: Job
) -> None:
    """Run the artefact computation that enabling or completing a feature
    started (`ArtefactService.handle_artefact_computation_job`)."""
    # imported here: ArtefactService imports ARTEFACT_COMPUTATION_JOB from this file
    from systems.artefact_system.artefact_service import ArtefactService

    ArtefactService().handle_artefact_computation_job(job=job, payload=payload)
