from fastapi.testclient import TestClient

from common.feature_enum import Feature
from feature_test_utils import FeaturelessProject, assert_feature_disabled

EMPTY_FILTER = {"id": "root", "logic_operator": "and", "items": []}

# ===========================================================================
# WORD FREQUENCY INFO (/word_frequency/info/{project_id}) TESTS
# ===========================================================================


def test_info_is_rejected_when_word_frequency_is_disabled(
    client: TestClient, featureless_project: FeaturelessProject
):
    response = client.get(f"/word_frequency/info/{featureless_project['project'].id}")

    assert_feature_disabled(response, Feature.WORD_FREQUENCY)


# ===========================================================================
# DOCUMENT WORD FREQUENCIES (/word_frequency/sdoc/{sdoc_id}) TESTS
# ===========================================================================


def test_sdoc_word_frequencies_are_rejected_when_word_frequency_is_disabled(
    client: TestClient, featureless_project: FeaturelessProject
):
    """The project is resolved from the document."""
    response = client.get(f"/word_frequency/sdoc/{featureless_project['sdoc'].id}")

    assert_feature_disabled(response, Feature.WORD_FREQUENCY)


def test_sdoc_word_frequencies_of_a_project_with_word_frequency_are_returned(
    client: TestClient, project_with_sdoc
):
    """The test project enables all features; its document has none."""
    response = client.get(
        f"/word_frequency/sdoc/{project_with_sdoc['source_document'].id}"
    )

    assert response.status_code == 200, response.text
    assert response.json() == []


# ===========================================================================
# WORD FREQUENCY ANALYSIS (/word_frequency/analysis, /export) TESTS
# ===========================================================================


def test_analysis_is_rejected_when_word_frequency_is_disabled(
    client: TestClient, featureless_project: FeaturelessProject
):
    response = client.post(
        "/word_frequency/analysis",
        params={
            "project_id": featureless_project["project"].id,
            "page": 0,
            "page_size": 10,
        },
        json={"filter": EMPTY_FILTER, "sorts": []},
    )

    assert_feature_disabled(response, Feature.WORD_FREQUENCY)


def test_export_is_rejected_when_word_frequency_is_disabled(
    client: TestClient, featureless_project: FeaturelessProject
):
    response = client.post(
        "/word_frequency/export",
        params={"project_id": featureless_project["project"].id},
        json={"filter": EMPTY_FILTER, "sorts": []},
    )

    assert_feature_disabled(response, Feature.WORD_FREQUENCY)
