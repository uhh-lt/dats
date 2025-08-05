import rq
from modules.perspectives.perspectives_job_dto import PerspectivesJobInput
from systems.job_system.job_dto import EndpointGeneration, JobPriority
from systems.job_system.job_register_decorator import register_job


@register_job(
    job_type="perspectives",
    input_type=PerspectivesJobInput,
    output_type=None,
    priority=JobPriority.DEFAULT,
    generate_endpoints=EndpointGeneration.NONE,
)
def perspectives_job(
    payload: PerspectivesJobInput,
) -> None:
    from modules.perspectives.perspectives_service import PerspectivesService

    job = rq.get_current_job()
    assert job is not None, "Job must be running in a worker context"
    ps = PerspectivesService(job=job)
    ps.handle_perspectives_job(payload=payload)
