import pytest
from fastapi.testclient import TestClient

from core.project.project_orm import ProjectORM
from modules.eximport.import_enum import ImportJobType

# ===========================================================================
# START IMPORT JOB (POST /projects/{project_id}/jobs/import) TESTS
# ===========================================================================
# The import round trips of every job type are in the `test_*_eximport*.py` files;
# this file tests the checks of the route itself.


@pytest.mark.parametrize(
    "filename,content_type",
    [
        # a text file where the codes import expects a CSV file
        pytest.param("codes.txt", "text/plain", id="wrong-file-type"),
        # a CSV media type with another suffix
        pytest.param("codes.txt", "text/csv", id="wrong-suffix"),
    ],
)
def test_start_import_job_with_a_file_that_does_not_fit_the_type_is_rejected(
    client: TestClient, test_project: ProjectORM, filename: str, content_type: str
) -> None:
    """A file whose type or suffix does not fit the import job type is a client
    error (400), not a server error."""
    response = client.post(
        f"/projects/{test_project.id}/jobs/import",
        data={"import_job_type": ImportJobType.CODES.value},
        files={"uploaded_file": (filename, b"name,description\n", content_type)},
    )

    assert response.status_code == 400, response.text
    assert "cannot be imported" in response.text
