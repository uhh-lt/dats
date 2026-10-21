from common.job_type_enum import JobType
from modules.classifier.classifier_dto import ClassifierJobInput, ClassifierJobOutput
from modules.classifier.classifier_endpoint import router
from repos.db.sql_repo import SQLRepo
from systems.job_system.job_dto import Job
from systems.job_system.job_register_decorator import register_job
from systems.job_system.job_system_enum import EndpointGeneration, JobTiming

sqlr = SQLRepo()


@register_job(
    job_type=JobType.CLASSIFIER,
    input_type=ClassifierJobInput,
    output_type=ClassifierJobOutput,
    generate_endpoints=EndpointGeneration.ALL,
    publish_updates=True,
    router=router,
    device="gpu",
    result_ttl=JobTiming.NINETY_DAYS,
    timeout=JobTiming.ONE_DAY,
)
def handle_classifier_job(
    payload: ClassifierJobInput,
    job: Job,
) -> ClassifierJobOutput:
    from modules.classifier.classifier_service import ClassifierService

    with sqlr.transaction() as db:
        result = ClassifierService().handle_classifier_job(
            db=db,
            job=job,
            payload=payload,
        )

    return result
