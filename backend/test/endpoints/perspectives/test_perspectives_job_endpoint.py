from fastapi.testclient import TestClient

from composite_keys_test_utils import TwoTenants
from job_test_utils import HeldJobs
from modules.perspectives.perspectives_enum import PerspectivesJobType
from modules.perspectives.perspectives_job_dto import (
    PerspectivesJobInput,
    PerspectivesJobRead,
    PerspectivesJobStart,
    RecomputeClusterTitleAndDescriptionParams,
)


def _start(client: TestClient, project_id: int, aspect_id: int, cluster_id: int):
    """Start the recomputation of the cluster's title in the aspect."""
    start = PerspectivesJobStart(
        aspect_id=aspect_id,
        parameters=RecomputeClusterTitleAndDescriptionParams(
            perspectives_job_type=PerspectivesJobType.RECOMPUTE_CLUSTER_TITLE_AND_DESCRIPTION,
            cluster_id=cluster_id,
        ),
    )
    return client.post(
        f"/projects/{project_id}/jobs/perspectives",
        json=start.model_dump(mode="json"),
    )


# ===========================================================================
# START PERSPECTIVES JOB (POST /projects/{project_id}/jobs/perspectives) TESTS
# ===========================================================================


def test_start_perspectives_job_for_an_aspect_of_the_project(
    client: TestClient, tenants: TwoTenants, held_jobs: HeldJobs
):
    """The job of "Aspect <p>" runs in the project of the path and becomes the
    aspect's most recent job (it is held, so it does not run)."""
    own = tenants["own"]
    p = own["project"].id

    response = _start(client, p, own["aspect"].id, own["cluster"].id)

    assert response.status_code == 200, response.text
    job = PerspectivesJobRead.model_validate(response.json())
    (payload,) = held_jobs.inputs("perspectives")
    assert isinstance(payload, PerspectivesJobInput)
    assert (payload.project_id, payload.aspect_id) == (p, own["aspect"].id)
    aspect = client.get(f"/projects/{p}/perspectives/aspects/{own['aspect'].id}")
    assert aspect.json()["most_recent_job_id"] == job.job_id


def test_start_perspectives_job_for_an_aspect_of_another_project_is_not_found(
    client: TestClient, tenants: TwoTenants, held_jobs: HeldJobs
):
    """An aspect of another project of the user answers 404 and starts no job."""
    own, foreign = tenants["own"], tenants["foreign"]

    response = _start(
        client, own["project"].id, foreign["aspect"].id, foreign["cluster"].id
    )

    assert response.status_code == 404, response.text
    assert held_jobs.inputs("perspectives") == []
