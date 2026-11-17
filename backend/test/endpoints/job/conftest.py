import pytest
import rq

from core.user.user_orm import UserORM
from feature_test_utils import FeaturelessProject, create_featureless_project
from modules.tag_recommendation.tag_recommendation_dto import (
    TagRecommendationJobInput,
)
from systems.job_system.job_handler import rq_job_handler
from systems.job_system.job_service import JobService


@pytest.fixture(scope="function")
def featureless_project(db_session, test_user: UserORM) -> FeaturelessProject:
    """
    This fixture sets up the following project, in addition to `test_project`
    (which enables the features that are on by default):

    - project: "Featureless Project" of `test_user`, without any enabled feature
    - sdoc: text document "text_done.txt" in it, with the steps of a project
      without features finished
    """
    return create_featureless_project(db_session, test_user)


@pytest.fixture(scope="function")
def featureless_tag_recommendation_job(featureless_project: FeaturelessProject) -> str:
    """The id of a tag recommendation job of `featureless_project` (like a job
    started before the feature was disabled). The job is stored, not enqueued,
    so no worker runs it."""
    js = JobService()
    job = rq.job.Job.create(
        rq_job_handler,
        kwargs={
            "jobtype": "tag_recommendation",
            "handler": None,
            "payload": TagRecommendationJobInput(
                project_id=featureless_project["project"].id
            ),
        },
        meta={
            "type": "tag_recommendation",
            "project_id": featureless_project["project"].id,
        },
        connection=js.redis_conn,
    )
    job.save()
    return job.id
