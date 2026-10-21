from datetime import datetime
from typing import Any, ClassVar, Literal

from pydantic import BaseModel, ConfigDict, Field

from modules.analysis.analysis_enum import DateGroupBy
from modules.search.bbox_anno_search.bbox_anno_search_columns import BBoxColumns
from modules.search.sdoc_search.sdoc_search_columns import SdocColumns
from modules.search.sent_anno_search.sent_anno_search_columns import SentAnnoColumns
from modules.search.span_anno_search.span_anno_search_columns import SpanColumns
from modules.timeline_analysis.timeline_analysis_enum import (
    TAAnnotationAggregationType,
    TimelineAnalysisType,
)
from repos.db.dto_base import UpdateDTOBase
from systems.search_system.filtering import Filter

####################
# Base Types
####################


class TimelineAnalysisResult(BaseModel):
    date: str = Field(description="The date.")
    data_ids: list[int] = Field(description="The data IDs used for provenance.")
    count: int = Field(description="The count / value used for plotting.")


class SdocTimelineAnalysisFilter(BaseModel):
    timeline_analysis_type: Literal[TimelineAnalysisType.DOCUMENT] = Field(
        description="Type of the Timeline Analysis"
    )
    filter: Filter[SdocColumns] = Field(description="The filter of the Concept")


class SentAnnoTimelineAnalysisFilter(BaseModel):
    timeline_analysis_type: Literal[TimelineAnalysisType.SENT_ANNO] = Field(
        description="Type of the Timeline Analysis"
    )
    filter: Filter[SentAnnoColumns] = Field(description="The filter of the Concept")


class SpanAnnoTimelineAnalysisFilter(BaseModel):
    timeline_analysis_type: Literal[TimelineAnalysisType.SPAN_ANNO] = Field(
        description="Type of the Timeline Analysis"
    )
    filter: Filter[SpanColumns] = Field(description="The filter of the Concept")


class BBoxAnnoTimelineAnalysisFilter(BaseModel):
    timeline_analysis_type: Literal[TimelineAnalysisType.BBOX_ANNO] = Field(
        description="Type of the Timeline Analysis"
    )
    filter: Filter[BBoxColumns] = Field(description="The filter of the Concept")


class TimelineAnalysisConceptForExport(BaseModel):
    timeline_analysis_type: TimelineAnalysisType = Field(
        description="Type of the Timeline Analysis"
    )
    id: str = Field(description="ID of the Concept")
    name: str = Field(description="Name of the Concept")
    description: str = Field(description="Description of the Concept")
    color: str = Field(description="Color of the Concept")
    visible: bool = Field(description="Visibility of the Concept")
    ta_specific_filter: (
        SdocTimelineAnalysisFilter
        | SentAnnoTimelineAnalysisFilter
        | SpanAnnoTimelineAnalysisFilter
        | BBoxAnnoTimelineAnalysisFilter
    ) = Field(
        description="List of Concepts that are part of the TimelineAnalysis",
        discriminator="timeline_analysis_type",
    )


class TimelineAnalysisConcept(TimelineAnalysisConceptForExport):
    filter_hash: int = Field(description="Hash of the filter to identify changes")
    results: list[TimelineAnalysisResult] = Field(
        description="List of Results of the TimelineAnalysis"
    )


class TimelineAnalysisConceptUpdate(BaseModel, UpdateDTOBase):
    id: str = Field(description="ID of the Concept")
    name: str = Field(description="Name of the Concept")
    description: str = Field(description="Description of the Concept")
    color: str = Field(description="Color of the Concept")
    visible: bool = Field(description="Visibility of the Concept")
    ta_specific_filter: (
        SdocTimelineAnalysisFilter
        | SentAnnoTimelineAnalysisFilter
        | SpanAnnoTimelineAnalysisFilter
        | BBoxAnnoTimelineAnalysisFilter
    ) = Field(
        description="List of Concepts that are part of the TimelineAnalysis",
        discriminator="timeline_analysis_type",
    )


class TimelineAnalysisSettingsForExport(BaseModel):
    group_by: DateGroupBy = Field(description="Group by date", default=DateGroupBy.YEAR)
    annotation_aggregation_type: TAAnnotationAggregationType | None = Field(
        description="The type of the annotation aggregation (only for TimelineAnalysisType != DOCUMENT)",
        default=TAAnnotationAggregationType.ANNOTATION,
    )


class TimelineAnalysisSettings(TimelineAnalysisSettingsForExport):
    date_metadata_id: int | None = Field(
        description="ID of the Project Date Metadata that is used for the TimelineAnalysis",
        default=None,
    )


####################
# TimelineAnalysis DTOs
####################


class TimelineAnalysisBaseDTO(BaseModel):
    name: str = Field(description="Name of the TimelineAnalysis")
    timeline_analysis_type: TimelineAnalysisType = Field(
        description="The type of the TimelineAnalysis"
    )


class TimelineAnalysisCreate(TimelineAnalysisBaseDTO):
    project_id: int = Field(description="Project the TimelineAnalysis belongs to")


class TimelineAnalysisCreateIntern(TimelineAnalysisCreate):
    settings: dict[str, Any] | None = Field(
        description="TimelineAnalysisSettings as JSON.",
        default=None,
    )
    concepts: list[dict[str, Any]] | None = Field(
        description="List of Concepts that are part of the TimelineAnalysis as JSON",
        default=None,
    )


class TimelineAnalysisUpdate(BaseModel, UpdateDTOBase):
    # NOT NULL columns: omit to keep the value, an explicit null is rejected
    non_nullable_fields: ClassVar[frozenset[str]] = frozenset(
        {"name", "settings", "concepts"}
    )

    name: str | None = Field(
        description="Name of the TimelineAnalysis",
        default=None,
    )
    settings: TimelineAnalysisSettings | None = Field(
        description="Settings of the TimelineAnalysis.",
        default=None,
    )
    concepts: list[TimelineAnalysisConceptUpdate] | None = Field(
        description="List of Concepts that are part of the TimelineAnalysis",
        default=None,
    )


class TimelineAnalysisUpdateIntern(BaseModel, UpdateDTOBase):
    name: str | None = Field(
        description="Name of the TimelineAnalysis",
        default=None,
    )
    settings: dict[str, Any] | None = Field(
        description="TimelineAnalysisSettings as JSON.",
        default=None,
    )
    concepts: list[dict[str, Any]] | None = Field(
        description="List of Concepts that are part of the TimelineAnalysis as JSON",
        default=None,
    )


class TimelineAnalysisRead(TimelineAnalysisBaseDTO):
    id: int = Field(description="ID of the TimelineAnalysis")
    project_id: int = Field(description="Project the TimelineAnalysis belongs to")
    settings: TimelineAnalysisSettings = Field(
        description="Timeline Analysis Settings of the TimelineAnalysis."
    )
    concepts: list[TimelineAnalysisConcept] = Field(
        description="List of Concepts that are part of the TimelineAnalysis"
    )
    created: datetime = Field(description="Created timestamp of the TimelineAnalysis")
    updated: datetime = Field(description="Updated timestamp of the TimelineAnalysis")

    model_config = ConfigDict(from_attributes=True)

    def __str__(self) -> str:
        return f"TimelineAnalysisRead(id={self.id}, name={self.name},  project_id={self.project_id}, settings={self.settings}, concepts={self.concepts}, created={self.created}, updated={self.updated})"

    def __repr__(self) -> str:
        return str(self)
