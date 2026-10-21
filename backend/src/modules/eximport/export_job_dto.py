from typing import Literal

from pydantic import BaseModel, Field

from modules.eximport.export_enum import ExportJobType
from systems.job_system.job_dto import JobInputBase, JobOutputBase


class ExportSelectedSdocsParams(BaseModel):
    export_job_type: Literal[ExportJobType.SELECTED_SDOCS] = Field(
        description="The type of the export job (what to export)"
    )
    sdoc_ids: list[int] = Field(description="IDs of the source documents to export")


class ExportSelectedSpanAnnotationsParams(BaseModel):
    export_job_type: Literal[ExportJobType.SELECTED_SPAN_ANNOTATIONS] = Field(
        description="The type of the export job (what to export)"
    )
    span_annotation_ids: list[int] = Field(
        description="IDs of the span annotations to export"
    )


class ExportSelectedSentenceAnnotationsParams(BaseModel):
    export_job_type: Literal[ExportJobType.SELECTED_SENTENCE_ANNOTATIONS] = Field(
        description="The type of the export job (what to export)"
    )
    sentence_annotation_ids: list[int] = Field(
        description="IDs of the sentence annotations to export"
    )


class ExportSelectedBboxAnnotationsParams(BaseModel):
    export_job_type: Literal[ExportJobType.SELECTED_BBOX_ANNOTATIONS] = Field(
        description="The type of the export job (what to export)"
    )
    bbox_annotation_ids: list[int] = Field(
        description="IDs of the bbox annotations to export"
    )


class ExportSelectedMemosParams(BaseModel):
    export_job_type: Literal[ExportJobType.SELECTED_MEMOS] = Field(
        description="The type of the export job (what to export)"
    )
    memo_ids: list[int] = Field(description="IDs of the memos to export")


class ExportSelectedWhiteboardsParams(BaseModel):
    export_job_type: Literal[ExportJobType.SELECTED_WHITEBOARDS] = Field(
        description="The type of the export job (what to export)"
    )
    whiteboard_ids: list[int] = Field(description="IDs of the whiteboards to export")


class ExportSelectedTimelineAnalysesParams(BaseModel):
    export_job_type: Literal[ExportJobType.SELECTED_TIMELINE_ANALYSES] = Field(
        description="The type of the export job (what to export)"
    )
    timeline_analysis_ids: list[int] = Field(
        description="IDs of the timeline analyses to export"
    )


class ExportSelectedCotaParams(BaseModel):
    export_job_type: Literal[ExportJobType.SELECTED_COTA] = Field(
        description="The type of the export job (what to export)"
    )
    cota_ids: list[int] = Field(description="IDs of the cota to export")


class ExportJobInput(JobInputBase):
    export_job_type: ExportJobType = Field(
        description="The type of the export job (what to export)"
    )
    specific_export_job_parameters: (
        None
        | ExportSelectedSdocsParams
        | ExportSelectedSpanAnnotationsParams
        | ExportSelectedSentenceAnnotationsParams
        | ExportSelectedBboxAnnotationsParams
        | ExportSelectedMemosParams
        | ExportSelectedWhiteboardsParams
        | ExportSelectedTimelineAnalysesParams
        | ExportSelectedCotaParams
    ) = Field(
        description="Specific parameters for the export job w.r.t it's type",
        discriminator="export_job_type",
    )


# Properties shared across all DTOs
class ExportJobOutput(JobOutputBase):
    results_url: str | None = Field(
        default=None, description="URL to download the results when done."
    )
