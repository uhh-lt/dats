from fastapi.testclient import TestClient

from feature_test_utils import FeaturelessProject
from modules.search_annotate.search_annotate_dto import PaginatedSpanAnnotationHits

# ===========================================================================
# AUTO ANNOTATE (/projects/{project_id}/search-annotate/auto-annotate) TESTS
# ===========================================================================


def test_auto_annotate_works_in_a_project_without_features(
    client: TestClient, featureless_project: FeaturelessProject
):
    """Search & Auto-Annotate is no feature: it needs only the core search
    index, where it finds the word "cat" of the project's document."""
    sdoc = featureless_project["sdoc"]
    response = client.post(
        f"/projects/{featureless_project['project'].id}/search-annotate/auto-annotate",
        params={"query": "cat"},
    )

    assert response.status_code == 200, response.text
    hits = PaginatedSpanAnnotationHits.model_validate(response.json())
    assert [(h.span_dto.sdoc_id, h.span_dto.span_text) for h in hits.hits] == [
        (sdoc.id, "cat")
    ]


def test_auto_annotate_finds_nothing_in_another_project(
    client: TestClient, test_project, featureless_project: FeaturelessProject
):
    """The word "cat" is only in the document of "Featureless Project", another
    project of the user: searching the (empty) test project finds nothing."""
    response = client.post(
        f"/projects/{test_project.id}/search-annotate/auto-annotate",
        params={"query": "cat"},
    )

    assert response.status_code == 200, response.text
    hits = PaginatedSpanAnnotationHits.model_validate(response.json())
    assert hits.hits == []
