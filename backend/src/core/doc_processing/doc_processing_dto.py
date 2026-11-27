from typing import TYPE_CHECKING

from pydantic import BaseModel, Field

from common.doc_type_enum import DocType
from common.sdoc_status_enum import SDocStatus
from core.doc.source_document_dto import SourceDocumentBaseDTO
from systems.artefact_system.artefact_dto import ProcessingJobInput, ProcessingSettings
from systems.artefact_system.source_document_status_rules import document_status
from systems.job_system.job_dto import JobOutputBase
from systems.search_system.sorting import SortDirection

if TYPE_CHECKING:
    from core.doc.source_document_orm import SourceDocumentORM


class SdocInitJobInput(ProcessingJobInput):
    temporary_file_id: str = Field(
        description="ID of the temporary folder the file of the new SourceDocument is staged in"
    )
    filename: str = Field(
        description="Name of the staged file, the filename of the new SourceDocument"
    )
    doctype: DocType = Field(description="DocType of the new SourceDocument")
    folder_id: int | None = Field(
        description="ID of the folder of the new SourceDocument, if any"
    )


class SdocInitJobOutput(JobOutputBase):
    sdoc_id: int = Field(description="ID of the created SourceDocument")
    folder_id: int = Field(description="ID of the folder of the SourceDocument")
    doctype: DocType = Field(description="DocType of the SourceDocument")


class SourceDocumentStatusSimple(SourceDocumentBaseDTO):
    id: int = Field(description="ID of the SourceDocument")
    project_id: int = Field(description="Project the SourceDocument belongs to")
    processed_jobs: int = Field(description="Number of finished jobs")
    total_jobs: int = Field(description="Number of planned jobs")
    processed_status: SDocStatus = Field(
        description="Overall processing status: erroneous if any job failed, processing if any job is pending, finished otherwise"
    )

    @classmethod
    def from_sdoc_orm(
        cls, sdoc: "SourceDocumentORM", step_status: dict[str, SDocStatus]
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
        steps: list[str],
        step_status: dict[str, SDocStatus],
    ) -> "SdocStatusRow":
        """The status of the given pipeline steps (the steps of the sdoc's
        doctype), None for steps that are not planned."""
        status: dict[str, SDocStatus | None] = {s: step_status.get(s) for s in steps}
        return cls(
            sdoc_id=sdoc.id,
            name=sdoc.name,
            status=status,
            failed_job_uuids={},
            failed_job_status_msgs={},
        )


class SdocHealthColumn(BaseModel):
    step: str = Field(description="Name of the pipeline step")
    title: str = Field(
        description="Titles of the artefacts the step produces, the header of its column"
    )
    core: bool = Field(
        description="Whether the step is a core step, which every document gets and Recompute plans where it is missing"
    )


class SdocHealthResult(BaseModel):
    total_results: int = Field(description="Total number of sdocs in the project")
    data: list[SdocStatusRow] = Field(
        description="List of SourceDocument status rows (one per sdoc in the project)"
    )


class SdocHealthSort(BaseModel):
    column: str = Field(description="SourceDocument column to sort by")
    direction: SortDirection = Field(description="Direction of the sort")


class SdocHealthSearchRequest(BaseModel):
    doctype: DocType = Field(
        description="The document type whose statuses are searched"
    )
    sorts: list[SdocHealthSort] = Field(
        default=[], description="Ordered sort expressions"
    )
    page_number: int = Field(default=0, ge=0, description="Zero-based page index")
    page_size: int = Field(default=20, ge=1, description="Number of rows per page")


class DocProcessingRetryRequest(BaseModel):
    doctype: DocType = Field(description="The document type of the SourceDocuments")
    sdoc_ids: list[int] = Field(description="The SourceDocuments to retry")


class DocProcessingRecomputeRequest(BaseModel):
    processing_step: str = Field(description="The pipeline step to recompute")
    sdoc_ids: list[int] = Field(description="The SourceDocuments to recompute")
    settings: ProcessingSettings = Field(description="Processing settings")
