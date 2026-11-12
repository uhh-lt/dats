from typing import TYPE_CHECKING

from pydantic import BaseModel, Field

from common.doc_type_enum import DocType
from common.feature_enum import Feature
from common.job_type_enum import JobType
from common.languages_enum import Language
from common.sdoc_status_enum import SDocStatus
from core.doc.source_document_dto import SourceDocumentBaseDTO
from core.doc.source_document_status_rules import document_status
from systems.job_system.job_dto import JobInputBase
from systems.search_system.sorting import SortDirection

if TYPE_CHECKING:
    from core.doc.source_document_orm import SourceDocumentORM


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
    language: Language = Field(description="Language of the documents: 'de', 'en', ...")
    model: str = Field(description="Large Language Model to use for processing")


class ProcessingJobInput(JobInputBase):
    settings: ProcessingSettings = Field(description="Processing settings")


class SdocProcessingJobInput(ProcessingJobInput):
    sdoc_id: int = Field(description="SDoc ID")
    steps: list[JobType] | None = Field(
        default=None,
        description="The pipeline steps this job computes, for jobs with several steps (e.g. text_spacy); null = all steps of the job",
    )


class FeatureActivationJobInput(JobInputBase):
    feature: Feature = Field(description="The enabled, completed or restarted Feature")
    restart: bool = Field(
        description="Whether to plan the Feature's processing steps again (restart) or only its missing and erroneous ones"
    )
    settings: ProcessingSettings = Field(
        description="The processing settings of the started steps"
    )
    activation_id: str = Field(
        description="ID of this activation; the job stops once the Project's pending activation of the Feature has another ID"
    )
    last_sdoc_id: int = Field(
        description="The highest SourceDocument ID of the Project at the request; later documents plan their steps on upload"
    )


class SourceDocumentStatusSimple(SourceDocumentBaseDTO):
    id: int = Field(description="ID of the SourceDocument")
    processed_jobs: int = Field(description="Number of finished jobs")
    total_jobs: int = Field(description="Number of planned jobs")
    processed_status: SDocStatus = Field(
        description="Overall processing status: erroneous if any job failed, processing if any job is pending, finished otherwise"
    )

    @classmethod
    def from_sdoc_orm(
        cls, sdoc: "SourceDocumentORM", step_status: dict[JobType, SDocStatus]
    ) -> "SourceDocumentStatusSimple":
        """Derives the overall status from the status of the planned steps."""
        return cls(
            id=sdoc.id,
            filename=sdoc.filename,
            name=sdoc.name,
            doctype=DocType(sdoc.doctype),
            project_id=sdoc.project_id,
            processed_jobs=sum(s == SDocStatus.finished for s in step_status.values()),
            total_jobs=len(step_status),
            processed_status=document_status(step_status.values()),
        )


class SdocStatusRow(BaseModel):
    sdoc_id: int = Field(description="ID of the SourceDocument")
    name: str = Field(description="Name of the SourceDocument")
    status: dict[str, SDocStatus | None] = Field(
        description="Processing status of the SourceDocument (the keys are the processing step/job and differ per doctype, null = the step is not planned)"
    )
    failed_job_uuids: dict[str, str] = Field(
        description="UUIDs of the failed processing jobs (the keys are the processing step/job and differ per doctype)",
    )
    failed_job_status_msgs: dict[str, str] = Field(
        description="Status messages of the failed processing jobs (the keys are the processing step/job and differ per doctype)",
    )

    @classmethod
    def from_sdoc_orm(
        cls,
        sdoc: "SourceDocumentORM",
        steps: list[JobType],
        step_status: dict[JobType, SDocStatus],
    ) -> "SdocStatusRow":
        """The status of the given pipeline steps (the steps of the sdoc's
        doctype), None for steps that are not planned."""
        status: dict[str, SDocStatus | None] = {
            s.value: step_status.get(s) for s in steps
        }
        return cls(
            sdoc_id=sdoc.id,
            name=sdoc.name,
            status=status,
            failed_job_uuids={},
            failed_job_status_msgs={},
        )


class SdocHealthResult(BaseModel):
    total_results: int = Field(description="Total number of sdocs in the project")
    data: list[SdocStatusRow] = Field(
        description="List of SourceDocument status rows (one per sdoc in the project)"
    )


class SdocHealthSort(BaseModel):
    column: str = Field(description="SourceDocument column to sort by")
    direction: SortDirection = Field(description="Direction of the sort")
