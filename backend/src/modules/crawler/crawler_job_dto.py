from datetime import datetime

from pydantic import BaseModel, Field
from repos.db.dto_base import UpdateDTOBase
from systems.job_system.background_job_base_dto import BackgroundJobStatus

# TODO: unify with export job and extract duplicate code to utils!


class CrawlerJobParameters(BaseModel):
    project_id: int = Field(
        description="The ID of the Project to import the crawled data."
    )
    urls: list[str] = Field(description="List of URLs to crawl.")


# Properties shared across all DTOs
class CrawlerJobBaseDTO(BaseModel):
    status: BackgroundJobStatus = Field(
        default=BackgroundJobStatus.WAITING, description="Status of the CrawlerJob"
    )


# Properties to create
class CrawlerJobCreate(CrawlerJobBaseDTO):
    parameters: CrawlerJobParameters = Field(
        description="The parameters of the crawler job that defines what to crawl!"
    )
    output_dir: str = Field(
        description="Internal temporary output directory for the crawled data."
    )
    images_store_path: str = Field(
        description="Internal temporary output directory for the crawled images."
    )
    videos_store_path: str = Field(
        description="Internal temporary output directory for the crawled videos."
    )
    audios_store_path: str = Field(
        description="Internal temporary output directory for the crawled audios."
    )


# Properties to update
class CrawlerJobUpdate(BaseModel, UpdateDTOBase):
    status: BackgroundJobStatus | None = Field(
        default=None, description="Status of the CrawlerJob"
    )
    crawled_data_zip_path: str | None = Field(
        default=None,
        description="Path to the ZIP that contains the data of the CrawlerJob",
    )


# Properties to read
class CrawlerJobRead(CrawlerJobBaseDTO):
    id: str = Field(description="ID of the CrawlerJob")
    parameters: CrawlerJobParameters = Field(
        description="The parameters of the crawler job that defines what to crawl!"
    )
    output_dir: str = Field(
        description="Internal temporary output directory for the crawled data."
    )
    images_store_path: str = Field(
        description="Internal temporary output directory for the crawled images."
    )
    videos_store_path: str = Field(
        description="Internal temporary output directory for the crawled videos."
    )
    audios_store_path: str = Field(
        description="Internal temporary output directory for the crawled audios."
    )
    crawled_data_zip_path: str | None = Field(
        default=None,
        description="Path to the ZIP that contains the data of the CrawlerJob",
    )
    created: datetime = Field(description="Created timestamp of the CrawlerJob")
    updated: datetime = Field(description="Updated timestamp of the CrawlerJob")
