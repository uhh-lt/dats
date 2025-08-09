from common.job_type import JobType
from modules.perspectives.perspectives_job_dto import PerspectivesJobInput
from systems.job_system.job_dto import Job
from systems.job_system.job_register_decorator import register_job


@register_job(
    job_type=JobType.PERSPECTIVES,
    input_type=PerspectivesJobInput,
)
def perspectives_job(payload: PerspectivesJobInput, job: Job) -> None:
    from modules.perspectives.perspectives_service import PerspectivesService

    ps = PerspectivesService(job=job)
    ps.handle_perspectives_job(payload=payload)
