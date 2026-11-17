from sqlalchemy.orm import Session

from modules.tag_recommendation.tag_recommendation_dto import (
    TagRecommendationJobInput,
)
from modules.tag_recommendation.tag_recommendation_feature import TAG_RECOMMENDATION
from modules.tag_recommendation.tag_recommendation_service import (
    TagRecommendationService,
)
from repos.db.sql_repo import SQLRepo
from systems.feature_system.feature_service import FeatureService
from systems.job_system.job_dto import Job
from systems.job_system.job_register_decorator import register_job
from systems.job_system.job_system_enum import EndpointGeneration, JobTiming

sqlr = SQLRepo()


def validate_tag_recommendation_input(
    db: Session, payload: TagRecommendationJobInput
) -> None:
    FeatureService().assert_enabled(
        db=db, project_id=payload.project_id, feature=TAG_RECOMMENDATION
    )


@register_job(
    job_type="tag_recommendation",
    input_type=TagRecommendationJobInput,
    validate_input=validate_tag_recommendation_input,
    generate_endpoints=EndpointGeneration.ALL,
    publish_updates=True,
    device="api",
    result_ttl=JobTiming.NINETY_DAYS,
)
def tag_recommendation_job(payload: TagRecommendationJobInput, job: Job) -> None:
    with sqlr.transaction() as db:
        TagRecommendationService().classify_untagged_documents(
            db=db,
            ml_job_id=job.get_id(),
            project_id=payload.project_id,
            tag_ids=payload.tag_ids,
            multi_class=payload.multi_class,
            method=payload.method,
        )
