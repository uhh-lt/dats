import os
import subprocess
from pathlib import Path

from common.job_type import JobType
from core.project.project_crud import crud_project
from loguru import logger
from modules.crawler.crawler_exceptions import NoDataToCrawlError
from pydantic import Field
from repos.db.sql_repo import SQLRepo
from repos.filesystem_repo import FilesystemRepo
from systems.job_system.job_dto import (
    EndpointGeneration,
    Job,
    JobInputBase,
    JobOutputBase,
    JobResultTTL,
)
from systems.job_system.job_register_decorator import register_job

fsr: FilesystemRepo = FilesystemRepo()


class CrawlerJobInput(JobInputBase):
    project_id: int = Field(
        description="The ID of the Project to import the crawled data."
    )
    urls: list[str] = Field(description="List of URLs to crawl.")


class CrawlerJobOutput(JobOutputBase):
    crawled_data_zip: Path


@register_job(
    job_type=JobType.CRAWLER,
    input_type=CrawlerJobInput,
    output_type=CrawlerJobOutput,
    generate_endpoints=EndpointGeneration.ALL,
    result_ttl=JobResultTTL.NINETY_DAYS,
)
def handle_crawler_job(payload: CrawlerJobInput, job: Job) -> CrawlerJobOutput:
    # Check that everything exists
    if len(payload.urls) == 0:
        raise NoDataToCrawlError("Number of provided URLs must be at least one!")

    with SQLRepo().db_session() as db:
        crud_project.exists(
            db=db,
            id=payload.project_id,
            raise_error=True,
        )

    # create the temporary output directories
    output_dir = fsr.create_temp_dir()
    image_dir = output_dir / "images"
    image_dir.mkdir()

    # # relative directories to communicate with the celery workers
    output_dir = output_dir.relative_to(fsr.root_dir)
    image_dir = image_dir.relative_to(fsr.root_dir)

    # run the crawler script
    script_env = os.environ.copy()
    script_env["PYTHONPATH"] = os.path.join(os.getcwd(), "src")

    logger.info("Starting Scrapy Crawler Script! ... ")
    args = [
        "python",
        "src/modules/crawler/crawler_script.py",
        str(output_dir),
        str(image_dir),
    ] + payload.urls
    crawled_zip = subprocess.run(args, env=script_env, capture_output=True, text=True)
    logger.info("Finished Scrapy Crawler Script! ")

    # resolve relative path
    export_zip_path = fsr.root_dir / Path(crawled_zip.stdout.strip())

    # move the zip to the project to import it afterward
    result = fsr.move_file_to_project_sdoc_files(
        proj_id=payload.project_id, src_file=export_zip_path
    )

    return CrawlerJobOutput(crawled_data_zip=result)
