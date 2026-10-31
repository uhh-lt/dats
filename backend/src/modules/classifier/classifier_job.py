from sqlalchemy.orm import Session

from common.job_type_enum import JobType
from core.user.user_service import UserService
from modules.classifier.classifier_dto import (
    ClassifierInferenceParams,
    ClassifierJobInput,
    ClassifierJobOutput,
)
from modules.classifier.classifier_endpoint import router
from repos.db.sql_repo import SQLRepo
from systems.job_system.job_dto import Job
from systems.job_system.job_register_decorator import register_job
from systems.job_system.job_system_enum import EndpointGeneration, JobTiming

sqlr = SQLRepo()


def validate_classifier_input(db: Session, payload: ClassifierJobInput) -> None:
    """Span and sentence classifiers write their predictions into a virtual user
    of the project, never into another user's annotations."""
    parameters = payload.task_parameters
    if (
        isinstance(parameters, ClassifierInferenceParams)
        and parameters.virtual_user_id is not None
    ):
        UserService().assert_virtual_user(
            db=db, user_id=parameters.virtual_user_id, project_id=payload.project_id
        )


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
    validate_input=validate_classifier_input,
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
