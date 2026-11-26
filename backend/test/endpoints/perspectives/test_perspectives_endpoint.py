import pytest
from fastapi.testclient import TestClient

from composite_keys_test_utils import TwoTenants
from modules.perspectives.aspect_dto import AspectRead
from modules.perspectives.cluster_dto import ClusterRead
from modules.perspectives.perspectives_file_crud import (
    crud_perspectives_model_file,
    crud_perspectives_plot_file,
)

from .conftest import AspectsWithFiles


def _url(project_id: int, path: str = "") -> str:
    """The URL of the perspectives routes of the project."""
    return f"/projects/{project_id}/perspectives{path}"


# ===========================================================================
# GET ASPECTS (/projects/{project_id}/perspectives/aspects[/{aspect_id}]) TESTS
# ===========================================================================


def test_get_aspects_lists_the_aspects_of_the_path_project(
    client: TestClient, tenants: TwoTenants
):
    """Each project lists only its own "Aspect <p>"."""
    for rows in (tenants["own"], tenants["foreign"]):
        response = client.get(_url(rows["project"].id, "/aspects"))
        assert response.status_code == 200, response.text
        aspects = [AspectRead.model_validate(a) for a in response.json()]
        assert [a.id for a in aspects] == [rows["aspect"].id]


@pytest.mark.parametrize(
    "method,path",
    [
        # read the aspect
        pytest.param("GET", "", id="get"),
        # rename the aspect
        pytest.param("PATCH", "", id="update"),
        # delete the aspect
        pytest.param("DELETE", "", id="delete"),
        # the url of its map thumbnail
        pytest.param("GET", "/map-thumbnail-url", id="map-thumbnail-url"),
        # the similarities of its clusters
        pytest.param("GET", "/cluster-similarities", id="cluster-similarities"),
    ],
)
def test_aspect_of_another_project_is_not_found(
    client: TestClient, tenants: TwoTenants, method: str, path: str
):
    """An aspect of another project of the user answers 404 and stays unchanged
    in its own project."""
    own, foreign = tenants["own"], tenants["foreign"]
    aspect = foreign["aspect"]

    response = client.request(
        method,
        _url(own["project"].id, f"/aspects/{aspect.id}{path}"),
        json={"name": "Renamed"} if method == "PATCH" else None,
    )

    assert response.status_code == 404, response.text
    response = client.get(_url(foreign["project"].id, f"/aspects/{aspect.id}"))
    assert response.status_code == 200, response.text
    assert response.json()["name"] == aspect.name


# ===========================================================================
# GET DOCUMENT ASPECT (/projects/{project_id}/perspectives/aspects/{aspect_id}/source-documents/{sdoc_id}) TESTS
# ===========================================================================


def test_get_document_aspect_content(client: TestClient, tenants: TwoTenants):
    """The document aspect of "doc_<p>.txt" has the empty content."""
    own = tenants["own"]

    response = client.get(
        _url(
            own["project"].id,
            f"/aspects/{own['aspect'].id}/source-documents/{own['sdoc'].id}",
        )
    )

    assert response.status_code == 200, response.text
    assert response.json() == ""


# ===========================================================================
# GET CLUSTERS (/projects/{project_id}/perspectives/aspects/{aspect_id}/clusters) TESTS
# ===========================================================================


def test_get_clusters_of_a_document(client: TestClient, tenants: TwoTenants):
    """The document "doc_<p>.txt" is in "Cluster <p>" of "Aspect <p>"."""
    own = tenants["own"]

    response = client.get(
        _url(own["project"].id, f"/aspects/{own['aspect'].id}/clusters"),
        params={"sdoc_id": own["sdoc"].id},
    )

    assert response.status_code == 200, response.text
    clusters = [ClusterRead.model_validate(c) for c in response.json()]
    assert [c.id for c in clusters] == [own["cluster"].id]


def test_get_clusters_of_a_document_of_another_project_matches_nothing(
    client: TestClient, tenants: TwoTenants
):
    """A document of another project as filter finds no cluster."""
    own, foreign = tenants["own"], tenants["foreign"]

    response = client.get(
        _url(own["project"].id, f"/aspects/{own['aspect'].id}/clusters"),
        params={"sdoc_id": foreign["sdoc"].id},
    )

    assert response.status_code == 200, response.text
    assert response.json() == []


# ===========================================================================
# GET MAP THUMBNAIL URL (/projects/{project_id}/perspectives/aspects/{aspect_id}/map-thumbnail-url) TESTS
# ===========================================================================


def test_get_map_thumbnail_url_of_a_computed_map(
    client: TestClient, aspects_with_files: AspectsWithFiles
):
    """The URL of the map thumbnail is below the aspect's plot folder."""
    aspect = aspects_with_files["mapped"]

    response = client.get(
        _url(aspect.project_id, f"/aspects/{aspect.id}/map-thumbnail-url")
    )

    assert response.status_code == 200, response.text
    assert response.json() == (
        f"projects/{aspect.project_id}/perspectives_plots/{aspect.id}/map_thumbnail.png"
    )


def test_get_map_thumbnail_url_is_none_until_the_map_is_computed(
    client: TestClient, aspects_with_files: AspectsWithFiles
):
    """An aspect without a map thumbnail has no URL."""
    aspect = aspects_with_files["unmapped"]

    response = client.get(
        _url(aspect.project_id, f"/aspects/{aspect.id}/map-thumbnail-url")
    )

    assert response.status_code == 200, response.text
    assert response.json() is None


def test_get_map_thumbnail_url_if_not_exists(client: TestClient, test_project):
    """An unknown aspect is not found."""
    response = client.get(_url(test_project.id, "/aspects/4000/map-thumbnail-url"))

    assert response.status_code == 404, response.text


# ===========================================================================
# UPDATE CLUSTER (/projects/{project_id}/perspectives/clusters/{cluster_id}) TESTS
# ===========================================================================


def test_update_cluster_renames_it(client: TestClient, tenants: TwoTenants):
    """Renaming "Cluster <p>" returns the renamed cluster."""
    own = tenants["own"]

    response = client.patch(
        _url(own["project"].id, f"/clusters/{own['cluster'].id}"),
        json={"name": "Renamed"},
    )

    assert response.status_code == 200, response.text
    cluster = ClusterRead.model_validate(response.json())
    assert (cluster.id, cluster.name) == (own["cluster"].id, "Renamed")


def test_update_cluster_of_another_project_is_not_found(
    client: TestClient, tenants: TwoTenants
):
    """A cluster of another project of the user answers 404."""
    own, foreign = tenants["own"], tenants["foreign"]

    response = client.patch(
        _url(own["project"].id, f"/clusters/{foreign['cluster'].id}"),
        json={"name": "Renamed"},
    )

    assert response.status_code == 404, response.text


# ===========================================================================
# DELETE ASPECT (/projects/{project_id}/perspectives/aspects/{aspect_id}) TESTS
# ===========================================================================


def test_delete_aspect_removes_its_models_and_plots(
    client: TestClient, aspects_with_files: AspectsWithFiles
):
    """Deleting an aspect removes its model and plot folders."""
    aspect = aspects_with_files["mapped"]
    folders = [
        crud_perspectives_model_file.dir(project_id=aspect.project_id, id=aspect.id),
        crud_perspectives_plot_file.dir(project_id=aspect.project_id, id=aspect.id),
    ]
    assert all(folder.is_dir() for folder in folders)

    response = client.delete(_url(aspect.project_id, f"/aspects/{aspect.id}"))

    assert response.status_code == 200, response.text
    assert [folder.exists() for folder in folders] == [False, False]
