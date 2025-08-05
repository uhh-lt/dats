from modules.eximport.import_job_dto import ImportJobInput
from systems.job_system.job_dto import EndpointGeneration, JobPriority
from systems.job_system.job_register_decorator import register_job


@register_job(
    job_type="import",
    input_type=ImportJobInput,
    output_type=None,
    priority=JobPriority.DEFAULT,
    generate_endpoints=EndpointGeneration.NONE,
)
def import_data(
    payload: ImportJobInput,
) -> None:
    from modules.eximport.import_service import ImportService

    return ImportService().handle_import_job(
        payload=payload,
    )
