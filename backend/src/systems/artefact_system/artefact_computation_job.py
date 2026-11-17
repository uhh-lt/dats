from systems.artefact_system.artefact_dto import ArtefactComputationJobInput
from systems.artefact_system.artefact_service import ArtefactService
from systems.job_system.job_dto import Job
from systems.job_system.job_register_decorator import register_job
from systems.job_system.job_system_enum import JobPriority, JobTiming


@register_job(
    job_type="artefact_computation",
    input_type=ArtefactComputationJobInput,
    priority=JobPriority.LOW,
    timeout=JobTiming.ONE_DAY,
)
def handle_artefact_computation_job(
    payload: ArtefactComputationJobInput, job: Job
) -> None:
    """Run the artefact computation that enabling or completing a feature
    started (`ArtefactService.handle_artefact_computation_job`)."""
    ArtefactService().handle_artefact_computation_job(job=job, payload=payload)
