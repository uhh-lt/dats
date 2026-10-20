import pytest
from fastapi.testclient import TestClient

from modules.concept_over_time_analysis.cota_dto import COTARead

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
