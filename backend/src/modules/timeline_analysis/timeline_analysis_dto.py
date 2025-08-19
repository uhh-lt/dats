from datetime import datetime
from enum import Enum
from typing import Literal

import srsly
from pydantic import BaseModel, ConfigDict, Field
from pydantic.functional_validators import field_validator

from modules.analysis.analysis_dto import DateGroupBy
from modules.search.bbox_anno_search.bbox_anno_search_columns import BBoxColumns
from modules.search.sdoc_search.sdoc_search_columns import SdocColumns
from modules.search.sent_anno_search.sent_anno_search_columns import SentAnnoColumns
from modules.search.span_anno_search.span_anno_search_columns import SpanColumns
from repos.db.dto_base import UpdateDTOBase
from systems.search_system.filtering import Filter

####################
# Base Types
####################


class TimelineAnalysisResult(BaseModel):
    date: str = Field(description="The date.")
    data_ids: list[int] = Field(description="The data IDs used for provenance.")
    count: int = Field(description="The count / value used for plotting.")


class TimelineAnalysisType(str, Enum):
    DOCUMENT = "document"
    SENT_ANNO = "sentence_annotation"
    SPAN_ANNO = "span_annotation"
    BBOX_ANNO = "bbox_annotation"


class TAAnnotationAggregationType(str, Enum):
    UNIT = "unit"
    ANNOTATION = "annotation"
    DOCUMENT = "document"


class SdocTimelineAnalysisFilter(BaseModel):
    timeline_analysis_type: Literal[TimelineAnalysisType.DOCUMENT]
    filter: Filter[SdocColumns] = Field(description="The filter of the Concept")


class SentAnnoTimelineAnalysisFilter(BaseModel):
    timeline_analysis_type: Literal[TimelineAnalysisType.SENT_ANNO]
    filter: Filter[SentAnnoColumns] = Field(description="The filter of the Concept")


class SpanAnnoTimelineAnalysisFilter(BaseModel):
    timeline_analysis_type: Literal[TimelineAnalysisType.SPAN_ANNO]
    filter: Filter[SpanColumns] = Field(description="The filter of the Concept")


class BBoxAnnoTimelineAnalysisFilter(BaseModel):
    timeline_analysis_type: Literal[TimelineAnalysisType.BBOX_ANNO]
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


class TimelineAnalysisConceptUpdate(BaseModel):
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


class TimelineAnalysisCreateIntern(TimelineAnalysisCreate, UpdateDTOBase):
    settings: str | None = Field(
        description="JSON Representation of the TimelineAnalysisSettings.",
        default=None,
    )
    concepts: str | None = Field(
        description=(
            "JSON Representation of the list of Concepts that are "
            "part of the TimelineAnalysis"
        ),
        default=None,
    )


class TimelineAnalysisUpdate(BaseModel, UpdateDTOBase):
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
    settings: str | None = Field(
        description="JSON Representation of the Timeline Settings of the TimelineAnalysis.",
        default=None,
    )
    concepts: str | None = Field(
        description=(
            "JSON Representation of the list of Concepts that are "
            "part of the TimelineAnalysis"
        ),
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

    @field_validator("concepts", mode="before")
    @classmethod
    def json_loads_concepts(cls, v: str | list) -> list[TimelineAnalysisConcept]:
        if isinstance(v, str):
            # v is a JSON string from the DB
            data = srsly.json_loads(v)
            if isinstance(data, list):
                if len(data) == 0:
                    return []
                elif isinstance(data[0], dict):
                    return [TimelineAnalysisConcept(**concept) for concept in data]
        elif isinstance(v, list):
            if len(v) == 0:
                return []
            elif isinstance(v[0], dict):
                return [TimelineAnalysisConcept(**concept) for concept in v]
            elif isinstance(v[0], TimelineAnalysisConcept):
                return v

        raise ValueError(
            "Invalid value for concepts. "
            "Must be a JSON string or a list of TimelineAnalysisConcepts."
        )

    @field_validator("settings", mode="before")
    @classmethod
    def json_loads_settings(cls, v: str | dict) -> TimelineAnalysisSettings:
        if isinstance(v, str):
            # v is a JSON string from the DB
            data = srsly.json_loads(v)
            if isinstance(data, dict):
                return TimelineAnalysisSettings(**data)
        elif isinstance(v, dict):
            return TimelineAnalysisSettings(**v)

        raise ValueError(
            "Invalid value for settings. "
            "Must be a JSON string or a dict of TimelineAnalysisSettings."
        )

    model_config = ConfigDict(from_attributes=True)

    def __str__(self) -> str:
        return f"TimelineAnalysisRead(id={self.id}, name={self.name},  project_id={self.project_id}, settings={self.settings}, concepts={self.concepts}, created={self.created}, updated={self.updated})"

    def __repr__(self) -> str:
        return str(self)
