from fastapi.testclient import TestClient

from common.date_group_by_enum import DateGroupBy
from core.project.project_orm import ProjectORM
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


def _url(project_id: int, path: str = "") -> str:
    """The URL of the timeline analysis routes of the project."""
    return f"/projects/{project_id}/timeline-analyses{path}"


def _create(client: TestClient, project_id: int, name: str) -> TimelineAnalysisRead:
    response = client.put(
        _url(project_id),
        json=TimelineAnalysisCreate(
            name=name, timeline_analysis_type=TimelineAnalysisType.SPAN_ANNO
        ).model_dump(mode="json"),
    )
    assert response.status_code == 200, response.text
    return TimelineAnalysisRead.model_validate(response.json())


def _all_spans_update(date_metadata_id: int) -> dict:
    """An update that counts the words of all span annotations per year of the
    date metadata."""
    return TimelineAnalysisUpdate(
        settings=TimelineAnalysisSettings(
            group_by=DateGroupBy.YEAR,
            annotation_aggregation_type=TAAnnotationAggregationType.UNIT,
            date_metadata_id=date_metadata_id,
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
    ).model_dump(mode="json", exclude_unset=True)


# ===========================================================================
# CREATE AND LIST TIMELINE ANALYSES (/projects/{project_id}/timeline-analyses) TESTS
# ===========================================================================


def test_timeline_analyses_are_listed_by_their_project(
    client: TestClient, timeline_project: TimelineProject, other_project: ProjectORM
) -> None:
    """A new analysis is listed in its project only."""
    project = timeline_project["project"]
    created = _create(client, project.id, "Words")
    _create(client, other_project.id, "Other")

    response = client.get(_url(project.id))

    assert response.status_code == 200, response.text
    assert [TimelineAnalysisRead.model_validate(ta) for ta in response.json()] == [
        created
    ]


def test_timeline_analysis_of_another_project_is_not_found(
    client: TestClient, timeline_project: TimelineProject, other_project: ProjectORM
) -> None:
    """Reading, duplicating, updating and deleting an analysis of another project
    of the user answers 404; the analysis is unchanged."""
    project = timeline_project["project"]
    other = _create(client, other_project.id, "Other")

    for method, path, body in [
        ("GET", f"/{other.id}", None),
        ("PUT", f"/{other.id}/duplicate", None),
        ("PATCH", f"/{other.id}", {"name": "renamed"}),
        ("PATCH", f"/{other.id}/recompute", None),
        ("DELETE", f"/{other.id}", None),
    ]:
        response = client.request(method, _url(project.id, path), json=body)
        assert response.status_code == 404, (method, path, response.text)

    response = client.get(_url(other_project.id, f"/{other.id}"))
    assert TimelineAnalysisRead.model_validate(response.json()) == other


# ===========================================================================
# UPDATE TIMELINE ANALYSIS (/projects/{project_id}/timeline-analyses/{timeline_analysis_id}) TESTS
# ===========================================================================


def test_span_annotation_unit_count_is_the_number_of_annotated_words(
    client: TestClient, timeline_project: TimelineProject
) -> None:
    """A span annotation timeline analysis that aggregates by unit counts the words
    of the annotations: "Alice met Bob" (3) and "Berlin." (1) give 4, since
    end_token is exclusive."""
    project = timeline_project["project"]
    timeline_analysis = _create(client, project.id, "Words")

    response = client.patch(
        _url(project.id, f"/{timeline_analysis.id}"),
        json=_all_spans_update(timeline_project["published_field"].id),
    )

    assert response.status_code == 200, response.text
    [concept] = TimelineAnalysisRead.model_validate(response.json()).concepts
    assert [(result.date, result.count) for result in concept.results] == [("2020", 4)]


def test_date_metadata_of_another_project_is_not_found(
    client: TestClient, timeline_project: TimelineProject, other_project: ProjectORM
) -> None:
    """The date metadata of the settings is read within the analysis' project, as a
    JSON field has no foreign key: the "published" field of the test project
    answers 404 for an analysis of another project, which keeps its settings."""
    timeline_analysis = _create(client, other_project.id, "Foreign dates")

    response = client.patch(
        _url(other_project.id, f"/{timeline_analysis.id}"),
        json=_all_spans_update(timeline_project["published_field"].id),
    )

    assert response.status_code == 404, response.text
    response = client.get(_url(other_project.id, f"/{timeline_analysis.id}"))
    assert TimelineAnalysisRead.model_validate(response.json()) == timeline_analysis
