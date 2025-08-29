from common.job_type import JobType
from modules.classifier.classifier_dto import ClassifierJobInput, ClassifierJobOutput
from modules.classifier.classifier_endpoint import router
from repos.db.sql_repo import SQLRepo
from systems.job_system.job_dto import EndpointGeneration, Job, JobResultTTL
from systems.job_system.job_register_decorator import register_job

sqlr = SQLRepo()


@register_job(
    job_type=JobType.CLASSIFIER,
    input_type=ClassifierJobInput,
    output_type=ClassifierJobOutput,
    generate_endpoints=EndpointGeneration.ALL,
    router=router,
    device="gpu",
    result_ttl=JobResultTTL.NINETY_DAYS,
    timeout=-1,  # infinite/no timeout
)
def handle_classifier_job(
    payload: ClassifierJobInput,
    job: Job,
) -> ClassifierJobOutput:
    from modules.classifier.classifier_service import ClassifierService

    with sqlr.db_session() as db:
        result = ClassifierService().handle_classifier_job(
            db=db,
            job=job,
            payload=payload,
        )

    return result
