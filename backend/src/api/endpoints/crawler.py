from typing import List
from fastapi import APIRouter

from app.core.data.dto.crawler_job import (
    CrawlerJobParameters,
    CrawlerJobRead,
)
from app.docprepro.heavy_jobs import prepare_and_start_crawling_job_async
from app.core.data.crawler.crawler_service import CrawlerService

router = APIRouter(prefix="/crawler")
tags = ["crawler"]

cs: CrawlerService = CrawlerService()


@router.post(
    "",
    tags=tags,
    response_model=CrawlerJobRead,
    summary="Returns the CrawlerJob for the given Parameters",
    description="Returns the CrawlerJob for the given Parameters",
)
async def start_crawler_job(
    *,
    crawler_params: CrawlerJobParameters,
) -> CrawlerJobRead:
    # TODO Flo: only if the user has access?
    return prepare_and_start_crawling_job_async(crawler_params=crawler_params)


@router.get(
    "/{crawler_job_id}",
    tags=tags,
    response_model=CrawlerJobRead,
    summary="Returns the CrawlerJob for the given ID",
    description="Returns the CrawlerJob for the given ID if it exists",
)
async def get_crawler_job(
    *,
    crawler_job_id: str,
) -> CrawlerJobRead:
    # TODO Flo: only if the user has access?
    return cs.get_crawler_job(crawler_job_id=crawler_job_id)


@router.get(
    "/project/{project_id}",
    tags=tags,
    response_model=List[CrawlerJobRead],
    summary="Returns all CrawlerJobs for the given project ID",
    description="Returns all CrawlerJobs for the given project ID if it exists",
)
async def get_all_crawler_jobs(
    *,
    project_id: int,
) -> List[CrawlerJobRead]:
    # TODO Flo: only if the user has access?
    crawler_jobs = cs.get_all_crawler_jobs(project_id=project_id)
    crawler_jobs.sort(key=lambda x: x.created, reverse=True)
    return crawler_jobs
