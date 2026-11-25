from fastapi.testclient import TestClient

from composite_keys_test_utils import TwoTenants
from feature_test_utils import FeaturelessProject, assert_feature_disabled
from modules.word_frequency.word_frequency_dto import WordFrequencyRead

EMPTY_FILTER = {"id": "root", "logic_operator": "and", "items": []}

# ===========================================================================
# WORD FREQUENCY INFO (/projects/{project_id}/word-frequencies/info) TESTS
# ===========================================================================


def test_info_is_rejected_when_word_frequency_is_disabled(
    client: TestClient, featureless_project: FeaturelessProject
):
    response = client.get(
        f"/projects/{featureless_project['project'].id}/word-frequencies/info"
    )

    assert_feature_disabled(response, "word_frequency")


# ===========================================================================
# DOCUMENT WORD FREQUENCIES (/projects/{project_id}/word-frequencies?sdoc_id=) TESTS
# ===========================================================================


def test_sdoc_word_frequencies_are_rejected_when_word_frequency_is_disabled(
    client: TestClient, featureless_project: FeaturelessProject
):
    """The feature is checked in the project of the path."""
    response = client.get(
        f"/projects/{featureless_project['project'].id}/word-frequencies",
        params={"sdoc_id": featureless_project["sdoc"].id},
    )

    assert_feature_disabled(response, "word_frequency")


def test_sdoc_word_frequencies_of_a_project_with_word_frequency_are_returned(
    client: TestClient, tenants: TwoTenants
):
    """The test project enables word frequency by default; its document "doc_<p>"
    counts the word "word" once."""
    own = tenants["own"]

    response = client.get(
        f"/projects/{own['project'].id}/word-frequencies",
        params={"sdoc_id": own["sdoc"].id},
    )

    assert response.status_code == 200, response.text
    assert [WordFrequencyRead.model_validate(wf) for wf in response.json()] == [
        WordFrequencyRead(sdoc_id=own["sdoc"].id, word="word", count=1)
    ]


def test_sdoc_word_frequencies_of_a_document_of_another_project_match_nothing(
    client: TestClient, tenants: TwoTenants
):
    """The document filter is matched within the path's project only."""
    own, foreign = tenants["own"], tenants["foreign"]

    response = client.get(
        f"/projects/{own['project'].id}/word-frequencies",
        params={"sdoc_id": foreign["sdoc"].id},
    )

    assert response.status_code == 200, response.text
    assert response.json() == []


# ===========================================================================
# WORD FREQUENCY ANALYSIS (/projects/{project_id}/word-frequencies/analysis, /export) TESTS
# ===========================================================================


def test_analysis_is_rejected_when_word_frequency_is_disabled(
    client: TestClient, featureless_project: FeaturelessProject
):
    response = client.post(
        f"/projects/{featureless_project['project'].id}/word-frequencies/analysis",
        params={"page": 0, "page_size": 10},
        json={"filter": EMPTY_FILTER, "sorts": []},
    )

    assert_feature_disabled(response, "word_frequency")


def test_export_is_rejected_when_word_frequency_is_disabled(
    client: TestClient, featureless_project: FeaturelessProject
):
    response = client.post(
        f"/projects/{featureless_project['project'].id}/word-frequencies/export",
        json={"filter": EMPTY_FILTER, "sorts": []},
    )

    assert_feature_disabled(response, "word_frequency")
