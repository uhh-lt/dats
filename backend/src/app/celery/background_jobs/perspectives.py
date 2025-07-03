from loguru import logger

from app.core.perspectives.perspectives_job import PerspectivesJobRead
from app.core.perspectives.perspectives_job_service import PerspectivesJobService

tmjs: PerspectivesJobService = PerspectivesJobService()


def start_perspectives_job_(perspectives_job: PerspectivesJobRead) -> None:
    logger.info((f"Starting PerspectivesJob {perspectives_job.id}"))
    tmjs.start_perspectives_job_sync(perspectives_job_id=perspectives_job.id)

    logger.info(f"PerspectivesJob {perspectives_job.id} has finished!")
