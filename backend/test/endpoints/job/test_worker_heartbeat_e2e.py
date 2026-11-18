"""End-to-end tests of the heartbeat of a job that a worker runs in its own
process (`DATSSimpleWorker`, here the worker of the held jobs, which renews the
heartbeats every `HELD_JOB_MONITORING_INTERVAL` seconds): it expires
`HEARTBEAT_TTL` after the last renewal, so the job of a killed worker is failed
within minutes, not after its timeout."""

from core.project.project_orm import ProjectORM
from job_test_utils import HELD_JOB_MONITORING_INTERVAL, HeldJobs
from systems.job_system.job_dto import JobInputBase
from systems.job_system.job_service import JobService
from worker import HEARTBEAT_TTL

from .conftest import HEARTBEAT_JOB_SECONDS

# ===========================================================================
# HEARTBEAT TESTS
# ===========================================================================


def test_a_running_job_has_a_heartbeat_that_its_worker_renews(
    heartbeat_job_type: str, test_project: ProjectORM, held_jobs: HeldJobs
):
    """While the job runs (it could run for an hour), its entry in the started
    registry expires `HEARTBEAT_TTL` (ten minutes) after the last renewal, and
    the worker renews it every monitoring interval."""
    js = JobService()
    job = js.start_job(heartbeat_job_type, JobInputBase(project_id=test_project.id))

    held_jobs.run(heartbeat_job_type)

    ran = js.get_job(job.get_id())
    assert ran.job.timeout is not None and ran.job.timeout > 3 * HEARTBEAT_TTL
    (start, expires_at_start), (end, expires_at_end) = ran.job.meta["heartbeats"]
    slack = HELD_JOB_MONITORING_INTERVAL + 1
    assert HEARTBEAT_TTL - slack <= expires_at_start - start <= HEARTBEAT_TTL
    assert HEARTBEAT_TTL - slack <= expires_at_end - end <= HEARTBEAT_TTL
    assert expires_at_end - expires_at_start >= HEARTBEAT_JOB_SECONDS - slack
