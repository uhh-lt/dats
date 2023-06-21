from pathlib import Path
from typing import Any

# noinspection PyUnresolvedReferences,PyProtectedMember
from celery import Signature

from app.core.data.crawler.crawler_service import CrawlerService
from app.core.data.dto.crawler_job import CrawlerJobParameters, CrawlerJobRead
from app.core.data.dto.export_job import ExportJobParameters, ExportJobRead
from app.core.data.export.export_service import ExportService

import_uploaded_archive_task = "app.docprepro.heavy_jobs.tasks.import_uploaded_archive"
start_export_job_task = "app.docprepro.heavy_jobs.tasks.start_export_job"
start_crawler_job_task = "app.docprepro.heavy_jobs.tasks.start_crawler_job"


def import_uploaded_archive_apply_async(
    archive_file_path: Path, project_id: int
) -> Any:
    archive_preprocessing = Signature(
        import_uploaded_archive_task,
        kwargs={"archive_file_path_and_project_id": (archive_file_path, project_id)},
    )
    return archive_preprocessing.apply_async()


def prepare_and_start_export_job_async(
    export_params: ExportJobParameters,
) -> ExportJobRead:
    exs: ExportService = ExportService()
    ex_job = exs.prepare_export_job(export_params)
    start_export_job = Signature(start_export_job_task, kwargs={"export_job": ex_job})
    start_export_job.apply_async()

    return ex_job


def prepare_and_start_crawling_job_async(
    crawler_params: CrawlerJobParameters,
) -> CrawlerJobRead:
    cs: CrawlerService = CrawlerService()
    cj = cs.prepare_crawler_job(crawler_params)
    start_export_job = (
        # crawl the data via scrapy and zip the data
        Signature(start_crawler_job_task, kwargs={"crawler_job": cj})
        |
        # import the zip
        Signature(import_uploaded_archive_task)
    )
    start_export_job.apply_async()

    return cj
