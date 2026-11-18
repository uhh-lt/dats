"""End-to-end tests of stopping a job (`JobService.stop_job`, behind the
generated `/job/{job_type}/{job_id}/abort` routes) that the background worker
runs: a started job really stops and ends as STOPPED, a queued job is left as
it is."""

import time
from collections.abc import Callable

import pytest
import rq

from core.project.project_orm import ProjectORM
from job_test_utils import HeldJobs
from systems.job_system.job_dto import JobInputBase
from systems.job_system.job_service import JobService
from systems.job_system.job_system_enum import JobStatus
from worker import DATSSimpleWorker

from .conftest import FAILING_JOB_ERROR, STOPPABLE_JOB_SECONDS, STOPPABLE_JOB_WAITING


def _wait_until(condition: Callable[[], bool], timeout: float, what: str) -> None:
    deadline = time.monotonic() + timeout
    while not condition():
        if time.monotonic() > deadline:
            pytest.fail(f"Timed out after {timeout}s waiting until {what}")
        time.sleep(0.1)


# ===========================================================================
# STOP JOB TESTS
# ===========================================================================


@pytest.mark.parametrize(
    "stoppable_job_type",
    [
        # the worker runs the job in its own process and interrupts it
        pytest.param("cpu", id="simple-worker"),
        # the worker runs the job in a forked process and kills it
        pytest.param("gpu", id="forking-worker"),
    ],
    indirect=True,
)
def test_stop_job_stops_a_started_job(
    stoppable_job_type: str, test_project: ProjectORM
):
    """A started job is interrupted long before it would finish, and ends as
    STOPPED with the stop as its status message, also in the job list."""
    js = JobService()
    job_id = js.start_job(
        stoppable_job_type, JobInputBase(project_id=test_project.id)
    ).get_id()
    # the handler runs (not only the worker took the job)
    _wait_until(
        lambda: (
            js.get_job(job_id).job.meta.get("status_message") == STOPPABLE_JOB_WAITING
        ),
        timeout=60,
        what="the job runs",
    )

    assert js.stop_job(job_id)

    _wait_until(
        lambda: js.get_job(job_id).get_status() == JobStatus.STOPPED,
        timeout=STOPPABLE_JOB_SECONDS / 2,
        what="the job is stopped",
    )
    stopped = js.get_job(job_id)
    assert stopped.job.meta["status_message"] == "The job was stopped"
    assert stopped.job.meta["finished"] is not None
    listed = js.get_jobs_by_project(stoppable_job_type, test_project.id)
    assert [(job.get_id(), job.get_status()) for job in listed] == [
        (job_id, JobStatus.STOPPED)
    ]


@pytest.mark.parametrize(
    "stoppable_job_type", [pytest.param("cpu", id="queued")], indirect=True
)
def test_stop_job_leaves_a_queued_job_queued(
    stoppable_job_type: str, test_project: ProjectORM, held_jobs: HeldJobs
):
    """A job no worker has started yet is not stopped: `stop_job` answers False
    and the job stays queued."""
    js = JobService()
    job_id = js.start_job(
        stoppable_job_type, JobInputBase(project_id=test_project.id)
    ).get_id()

    assert not js.stop_job(job_id)

    assert js.get_job(job_id).get_status() == JobStatus.QUEUED


def test_a_stale_stop_does_not_make_a_later_failure_a_stop(
    failing_job_type: str, test_project: ProjectORM, held_jobs: HeldJobs
):
    """A worker that received a stop of a job when the job had ended already
    runs the job again (e.g. after a retry), and the job fails: it ends as
    FAILED with its error, not as STOPPED."""
    js = JobService()
    job = js.start_job(failing_job_type, JobInputBase(project_id=test_project.id))
    rq_job = job.job
    queue = rq.Queue(rq_job.origin, connection=rq_job.connection)
    worker = DATSSimpleWorker([queue], connection=rq_job.connection)
    # the stop that RQ remembered from the earlier execution
    worker._stopped_job_id = rq_job.id

    worker.execute_job(rq_job, queue)

    failed = js.get_job(job.get_id())
    assert failed.get_status() == JobStatus.FAILED
    assert failed.job.meta["status_message"] == FAILING_JOB_ERROR
