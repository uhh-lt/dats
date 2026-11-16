from fastapi.testclient import TestClient

from feature_test_utils import FeaturelessProject
from modules.search_annotate.search_annotate_dto import PaginatedSpanAnnotationHits

# ===========================================================================
# AUTO ANNOTATE (/search_annotate/auto_annotate) TESTS
# ===========================================================================


def test_auto_annotate_works_in_a_project_without_features(
    client: TestClient, featureless_project: FeaturelessProject
):
    """Search & Auto-Annotate is no feature: it needs only the core search
    index. The document of the project is not stored in Elasticsearch, so the
    query finds nothing."""
    response = client.post(
        "/search_annotate/auto_annotate",
        params={"project_id": featureless_project["project"].id, "query": "alpha"},
    )

    assert response.status_code == 200, response.text
    hits = PaginatedSpanAnnotationHits.model_validate(response.json())
    assert (hits.total_results, hits.hits) == (0, [])
