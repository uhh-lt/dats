import pytest
from fastapi.testclient import TestClient

from composite_keys_test_utils import TwoTenants
from feature_test_utils import assert_feature_disabled, feature_named
from modules.concept_over_time_analysis.cota_dto import (
    COTACreate,
    COTARead,
    COTARefinementHyperparameters,
)
from pipeline_test_utils import artefact_named
from systems.feature_system.feature_registry import feature_registry

from .conftest import ProjectWithCota


def _url(project_id: int, path: str = "") -> str:
    """The URL of the concept over time analysis routes of the project."""
    return f"/projects/{project_id}/concept-over-time-analyses{path}"


# ===========================================================================
# GET COTA (/projects/{project_id}/concept-over-time-analyses/{cota_id}) TESTS
# ===========================================================================


@pytest.mark.parametrize(
    "method,path",
    [
        # every route with the analysis in the path
        pytest.param("GET", "", id="get"),
        pytest.param("PUT", "/duplicate", id="duplicate"),
        pytest.param("PATCH", "", id="update"),
        pytest.param("PATCH", "/annotate-sentences", id="annotate"),
        pytest.param("PATCH", "/remove-sentences", id="remove"),
        pytest.param("PATCH", "/reset", id="reset"),
        pytest.param("POST", "/refine", id="refine"),
        pytest.param("DELETE", "", id="delete"),
    ],
)
def test_cota_of_another_project_is_not_found(
    client: TestClient,
    project_with_cota: ProjectWithCota,
    embedded_cota,
    method: str,
    path: str,
):
    """An analysis of another project of the user (with the feature) answers 404
    on every route of the test project and stays unchanged."""
    project_id = project_with_cota["project"].id
    other_project, other_cota = embedded_cota
    bodies = {
        "PATCH ": {"name": "renamed"},
        "PATCH /annotate-sentences": [],
        "PATCH /remove-sentences": [],
        "POST /refine": COTARefinementHyperparameters().model_dump(mode="json"),
    }

    response = client.request(
        method,
        _url(project_id, f"/{other_cota.id}{path}"),
        json=bodies.get(f"{method} {path}"),
    )

    assert response.status_code == 404, response.text
    response = client.get(_url(other_project["project"].id, f"/{other_cota.id}"))
    assert COTARead.model_validate(response.json()).name == "Embedded COTA"


def test_get_cotas_lists_the_analyses_of_the_project(
    client: TestClient, project_with_cota: ProjectWithCota, embedded_cota
):
    """The list holds the analyses of the path's project only."""
    response = client.get(_url(project_with_cota["project"].id))

    assert response.status_code == 200, response.text
    assert [COTARead.model_validate(c) for c in response.json()] == [
        project_with_cota["cota"]
    ]


# ===========================================================================
# UPDATE COTA (/projects/{project_id}/concept-over-time-analyses/{cota_id}) TESTS
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
    project_id = project_with_cota["project"].id

    response = client.patch(_url(project_id, f"/{cota.id}"), json=payload)

    assert response.status_code == 422, response.text
    response = client.get(_url(project_id, f"/{cota.id}"))
    assert response.status_code == 200, response.text
    assert COTARead.model_validate(response.json()).name == "Test COTA"


def test_update_cota_name(client: TestClient, project_with_cota) -> None:
    """Updating only the name renames the COTA."""
    cota = project_with_cota["cota"]
    project_id = project_with_cota["project"].id

    response = client.patch(
        _url(project_id, f"/{cota.id}"), json={"name": "Renamed COTA"}
    )

    assert response.status_code == 200, response.text
    assert COTARead.model_validate(response.json()).name == "Renamed COTA"


@pytest.mark.parametrize(
    "tenant,status_code",
    [
        # the metadata of the path's project is stored
        pytest.param("own", 200, id="own-metadata"),
        # the metadata of another project is not found (a JSON field has no
        # foreign key)
        pytest.param("foreign", 404, id="foreign-metadata"),
    ],
)
def test_update_cota_with_date_metadata_of_another_project_is_not_found(
    client: TestClient, tenants: TwoTenants, tenant: str, status_code: int
) -> None:
    """The date metadata of the timeline settings must be one of the path's
    project; the metadata of another project of the user is not stored."""
    own, foreign = tenants["own"], tenants["foreign"]
    metadata = (own if tenant == "own" else foreign)["project_metadata"]
    url = _url(own["project"].id, f"/{own['cota'].id}")

    response = client.patch(
        url, json={"timeline_settings": {"date_metadata_id": metadata.id}}
    )

    assert response.status_code == status_code, response.text
    response = client.get(url)
    stored = COTARead.model_validate(response.json()).timeline_settings
    assert (stored.date_metadata_id == metadata.id) == (tenant == "own")


# ===========================================================================
# ANNOTATE AND REMOVE SENTENCES (/projects/{project_id}/concept-over-time-analyses/{cota_id}/annotate-sentences, .../remove-sentences) TESTS
# ===========================================================================


@pytest.mark.parametrize(
    "path,params",
    [
        # annotate the sentence with a concept
        pytest.param("/annotate-sentences", {"concept_id": "c1"}, id="annotate"),
        # remove the sentence from the search space
        pytest.param("/remove-sentences", None, id="remove"),
    ],
)
def test_sentence_of_another_project_is_not_found(
    client: TestClient, tenants: TwoTenants, path: str, params: dict | None
) -> None:
    """Sentence 0 of the document of another project of the user is not in the
    search space of the own COTA: 404, the search space is unchanged; the own
    sentence 0 is annotated or removed."""
    own, foreign = tenants["own"], tenants["foreign"]
    url = _url(own["project"].id, f"/{own['cota'].id}")

    def change(sdoc_id: int):
        return client.patch(
            f"{url}{path}",
            params=params,
            json=[{"sdoc_id": sdoc_id, "sentence_id": 0}],
        )

    response = change(foreign["sdoc"].id)
    assert response.status_code == 404, response.text
    search_space = COTARead.model_validate(client.get(url).json()).search_space
    assert [(s.sdoc_id, s.concept_annotation) for s in search_space] == [
        (own["sdoc"].id, None)
    ]

    response = change(own["sdoc"].id)
    assert response.status_code == 200, response.text
    search_space = COTARead.model_validate(response.json()).search_space
    assert [(s.sdoc_id, s.concept_annotation) for s in search_space] == (
        [(own["sdoc"].id, "c1")] if path == "/annotate-sentences" else []
    )


# ===========================================================================
# GATING (all /projects/{project_id}/concept-over-time-analyses routes) TESTS
# ===========================================================================
# A project without concepts over time rejects every route of the module, from the
# project router (see also endpoints/feature/test_feature_gating.py).


@pytest.mark.parametrize(
    "method,path",
    [
        pytest.param("PUT", "", id="create"),
        pytest.param("GET", "", id="get-by-project"),
        pytest.param("GET", "/{cota_id}", id="get-by-id"),
        pytest.param("PUT", "/{cota_id}/duplicate", id="duplicate"),
        pytest.param("PATCH", "/{cota_id}/reset", id="reset"),
        pytest.param("POST", "/{cota_id}/refine", id="refine"),
        pytest.param("DELETE", "/{cota_id}", id="delete"),
    ],
)
def test_cota_routes_are_rejected_when_concepts_over_time_is_disabled(
    client: TestClient,
    featureless_project_with_cota: ProjectWithCota,
    method: str,
    path: str,
):
    p = featureless_project_with_cota
    bodies = {
        "PUT ": COTACreate(name="New COTA").model_dump(),
        "POST /{cota_id}/refine": COTARefinementHyperparameters().model_dump(),
    }

    response = client.request(
        method,
        _url(p["project"].id, path.format(cota_id=p["cota"].id)),
        json=bodies.get(f"{method} {path}"),
    )

    assert_feature_disabled(response, "concepts_over_time")


def test_cota_route_with_a_non_integer_id_is_a_validation_error(
    client: TestClient, project_with_cota: ProjectWithCota
):
    """An id that is no integer is rejected with 422, not with 500."""
    response = client.get(_url(project_with_cota["project"].id, "/abc"))

    assert response.status_code == 422, response.text
    assert "cota_id" in response.text


# ===========================================================================
# FEATURE DECLARATION (cota_feature.py)
# ===========================================================================


def test_concepts_over_time_requires_the_sentence_embeddings():
    """Concepts over time requires the sentence embeddings, the only artefact it needs
    besides the core artefacts."""
    assert feature_named("concepts_over_time").requires_artefacts == {
        artefact_named("sentence_embeddings")
    }
    assert feature_registry.required_artefacts(
        [feature_named("concepts_over_time")]
    ) == {artefact_named("sentence_embeddings")}
