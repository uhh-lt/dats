from loguru import logger
from pathlib import Path
from typing import Tuple

from app.core.data.crawler.crawler_service import CrawlerService
from app.core.data.dto.crawler_job import CrawlerJobRead

cs: CrawlerService = CrawlerService()


def start_crawler_job_(crawler_job: CrawlerJobRead) -> Tuple[Path, int]:
    urls = list(set(crawler_job.parameters.urls))
    logger.info(
        f"Starting CrawlerJob with {urls} URLs for Project {crawler_job.parameters.project_id}"
    )

    crawled_data_zip = cs.start_crawler_job_sync(crawler_job_id=crawler_job.id)

    logger.info(
        f"CrawlerJob {crawler_job.id} has finished! Stored result ZIP at {crawled_data_zip}"
    )

    return crawled_data_zip, crawler_job.parameters.project_id
