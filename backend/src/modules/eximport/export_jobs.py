from common.job_type import JobType
from modules.eximport.export_job_dto import ExportJobInput, ExportJobOutput
from systems.job_system.job_dto import EndpointGeneration, Job
from systems.job_system.job_register_decorator import register_job


@register_job(
    job_type=JobType.EXPORT,
    input_type=ExportJobInput,
    output_type=ExportJobOutput,
    generate_endpoints=EndpointGeneration.MINIMAL,
)
def export_data(payload: ExportJobInput, job: Job) -> ExportJobOutput:
    from modules.eximport.export_service import ExportService

    return ExportService().handle_export_job(
        payload=payload,
    )
