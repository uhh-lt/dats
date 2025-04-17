from datetime import datetime
from enum import Enum
from typing import List, Literal, Optional, Union

from pydantic import BaseModel, Field

from app.core.data.dto.background_job_base import BackgroundJobStatus
from app.core.data.dto.dto_base import UpdateDTOBase


class ExportJobType(str, Enum):
    ALL_DATA = "ALL_DATA"
    # all
    ALL_USERS = "ALL_USERS"
    ALL_SDOCS = "ALL_SDOCS"
    ALL_CODES = "ALL_CODES"
    ALL_TAGS = "ALL_TAGS"
    ALL_SPAN_ANNOTATIONS = "ALL_SPAN_ANNOTATIONS"
    ALL_SENTENCE_ANNOTATIONS = "ALL_SENTENCE_ANNOTATIONS"
    ALL_BBOX_ANNOTATIONS = "ALL_BBOX_ANNOTATIONS"
    ALL_MEMOS = "ALL_MEMOS"
    ALL_PROJECT_METADATA = "ALL_PROJECT_METADATA"
    ALL_WHITEBOARDS = "ALL_WHITEBOARDS"
    ALL_TIMELINE_ANALYSES = "ALL_TIMELINE_ANALYSES"
    ALL_COTA = "ALL_COTA"
    # selected
    SELECTED_SDOCS = "SELECTED_SDOCS"
    SELECTED_SPAN_ANNOTATIONS = "SELECTED_SPAN_ANNOTATIONS"
    SELECTED_SENTENCE_ANNOTATIONS = "SELECTED_SENTENCE_ANNOTATIONS"
    SELECTED_BBOX_ANNOTATIONS = "SELECTED_BBOX_ANNOTATIONS"
    SELECTED_MEMOS = "SELECTED_MEMOS"
    SELECTED_WHITEBOARDS = "SELECTED_WHITEBOARDS"
    SELECTED_TIMELINE_ANALYSES = "SELECTED_TIMELINE_ANALYSES"
    SELECTED_COTA = "SELECTED_COTA"


class ExportSelectedSdocsParams(BaseModel):
    export_job_type: Literal[ExportJobType.SELECTED_SDOCS]
    sdoc_ids: List[int] = Field(description="IDs of the source documents to export")


class ExportSelectedSpanAnnotationsParams(BaseModel):
    export_job_type: Literal[ExportJobType.SELECTED_SPAN_ANNOTATIONS]
    span_annotation_ids: List[int] = Field(
        description="IDs of the span annotations to export"
    )


class ExportSelectedSentenceAnnotationsParams(BaseModel):
    export_job_type: Literal[ExportJobType.SELECTED_SENTENCE_ANNOTATIONS]
    sentence_annotation_ids: List[int] = Field(
        description="IDs of the sentence annotations to export"
    )


class ExportSelectedBboxAnnotationsParams(BaseModel):
    export_job_type: Literal[ExportJobType.SELECTED_BBOX_ANNOTATIONS]
    bbox_annotation_ids: List[int] = Field(
        description="IDs of the bbox annotations to export"
    )


class ExportSelectedMemosParams(BaseModel):
    export_job_type: Literal[ExportJobType.SELECTED_MEMOS]
    memo_ids: List[int] = Field(description="IDs of the memos to export")


class ExportSelectedWhiteboardsParams(BaseModel):
    export_job_type: Literal[ExportJobType.SELECTED_WHITEBOARDS]
    whiteboard_ids: List[int] = Field(description="IDs of the whiteboards to export")


class ExportSelectedTimelineAnalysesParams(BaseModel):
    export_job_type: Literal[ExportJobType.SELECTED_TIMELINE_ANALYSES]
    timeline_analysis_ids: List[int] = Field(
        description="IDs of the timeline analyses to export"
    )


class ExportSelectedCotaParams(BaseModel):
    export_job_type: Literal[ExportJobType.SELECTED_COTA]
    cota_ids: List[int] = Field(description="IDs of the cota to export")


class ExportJobParameters(BaseModel):
    export_job_type: ExportJobType = Field(
        description="The type of the export job (what to export)"
    )
    project_id: int = Field(
        description="The ID of the Project to export from",
    )
    specific_export_job_parameters: Union[
        None,
        ExportSelectedSdocsParams,
        ExportSelectedSpanAnnotationsParams,
        ExportSelectedSentenceAnnotationsParams,
        ExportSelectedBboxAnnotationsParams,
        ExportSelectedMemosParams,
        ExportSelectedWhiteboardsParams,
        ExportSelectedTimelineAnalysesParams,
        ExportSelectedCotaParams,
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
