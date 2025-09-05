from common.job_type import JobType
from modules.perspectives.perspectives_job_dto import PerspectivesJobInput
from repos.db.sql_repo import SQLRepo
from systems.job_system.job_dto import Job, JobResultTTL
from systems.job_system.job_register_decorator import register_job

sqlr = SQLRepo()


@register_job(
    job_type=JobType.PERSPECTIVES,
    input_type=PerspectivesJobInput,
    device="api",
    result_ttl=JobResultTTL.NINETY_DAYS,
)
def perspectives_job(payload: PerspectivesJobInput, job: Job) -> None:
    from modules.perspectives.perspectives_service import PerspectivesService

    with sqlr.db_session() as db:
        ps = PerspectivesService(job=job)
        ps.handle_perspectives_job(db=db, payload=payload)
