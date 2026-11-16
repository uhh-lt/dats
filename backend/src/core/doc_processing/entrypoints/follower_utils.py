from loguru import logger

from systems.job_system.job_dto import JobInputBase
from systems.job_system.job_exceptions import JobQueueUnavailableError
from systems.job_system.job_service import JobService


def start_followers(finished: str, followers: list[tuple[str, JobInputBase]]) -> None:
    """Start the jobs that follow a finished entry point (`extract_archive`,
    `doc_chunking`, `extract_html`), once its data is stored. If the queue
    (Redis) cannot be reached, the outage is logged and the finished job
    stays finished: its data is stored."""
    try:
        for job_type, job_input in followers:
            JobService().start_job(job_type, job_input)
    except JobQueueUnavailableError as e:
        logger.error(f"Cannot start the jobs after a finished {finished}: {e}")
