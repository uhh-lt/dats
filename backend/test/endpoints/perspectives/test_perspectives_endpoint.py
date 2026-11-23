from fastapi.testclient import TestClient

from modules.perspectives.perspectives_file_crud import (
    crud_perspectives_model_file,
    crud_perspectives_plot_file,
)

from .conftest import AspectsWithFiles

# ===========================================================================
# GET MAP THUMBNAIL URL (/perspectives/aspect/{aspect_id}/map_thumbnail_url) TESTS
# ===========================================================================


def test_get_map_thumbnail_url_of_a_computed_map(
    client: TestClient, aspects_with_files: AspectsWithFiles
):
    """The URL of the map thumbnail is below the aspect's plot folder."""
    aspect = aspects_with_files["mapped"]

    response = client.get(f"/perspectives/aspect/{aspect.id}/map_thumbnail_url")

    assert response.status_code == 200, response.text
    assert response.json() == (
        f"projects/{aspect.project_id}/perspectives_plots/{aspect.id}/map_thumbnail.png"
    )


def test_get_map_thumbnail_url_is_none_until_the_map_is_computed(
    client: TestClient, aspects_with_files: AspectsWithFiles
):
    """An aspect without a map thumbnail has no URL."""
    aspect = aspects_with_files["unmapped"]

    response = client.get(f"/perspectives/aspect/{aspect.id}/map_thumbnail_url")

    assert response.status_code == 200, response.text
    assert response.json() is None


def test_get_map_thumbnail_url_if_not_exists(client: TestClient):
    response = client.get("/perspectives/aspect/4000/map_thumbnail_url")

    assert response.status_code == 403, response.text


# ===========================================================================
# DELETE ASPECT (/perspectives/aspect/{aspect_id}) TESTS
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

    response = client.delete(f"/perspectives/aspect/{aspect.id}")

    assert response.status_code == 200, response.text
    assert [folder.exists() for folder in folders] == [False, False]
