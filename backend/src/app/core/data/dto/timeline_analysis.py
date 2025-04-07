from datetime import datetime
from enum import Enum
from typing import List, Literal, Optional, Union

import srsly
from pydantic import BaseModel, ConfigDict, Field
from pydantic.functional_validators import field_validator

from app.core.data.dto.analysis import DateGroupBy
from app.core.data.dto.dto_base import UpdateDTOBase
from app.core.search.bbox_anno_search.bbox_anno_search_columns import BBoxColumns
from app.core.search.filtering import Filter
from app.core.search.sdoc_search.sdoc_search_columns import SdocColumns
from app.core.search.sent_anno_search.sent_anno_search_columns import SentAnnoColumns
from app.core.search.span_anno_search.span_anno_search_columns import SpanColumns

####################
# Base Types
####################


class TimelineAnalysisResult(BaseModel):
    date: str = Field(description="The date.")
    data_ids: List[int] = Field(description="The data IDs used for provenance.")
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


class TimelineAnalysisConcept(BaseModel):
    timeline_analysis_type: TimelineAnalysisType = Field(
        description="Type of the Timeline Analysis"
    )
    id: str = Field(description="ID of the Concept")
    name: str = Field(description="Name of the Concept")
    description: str = Field(description="Description of the Concept")
    color: str = Field(description="Color of the Concept")
    visible: bool = Field(description="Visibility of the Concept")
    ta_specific_filter: Union[
        SdocTimelineAnalysisFilter,
        SentAnnoTimelineAnalysisFilter,
        SpanAnnoTimelineAnalysisFilter,
        BBoxAnnoTimelineAnalysisFilter,
    ] = Field(
        description="List of Concepts that are part of the TimelineAnalysis",
        discriminator="timeline_analysis_type",
    )
    filter_hash: int = Field(description="Hash of the filter to identify changes")
    results: List[TimelineAnalysisResult] = Field(
        description="List of Results of the TimelineAnalysis"
    )


class TimelineAnalysisConceptUpdate(BaseModel):
    id: str = Field(description="ID of the Concept")
    name: str = Field(description="Name of the Concept")
    description: str = Field(description="Description of the Concept")
    color: str = Field(description="Color of the Concept")
    visible: bool = Field(description="Visibility of the Concept")
    ta_specific_filter: Union[
        SdocTimelineAnalysisFilter,
        SentAnnoTimelineAnalysisFilter,
        SpanAnnoTimelineAnalysisFilter,
        BBoxAnnoTimelineAnalysisFilter,
    ] = Field(
        description="List of Concepts that are part of the TimelineAnalysis",
        discriminator="timeline_analysis_type",
    )


class TimelineAnalysisSettings(BaseModel):
    group_by: DateGroupBy = Field(description="Group by date", default=DateGroupBy.YEAR)
    date_metadata_id: Optional[int] = Field(
        description="ID of the Project Date Metadata that is used for the TimelineAnalysis",
        default=None,
    )
    annotation_aggregation_type: Optional[TAAnnotationAggregationType] = Field(
        description="The type of the annotation aggregation (only for TimelineAnalysisType != DOCUMENT)",
        default=TAAnnotationAggregationType.ANNOTATION,
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
    user_id: int = Field(description="User the TimelineAnalysis belongs to")
    settings: Optional[str] = Field(
        description="JSON Representation of the TimelineAnalysisSettings.",
        default=None,
    )
    concepts: Optional[str] = Field(
        description=(
            "JSON Representation of the list of Concepts that are "
            "part of the TimelineAnalysis"
        ),
        default=None,
    )


class TimelineAnalysisUpdate(BaseModel, UpdateDTOBase):
    name: Optional[str] = Field(
        description="Name of the TimelineAnalysis",
        default=None,
    )
    settings: Optional[TimelineAnalysisSettings] = Field(
        description="Settings of the TimelineAnalysis.",
        default=None,
    )
    concepts: Optional[List[TimelineAnalysisConceptUpdate]] = Field(
        description="List of Concepts that are part of the TimelineAnalysis",
        default=None,
    )


class TimelineAnalysisUpdateIntern(BaseModel, UpdateDTOBase):
    name: Optional[str] = Field(
        description="Name of the TimelineAnalysis",
        default=None,
    )
    settings: Optional[str] = Field(
        description="JSON Representation of the Timeline Settings of the TimelineAnalysis.",
        default=None,
    )
    concepts: Optional[str] = Field(
        description=(
            "JSON Representation of the list of Concepts that are "
            "part of the TimelineAnalysis"
        ),
        default=None,
    )


class TimelineAnalysisRead(TimelineAnalysisBaseDTO):
    id: int = Field(description="ID of the TimelineAnalysis")
    user_id: int = Field(description="User the TimelineAnalysis belongs to")
    project_id: int = Field(description="Project the TimelineAnalysis belongs to")
    settings: TimelineAnalysisSettings = Field(
        description="Timeline Analysis Settings of the TimelineAnalysis."
    )
    concepts: List[TimelineAnalysisConcept] = Field(
        description="List of Concepts that are part of the TimelineAnalysis"
    )
    created: datetime = Field(description="Created timestamp of the TimelineAnalysis")
    updated: datetime = Field(description="Updated timestamp of the TimelineAnalysis")

    @field_validator("concepts", mode="before")
    @classmethod
    def json_loads_concepts(cls, v: Union[str, List]) -> List[TimelineAnalysisConcept]:
        if isinstance(v, str):
            # v is a JSON string from the DB
            data = srsly.json_loads(v)
            if isinstance(data, List):
                if len(data) == 0:
                    return []
                elif isinstance(data[0], dict):
                    return [TimelineAnalysisConcept(**concept) for concept in data]
        elif isinstance(v, List):
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
    def json_loads_settings(cls, v: Union[str, dict]) -> TimelineAnalysisSettings:
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
        return f"TimelineAnalysisRead(id={self.id}, name={self.name}, user_id={self.user_id}, project_id={self.project_id}, settings={self.settings}, concepts={self.concepts}, created={self.created}, updated={self.updated})"

    def __repr__(self) -> str:
        return str(self)
