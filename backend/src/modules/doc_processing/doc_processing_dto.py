from pydantic import BaseModel, ConfigDict, Field

from common.doc_type import DocType
from common.sdoc_status_enum import SDocStatus
from core.doc.source_document_dto import SourceDocumentBaseDTO
from core.doc.source_document_orm import SourceDocumentORM
from modules.doc_processing.doc_processing_steps import PROCESSING_JOBS
from systems.job_system.job_dto import JobInputBase
from systems.search_system.sorting import SortDirection


class ProcessingSettings(BaseModel):
    extract_images: bool = Field(
        description="Whether to extract images from the documents"
    )
    pages_per_chunk: int = Field(
        description="Number of pages to chunk the documents into"
    )
    keyword_number: int = Field(description="Number of keywords to extract")
    keyword_deduplication_threshold: float = Field(
        description="Threshold for keyword deduplication (0.0 - 1.0)"
    )
    keyword_max_ngram_size: int = Field(
        description="Maximum n-gram size for keyword extraction"
    )


class ProcessingJobInput(JobInputBase):
    settings: ProcessingSettings = Field(description="Processing settings")


class SdocProcessingJobInput(ProcessingJobInput):
    sdoc_id: int = Field(description="SDoc ID")


class SourceDocumentStatusSimple(SourceDocumentBaseDTO):
    id: int = Field(description="ID of the SourceDocument")
    processed_jobs: int = Field(
        description="Number of processed jobs (depending on the doctype)"
    )
    total_jobs: int = Field(
        description="Total number of jobs (depending on the doctype)"
    )
    processed_status: SDocStatus = Field(
        description="Overall processing status. Results from processed_jobs and total_jobs"
    )

    model_config = ConfigDict(from_attributes=True)


class SdocStatusRow(BaseModel):
    sdoc_id: int = Field(description="ID of the SourceDocument")
    filename: str = Field(description="Filename of the SourceDocument")
    status: dict[str, SDocStatus] = Field(
        description="Processing status of the SourceDocument (the keys are the processing step/job and differ per doctype)"
    )

    @classmethod
    def from_sdoc_orm(cls, sdoc: SourceDocumentORM) -> "SdocStatusRow":
        status_fields = PROCESSING_JOBS[DocType(sdoc.doctype)]
        status: dict[str, SDocStatus] = {s: getattr(sdoc, s) for s in status_fields}
        return cls(
            sdoc_id=sdoc.id,
            filename=sdoc.filename,
            status=status,
        )


class SdocHealthResult(BaseModel):
    total_results: int = Field(description="Total number of sdocs in the project")
    data: list[SdocStatusRow] = Field(
        description="List of SourceDocument status rows (one per sdoc in the project)"
    )


class SdocHealthSort(BaseModel):
    column: str
    direction: SortDirection

    def get_sqlalchemy_expression(self):
        assert hasattr(SourceDocumentORM, self.column), f"Invalid column: {self.column}"
        orm_column = getattr(SourceDocumentORM, self.column)
        return self.direction.apply(orm_column)
