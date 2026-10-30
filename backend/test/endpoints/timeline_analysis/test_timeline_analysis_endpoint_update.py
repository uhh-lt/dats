from fastapi.testclient import TestClient

from modules.analysis.analysis_enum import DateGroupBy
from modules.timeline_analysis.timeline_analysis_dto import (
    SpanAnnoTimelineAnalysisFilter,
    TimelineAnalysisConceptUpdate,
    TimelineAnalysisCreate,
    TimelineAnalysisRead,
    TimelineAnalysisSettings,
    TimelineAnalysisUpdate,
)
from modules.timeline_analysis.timeline_analysis_enum import (
    TAAnnotationAggregationType,
    TimelineAnalysisType,
)
from systems.search_system.filtering import Filter, LogicalOperator

from .conftest import TimelineProject

# ===========================================================================
# UPDATE TIMELINE ANALYSIS (/timelineAnalysis/{timeline_analysis_id}) TESTS
# ===========================================================================


def test_span_annotation_unit_count_is_the_number_of_annotated_words(
    client: TestClient, timeline_project: TimelineProject
) -> None:
    """A span annotation timeline analysis that aggregates by unit counts the words
    of the annotations: "Alice met Bob" (3) and "Berlin." (1) give 4, since
    end_token is exclusive."""
    project = timeline_project["project"]
    response = client.put(
        "/timelineAnalysis",
        json=TimelineAnalysisCreate(
            name="Words",
            timeline_analysis_type=TimelineAnalysisType.SPAN_ANNO,
            project_id=project.id,
        ).model_dump(mode="json"),
    )
    assert response.status_code == 200, response.text
    timeline_analysis = TimelineAnalysisRead.model_validate(response.json())

    response = client.patch(
        f"/timelineAnalysis/{timeline_analysis.id}",
        json=TimelineAnalysisUpdate(
            settings=TimelineAnalysisSettings(
                group_by=DateGroupBy.YEAR,
                annotation_aggregation_type=TAAnnotationAggregationType.UNIT,
                date_metadata_id=timeline_project["published_field"].id,
            ),
            concepts=[
                TimelineAnalysisConceptUpdate(
                    id="all",
                    name="All spans",
                    description="",
                    color="red",
                    visible=True,
                    ta_specific_filter=SpanAnnoTimelineAnalysisFilter(
                        timeline_analysis_type=TimelineAnalysisType.SPAN_ANNO,
                        filter=Filter(
                            id="root", items=[], logic_operator=LogicalOperator.and_
                        ),
                    ),
                )
            ],
        ).model_dump(mode="json", exclude_unset=True),
    )

    assert response.status_code == 200, response.text
    [concept] = TimelineAnalysisRead.model_validate(response.json()).concepts
    assert [(result.date, result.count) for result in concept.results] == [("2020", 4)]
