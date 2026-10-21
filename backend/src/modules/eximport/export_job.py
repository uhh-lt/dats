from common.job_type_enum import JobType
from modules.eximport.export_job_dto import ExportJobInput, ExportJobOutput
from repos.db.sql_repo import SQLRepo
from systems.job_system.job_dto import Job
from systems.job_system.job_register_decorator import register_job
from systems.job_system.job_system_enum import EndpointGeneration


@register_job(
    job_type=JobType.EXPORT,
    input_type=ExportJobInput,
    output_type=ExportJobOutput,
    generate_endpoints=EndpointGeneration.MINIMAL,
    publish_updates=True,
)
def export_data(payload: ExportJobInput, job: Job) -> ExportJobOutput:
    from modules.eximport.export_service import ExportService

    with SQLRepo().transaction() as db:
        return ExportService().handle_export_job(
            db=db,
            payload=payload,
        )
