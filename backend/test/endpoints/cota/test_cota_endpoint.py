import pytest
from fastapi.testclient import TestClient

from common.feature_enum import Feature
from feature_test_utils import assert_feature_disabled
from modules.concept_over_time_analysis.cota_dto import (
    COTACreate,
    COTARead,
    COTARefinementJobInput,
)

from .conftest import ProjectWithCota

# ===========================================================================
# UPDATE COTA (/cota/{cota_id}) TESTS
# ===========================================================================


@pytest.mark.parametrize(
    "payload",
    [
        # empty PATCH body
        pytest.param({}, id="empty"),
        # name is NOT NULL, null is no valid value
        pytest.param({"name": None}, id="name-null"),
        # concepts are NOT NULL, null is no valid value
        pytest.param({"concepts": None}, id="concepts-null"),
    ],
)
def test_update_cota_rejects_empty_or_null_update(
    client: TestClient, project_with_cota, payload: dict
) -> None:
    """An empty update or an explicit null for a NOT NULL field is a 422, and the COTA is unchanged."""
    cota = project_with_cota["cota"]

    response = client.patch(f"/cota/{cota.id}", json=payload)

    assert response.status_code == 422, response.text
    response = client.get(f"/cota/{cota.id}")
    assert response.status_code == 200, response.text
    assert COTARead.model_validate(response.json()).name == "Test COTA"


def test_update_cota_name(client: TestClient, project_with_cota) -> None:
    """Updating only the name renames the COTA."""
    cota = project_with_cota["cota"]

    response = client.patch(f"/cota/{cota.id}", json={"name": "Renamed COTA"})

    assert response.status_code == 200, response.text
    assert COTARead.model_validate(response.json()).name == "Renamed COTA"


# ===========================================================================
# GATING (all /cota routes) TESTS
# ===========================================================================
# A project without concepts over time rejects every route of the module,
# whether it names the project, the analysis or carries the project in the body.


@pytest.mark.parametrize(
    "method,path",
    [
        pytest.param("GET", "/cota/{cota_id}", id="get-by-id"),
        pytest.param("GET", "/cota/project/{project_id}", id="get-by-project"),
        pytest.param("PUT", "/cota/duplicate/{cota_id}", id="duplicate"),
        pytest.param("PATCH", "/cota/reset/{cota_id}", id="reset"),
        pytest.param("DELETE", "/cota/{cota_id}", id="delete"),
    ],
)
def test_cota_routes_are_rejected_when_concepts_over_time_is_disabled(
    client: TestClient,
    featureless_project_with_cota: ProjectWithCota,
    method: str,
    path: str,
):
    p = featureless_project_with_cota
    url = path.format(cota_id=p["cota"].id, project_id=p["project"].id)

    response = client.request(method, url)

    assert_feature_disabled(response, Feature.CONCEPTS_OVER_TIME)


def test_create_cota_is_rejected_when_concepts_over_time_is_disabled(
    client: TestClient, featureless_project_with_cota: ProjectWithCota
):
    """The project of a new analysis comes from the request body."""
    create = COTACreate(
        name="New COTA", project_id=featureless_project_with_cota["project"].id
    )

    response = client.put("/cota", json=create.model_dump())

    assert_feature_disabled(response, Feature.CONCEPTS_OVER_TIME)


def test_refine_cota_is_rejected_when_concepts_over_time_is_disabled(
    client: TestClient, featureless_project_with_cota: ProjectWithCota
):
    p = featureless_project_with_cota
    payload = COTARefinementJobInput(project_id=p["project"].id, cota_id=p["cota"].id)

    response = client.post("/cota/refine", json=payload.model_dump(mode="json"))

    assert_feature_disabled(response, Feature.CONCEPTS_OVER_TIME)
