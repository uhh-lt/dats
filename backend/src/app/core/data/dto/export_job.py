from datetime import datetime
from enum import Enum
from typing import List, Literal, Optional, Union

from pydantic import BaseModel, Field

from app.core.data.dto.background_job_base import BackgroundJobStatus
from app.core.data.dto.dto_base import UpdateDTOBase


class ExportFormat(str, Enum):
    CSV = "CSV"
    JSON = "JSON"


class ExportJobType(str, Enum):
    SINGLE_PROJECT_ALL_DATA = "SINGLE_PROJECT_ALL_DATA"
    SINGLE_PROJECT_ALL_USER = "SINGLE_PROJECT_ALL_USER"
    SINGLE_PROJECT_ALL_TAGS = "SINGLE_PROJECT_ALL_TAGS"
    SINGLE_PROJECT_ALL_CODES = "SINGLE_PROJECT_ALL_CODES"
    SINGLE_PROJECT_SELECTED_SDOCS = "SINGLE_PROJECT_SELECTED_SDOCS"
    SINGLE_PROJECT_SELECTED_SPAN_ANNOTATIONS = (
        "SINGLE_PROJECT_SELECTED_SPAN_ANNOTATIONS"
    )
    SINGLE_PROJECT_SELECTED_SENTENCE_ANNOTATIONS = (
        "SINGLE_PROJECT_SELECTED_SENTENCE_ANNOTATIONS"
    )

    SINGLE_USER_ALL_DATA = "SINGLE_USER_ALL_DATA"
    SINGLE_USER_ALL_MEMOS = "SINGLE_USER_ALL_MEMOS"
    SINGLE_USER_LOGBOOK = "SINGLE_USER_LOGBOOK"

    SINGLE_DOC_ALL_USER_ANNOTATIONS = "SINGLE_DOC_ALL_USER_ANNOTATIONS"
    SINGLE_DOC_SINGLE_USER_ANNOTATIONS = "SINGLE_DOC_SINGLE_USER_ANNOTATIONS"


class SpecificExportJobParameters(BaseModel):
    project_id: int = Field(description="The ID of the Project to export from")
    export_job_type: ExportJobType = Field(
        description="The type of the export job (what to export)"
    )


class SingleProjectAllDataExportJobParams(SpecificExportJobParameters):
    export_job_type: Literal[ExportJobType.SINGLE_PROJECT_ALL_DATA]


class SingleProjectAllUserExportJobParams(SpecificExportJobParameters):
    export_job_type: Literal[ExportJobType.SINGLE_PROJECT_ALL_USER]


class SingleProjectAllTagsExportJobParams(SpecificExportJobParameters):
    export_job_type: Literal[ExportJobType.SINGLE_PROJECT_ALL_TAGS]


class SingleProjectAllCodesExportJobParams(SpecificExportJobParameters):
    export_job_type: Literal[ExportJobType.SINGLE_PROJECT_ALL_CODES]


class SingleProjectSelectedSdocsParams(SpecificExportJobParameters):
    export_job_type: Literal[ExportJobType.SINGLE_PROJECT_SELECTED_SDOCS]
    sdoc_ids: List[int] = Field(description="IDs of the source documents to export")


class SingleProjectSelectedSpanAnnotationsParams(SpecificExportJobParameters):
    export_job_type: Literal[ExportJobType.SINGLE_PROJECT_SELECTED_SPAN_ANNOTATIONS]
    span_annotation_ids: List[int] = Field(
        description="IDs of the span annotations to export"
    )


class SingleProjectSelectedSentenceAnnotationsParams(SpecificExportJobParameters):
    export_job_type: Literal[ExportJobType.SINGLE_PROJECT_SELECTED_SENTENCE_ANNOTATIONS]
    sentence_annotation_ids: List[int] = Field(
        description="IDs of the sentence annotations to export"
    )


class SingleUserAllDataExportJobParams(SpecificExportJobParameters):
    export_job_type: Literal[ExportJobType.SINGLE_USER_ALL_DATA]
    user_id: int = Field(description="The ID of the User to get the data from.")


class SingleUserAllMemosExportJobParams(SpecificExportJobParameters):
    export_job_type: Literal[ExportJobType.SINGLE_USER_ALL_MEMOS]
    user_id: int = Field(description="The ID of the User to get the data from.")


class SingleUserLogbookExportJobParams(SpecificExportJobParameters):
    export_job_type: Literal[ExportJobType.SINGLE_USER_LOGBOOK]
    user_id: int = Field(description="The ID of the User to get the data from.")


class SingleDocAllUserAnnotationsExportJobParams(SpecificExportJobParameters):
    export_job_type: Literal[ExportJobType.SINGLE_DOC_ALL_USER_ANNOTATIONS]
    sdoc_id: int = Field(description="The ID of the SDocument to get the data from.")


class SingleDocSingleUserAnnotationsExportJobParams(SpecificExportJobParameters):
    export_job_type: Literal[ExportJobType.SINGLE_DOC_SINGLE_USER_ANNOTATIONS]
    sdoc_id: int = Field(description="The ID of the SDocument to get the data from.")
    user_id: int = Field(description="The ID of the User to get the data from.")


class ExportJobParameters(BaseModel):
    export_job_type: ExportJobType = Field(
        description="The type of the export job (what to export)"
    )
    export_format: ExportFormat = Field(
        description="The format of the exported data.",
        default=ExportFormat.CSV,
    )
    specific_export_job_parameters: Union[
        SingleProjectAllDataExportJobParams,
        SingleProjectAllUserExportJobParams,
        SingleProjectAllTagsExportJobParams,
        SingleProjectAllCodesExportJobParams,
        SingleProjectSelectedSdocsParams,
        SingleProjectSelectedSpanAnnotationsParams,
        SingleProjectSelectedSentenceAnnotationsParams,
        SingleUserAllDataExportJobParams,
        SingleUserAllMemosExportJobParams,
        SingleUserLogbookExportJobParams,
        SingleDocAllUserAnnotationsExportJobParams,
        SingleDocSingleUserAnnotationsExportJobParams,
    ] = Field(
        description="Specific parameters for the export job w.r.t it's type",
        discriminator="export_job_type",
    )


# Properties shared across all DTOs
class ExportJobBaseDTO(BaseModel):
    status: BackgroundJobStatus = Field(
        default=BackgroundJobStatus.WAITING, description="Status of the ExportJob"
    )
    results_url: Optional[str] = Field(
        default=None, description="URL to download the results when done."
    )


# Properties to create
class ExportJobCreate(ExportJobBaseDTO):
    parameters: ExportJobParameters = Field(
        description="The parameters of the export job that defines what to export!"
    )


# Properties to update
class ExportJobUpdate(BaseModel, UpdateDTOBase):
    status: Optional[BackgroundJobStatus] = Field(
        default=None, description="Status of the ExportJob"
    )
    results_url: Optional[str] = Field(
        default=None, description="URL to download the results when done."
    )


# Properties to read
class ExportJobRead(ExportJobBaseDTO):
    id: str = Field(description="ID of the ExportJob")
    parameters: ExportJobParameters = Field(
        description="The parameters of the export job that defines what to export!"
    )
    created: datetime = Field(description="Created timestamp of the ExportJob")
