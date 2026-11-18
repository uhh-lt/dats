import time
from collections.abc import Generator

import pytest
import rq
from rq.registry import StartedJobRegistry

from core.user.user_orm import UserORM
from feature_test_utils import FeaturelessProject, create_featureless_project
from modules.tag_recommendation.tag_recommendation_dto import (
    TagRecommendationJobInput,
)
from systems.job_system.job_dto import Job, JobInputBase
from systems.job_system.job_handler import rq_job_handler
from systems.job_system.job_register_decorator import register_job
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


# the status message of a stoppable job while it waits to be stopped
STOPPABLE_JOB_WAITING = "Waiting to be stopped"
# how long a stoppable job waits, unless it is stopped
STOPPABLE_JOB_SECONDS = 60


# module-level: RQ pickles a job's handler by reference
def _wait_to_be_stopped(payload: JobInputBase, job: Job) -> None:
    job.update(status_message=STOPPABLE_JOB_WAITING, publish=False)
    time.sleep(STOPPABLE_JOB_SECONDS)


@pytest.fixture(scope="function")
def stoppable_job_type(request: pytest.FixtureRequest) -> Generator[str, None, None]:
    """A job type (`test_stoppable_<device>`) on the device given as the param
    (`cpu`: run in the process of a `DATSSimpleWorker`, `gpu`: in a process
    forked by a `DATSWorker`), which the background worker runs. Its job sets
    the status message `STOPPABLE_JOB_WAITING`, then sleeps for
    `STOPPABLE_JOB_SECONDS` in one blocking call and finishes, unless it is
    stopped. It publishes no updates. The fixture removes the job type again."""
    device = request.param
    job_type = f"test_stoppable_{device}"
    register_job(job_type=job_type, input_type=JobInputBase, device=device)(
        _wait_to_be_stopped
    )
    yield job_type
    JobService().job_registry.pop(job_type)


# the status message of a failing job
FAILING_JOB_ERROR = "The job failed"


# module-level: RQ pickles a job's handler by reference
def _fail(payload: JobInputBase, job: Job) -> None:
    raise RuntimeError(FAILING_JOB_ERROR)


@pytest.fixture(scope="function")
def failing_job_type() -> Generator[str, None, None]:
    """A job type (`test_failing`) whose job raises `FAILING_JOB_ERROR`. It
    publishes no updates. The fixture removes the job type again."""
    job_type = "test_failing"
    register_job(job_type=job_type, input_type=JobInputBase, device="api")(_fail)
    yield job_type
    JobService().job_registry.pop(job_type)


def expires_at(registry: StartedJobRegistry, job_id: str) -> float:
    """When the entry of the job in the started registry expires, unless its
    worker renews it (a timestamp)."""
    entries = [
        f"{entry_job_id}:{execution_id}"
        for entry_job_id, execution_id in registry.get_job_and_execution_ids(
            cleanup=False
        )
        if entry_job_id == job_id
    ]
    assert len(entries) == 1, entries
    connection = registry.connection
    assert connection is not None
    score = connection.zscore(registry.key, entries[0])
    assert score is not None
    return float(score)


# how long a heartbeat job runs, a few monitoring intervals of the held jobs
HEARTBEAT_JOB_SECONDS = 3


# module-level: RQ pickles a job's handler by reference
def _record_heartbeats(payload: JobInputBase, job: Job) -> None:
    registry = StartedJobRegistry(name=job.job.origin, connection=job.job.connection)
    heartbeats = [(time.time(), expires_at(registry, job.get_id()))]
    time.sleep(HEARTBEAT_JOB_SECONDS)
    heartbeats.append((time.time(), expires_at(registry, job.get_id())))
    job.job.meta["heartbeats"] = heartbeats
    job.job.save_meta()


@pytest.fixture(scope="function")
def heartbeat_job_type() -> Generator[str, None, None]:
    """A job type (`test_heartbeat`) whose job runs for `HEARTBEAT_JOB_SECONDS`
    and stores in its meta (`heartbeats`) when its entry in the started registry
    expires, as (now, expires at), at its start and its end. It publishes no
    updates. The fixture removes the job type again."""
    job_type = "test_heartbeat"
    register_job(job_type=job_type, input_type=JobInputBase, device="api")(
        _record_heartbeats
    )
    yield job_type
    JobService().job_registry.pop(job_type)
