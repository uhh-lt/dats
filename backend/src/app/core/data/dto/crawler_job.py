from datetime import datetime
from enum import Enum
from typing import List, Optional

from app.core.data.dto.dto_base import UpdateDTOBase
from pydantic import BaseModel, Field

# TODO: unify with export job and extract duplicate code to utils!


class CrawlerJobStatus(str, Enum):
    INIT = "INIT"
    IN_PROGRESS = "IN PROGRESS"
    DONE = "DONE"
    FAILED = "FAILED"


class CrawlerJobParameters(BaseModel):
    project_id: int = Field(
        description="The ID of the Project to import the crawled data."
    )
    urls: List[str] = Field(description="List of URLs to crawl.")


# Properties shared across all DTOs
class CrawlerJobBaseDTO(BaseModel):
    status: CrawlerJobStatus = Field(
        default=CrawlerJobStatus.INIT, description="Status of the CrawlerJob"
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
class CrawlerJobUpdate(CrawlerJobBaseDTO, UpdateDTOBase):
    status: Optional[CrawlerJobStatus] = Field(
        default=None, description="Status of the CrawlerJob"
    )
    crawled_data_zip_path: Optional[str] = Field(
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
    crawled_data_zip_path: Optional[str] = Field(
        default=None,
        description="Path to the ZIP that contains the data of the CrawlerJob",
    )
    created: datetime = Field(description="Created timestamp of the CrawlerJob")
