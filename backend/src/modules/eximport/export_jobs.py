from modules.eximport.export_job_dto import ExportJobInput, ExportJobOutput
from systems.job_system.job_dto import EndpointGeneration, JobPriority
from systems.job_system.job_register_decorator import register_job


@register_job(
    job_type="export",
    input_type=ExportJobInput,
    output_type=ExportJobOutput,
    priority=JobPriority.DEFAULT,
    generate_endpoints=EndpointGeneration.MINIMAL,
)
def export_data(
    payload: ExportJobInput,
) -> ExportJobOutput:
    from modules.eximport.export_service import ExportService

    return ExportService().handle_export_job(
        payload=payload,
    )
