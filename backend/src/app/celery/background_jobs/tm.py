from loguru import logger

from app.core.topicmodel.tm_job import TMJobRead
from app.core.topicmodel.tm_job_service import TMJobService

tmjs: TMJobService = TMJobService()


def start_tm_job_(tm_job: TMJobRead) -> None:
    logger.info((f"Starting TMJob {tm_job.id}"))
    tmjs.start_tm_job_sync(tm_job_id=tm_job.id)

    logger.info(f"TMJob {tm_job.id} has finished!")
