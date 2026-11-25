import os
import subprocess
from pathlib import Path

from loguru import logger
from pydantic import Field

from core.doc_processing.entrypoints.archive_extraction_job import (
    ArchiveExtractionJobInput,
)
from core.project.project_crud import crud_project
from modules.crawler.crawler_exceptions import (
    CrawlerScriptFailedError,
    NoDataToCrawlError,
)
from repos.db.sql_repo import SQLRepo
from repos.filesystem.temporary_file_crud import crud_temporary_file
from systems.artefact_system.artefact_dto import ProcessingJobInput
from systems.job_system.job_dto import Job, JobOutputBase
from systems.job_system.job_exceptions import JobQueueUnavailableError
from systems.job_system.job_register_decorator import register_job
from systems.job_system.job_service import JobService
from systems.job_system.job_system_enum import EndpointGeneration, JobTiming

sqlr = SQLRepo()

# the archive of the crawled pages, handed over to the archive extraction
CRAWLED_ARCHIVE_FILENAME = "crawled_data.zip"


class CrawlerJobInput(ProcessingJobInput):
    project_id: int = Field(
        description="The ID of the Project to import the crawled data."
    )
    urls: list[str] = Field(description="List of URLs to crawl.")


class CrawlerJobOutput(JobOutputBase):
    crawled_data_zip: Path


@register_job(
    job_type="crawler",
    input_type=CrawlerJobInput,
    output_type=CrawlerJobOutput,
    generate_endpoints=EndpointGeneration.ALL,
    publish_updates=True,
    result_ttl=JobTiming.NINETY_DAYS,
)
def handle_crawler_job(payload: CrawlerJobInput, job: Job) -> CrawlerJobOutput:
    # Check that everything exists
    if len(payload.urls) == 0:
        raise NoDataToCrawlError("Number of provided URLs must be at least one!")

    with sqlr.transaction() as db:
        crud_project.exists(
            db=db,
            id=payload.project_id,
            raise_error=True,
        )

    # the archive of the crawled pages is staged in a temporary folder, the
    # handover to the archive extraction
    staging_id = crud_temporary_file.create()
    archive_path = crud_temporary_file.path(
        id=staging_id, name=CRAWLED_ARCHIVE_FILENAME
    )

    # the crawled pages and images are scratch
    with crud_temporary_file.folder() as scratch:
        output_dir = scratch / "output"
        image_dir = scratch / "images"
        output_dir.mkdir()
        image_dir.mkdir()

        # run the crawler script
        script_env = os.environ.copy()
        script_env["PYTHONPATH"] = os.path.join(os.getcwd(), "src")

        logger.info("Starting Scrapy Crawler Script! ... ")
        args = [
            "python",
            "src/modules/crawler/crawler_script.py",
            str(output_dir),
            str(image_dir),
            str(archive_path),
        ] + payload.urls
        result = subprocess.run(args, env=script_env, capture_output=True, text=True)
        logger.info("Finished Scrapy Crawler Script! ")

    # a failed crawl hands nothing over
    if result.returncode != 0 or not archive_path.is_file():
        logger.error(f"The crawler script failed: {result.stderr}")
        crud_temporary_file.delete(id=staging_id)
        raise CrawlerScriptFailedError(returncode=result.returncode)

    # import the crawled data; a queue outage leaves the crawl finished
    try:
        JobService().start_job(
            "extract_archive",
            ArchiveExtractionJobInput(
                project_id=payload.project_id,
                temporary_file_id=staging_id,
                filename=CRAWLED_ARCHIVE_FILENAME,
                settings=payload.settings,
            ),
        )
    except JobQueueUnavailableError as e:
        logger.error(f"Cannot start the archive extraction after the crawl: {e}")

    return CrawlerJobOutput(crawled_data_zip=archive_path)
