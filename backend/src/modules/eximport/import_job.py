from common.job_type import JobType
from modules.eximport.import_job_dto import ImportJobInput
from repos.db.sql_repo import SQLRepo
from systems.job_system.job_dto import Job
from systems.job_system.job_register_decorator import register_job


@register_job(job_type=JobType.IMPORT, input_type=ImportJobInput)
def import_data(payload: ImportJobInput, job: Job) -> None:
    from modules.eximport.import_service import ImportService

    with SQLRepo().transaction() as db:
        return ImportService().handle_import_job(
            db=db,
            payload=payload,
        )
