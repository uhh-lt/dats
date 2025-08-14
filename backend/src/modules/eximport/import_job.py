from common.job_type import JobType
from modules.eximport.import_job_dto import ImportJobInput
from systems.job_system.job_dto import Job
from systems.job_system.job_register_decorator import register_job


@register_job(job_type=JobType.IMPORT, input_type=ImportJobInput)
def import_data(payload: ImportJobInput, job: Job) -> None:
    from modules.eximport.import_service import ImportService

    return ImportService().handle_import_job(
        payload=payload,
    )
