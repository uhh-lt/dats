from fastapi.testclient import TestClient

from feature_test_utils import FeaturelessProject, assert_feature_disabled

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
# WORD FREQUENCIES (/projects/{project_id}/word-frequencies, /export) TESTS
# ===========================================================================


def test_analysis_is_rejected_when_word_frequency_is_disabled(
    client: TestClient, featureless_project: FeaturelessProject
):
    response = client.post(
        f"/projects/{featureless_project['project'].id}/word-frequencies",
        json={"page_number": 0, "page_size": 10, "filter": EMPTY_FILTER, "sorts": []},
    )

    assert_feature_disabled(response, "word_frequency")


def test_export_is_rejected_when_word_frequency_is_disabled(
    client: TestClient, featureless_project: FeaturelessProject
):
    response = client.post(
        f"/projects/{featureless_project['project'].id}/word-frequencies/export",
        json={"filter": EMPTY_FILTER},
    )

    assert_feature_disabled(response, "word_frequency")
