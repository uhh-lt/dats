from typing import Literal

from pydantic import BaseModel, Field, model_validator

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

    @model_validator(mode="after")
    def check_parameters_match_the_type(self) -> "ExportJobInput":
        """A SELECTED_* export takes the parameters of its type, an ALL_* export none,
        so the job never fails in the worker on a mismatch."""
        parameters_type = (
            self.specific_export_job_parameters.export_job_type
            if self.specific_export_job_parameters is not None
            else None
        )
        expected_type = (
            self.export_job_type
            if self.export_job_type.value.startswith("SELECTED_")
            else None
        )
        if parameters_type != expected_type:
            raise ValueError(
                f"The export job type {self.export_job_type.value} takes "
                f"{'the parameters of its type' if expected_type else 'no parameters'}, "
                f"got {parameters_type.value if parameters_type else 'none'}."
            )
        return self


# Properties shared across all DTOs
class ExportJobOutput(JobOutputBase):
    results_url: str | None = Field(
        default=None, description="URL to download the results when done."
    )
