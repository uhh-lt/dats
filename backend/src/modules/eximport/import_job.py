from modules.eximport.import_job_dto import ImportJobInput, ImportJobRead
from repos.db.sql_repo import SQLRepo
from systems.job_system.job_dto import Job
from systems.job_system.job_register_decorator import register_job
from systems.job_system.job_system_enum import EndpointGeneration


@register_job(
    job_type="import",
    input_type=ImportJobInput,
    # started by the upload route of import_endpoint.py
    generate_endpoints=EndpointGeneration.READ,
    publish_updates=True,
    read_model=ImportJobRead,
)
def import_data(payload: ImportJobInput, job: Job) -> None:
    from modules.eximport.import_service import ImportService

    with SQLRepo().transaction() as db:
        ImportService().handle_import_job(
            db=db,
            payload=payload,
        )
