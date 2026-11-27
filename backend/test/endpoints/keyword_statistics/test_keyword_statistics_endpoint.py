from fastapi.testclient import TestClient

from feature_test_utils import FeaturelessProject, assert_feature_disabled
from modules.keyword_statistics.keyword_statistics_dto import KeywordStat

from .conftest import KeywordProjects

# ===========================================================================
# KEYWORD STATISTICS (/projects/{project_id}/keyword-statistics) TESTS
# ===========================================================================


def test_keyword_statistics_are_rejected_when_the_feature_is_disabled(
    client: TestClient, featureless_project: FeaturelessProject
):
    response = client.post(
        f"/projects/{featureless_project['project'].id}/keyword-statistics",
        json=[featureless_project["sdoc"].id],
    )

    assert_feature_disabled(response, "keyword_statistics")


def test_keyword_statistics_of_a_project_with_the_feature_are_computed(
    client: TestClient, project_with_sdoc
):
    """The test project enables the features on by default; its document has no
    keywords."""
    response = client.post(
        f"/projects/{project_with_sdoc['project'].id}/keyword-statistics",
        json=[project_with_sdoc["source_document"].id],
    )

    assert response.status_code == 200, response.text
    assert response.json() == []


def test_keyword_statistics_ignore_the_documents_of_another_project(
    client: TestClient, keyword_projects: KeywordProjects
):
    """A document of another project of the user matches nothing; the own
    document counts its keywords, and the global counts hold only the own
    project ("alpha" once, although the other project has it too)."""
    url = f"/projects/{keyword_projects['own_project'].id}/keyword-statistics"

    response = client.post(url, json=[keyword_projects["foreign_sdoc"].id])
    assert response.status_code == 200, response.text
    assert response.json() == []

    response = client.post(url, json=[keyword_projects["own_sdoc"].id])
    assert response.status_code == 200, response.text
    stats = [KeywordStat.model_validate(stat) for stat in response.json()]
    assert sorted((s.keyword, s.filtered_count, s.global_count) for s in stats) == [
        ("alpha", 1, 1),
        ("beta", 1, 1),
    ]
