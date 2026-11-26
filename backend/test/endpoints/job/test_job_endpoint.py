import pytest
from fastapi.routing import APIRoute, iter_route_contexts
from fastapi.testclient import TestClient
from pydantic import BaseModel

from core.project.project_orm import ProjectORM
from feature_test_utils import FeaturelessProject, assert_feature_disabled
from modules.duplicate_finder.duplicate_finder_job import DuplicateFinderInput
from modules.tag_recommendation.tag_recommendation_dto import (
    TagRecommendationJobInput,
)
from systems.job_system.job_service import JobService

from .conftest import TagRecommendationJobs

# the generated routes of the tag recommendation job (EndpointGeneration.ALL)
TAG_RECOMMENDATION = "jobs/tag-recommendation"

# ===========================================================================
# START JOB (/projects/{project_id}/jobs/{job_type}) TESTS
# ===========================================================================
# Jobs of gated modules check their feature in `validate_input` before they are
# enqueued.


def test_duplicate_finder_job_is_rejected_when_the_feature_is_disabled(
    client: TestClient, featureless_project: FeaturelessProject
):
    project_id = featureless_project["project"].id
    payload = DuplicateFinderInput(
        project_id=project_id, max_different_words=1, tag_id=None
    )

    response = client.post(
        f"/projects/{project_id}/jobs/duplicate-finder", json=payload.model_dump()
    )

    assert_feature_disabled(response, "duplicate_finder")


def test_tag_recommendation_job_is_rejected_when_the_feature_is_disabled(
    client: TestClient, featureless_project: FeaturelessProject
):
    project_id = featureless_project["project"].id
    payload = TagRecommendationJobInput(project_id=project_id)

    response = client.post(
        f"/projects/{project_id}/{TAG_RECOMMENDATION}",
        json=payload.model_dump(mode="json"),
    )

    assert_feature_disabled(response, "tag_recommendation")


def test_start_job_runs_in_the_project_of_the_path(
    client: TestClient,
    test_project: ProjectORM,
    tag_recommendation_jobs: TagRecommendationJobs,
):
    """The start body has no project: the job runs in the project of the path."""
    response = client.post(f"/projects/{test_project.id}/{TAG_RECOMMENDATION}", json={})

    assert response.status_code == 200, response.text
    job = JobService().get_job(response.json()["job_id"])
    assert job.get_project_id() == test_project.id
    assert job.job.kwargs["payload"].project_id == test_project.id
    assert response.json()["project_id"] == test_project.id


def test_every_generated_job_start_body_has_no_project(client: TestClient):
    """The body of every generated job start route is the `<JobName>JobStart` model
    of its job input without `project_id`, which comes from the path."""
    starts = {
        context.path: context.original_route.body_field
        for context in iter_route_contexts(client.app.routes)  # type: ignore[attr-defined]
        if isinstance(context.original_route, APIRoute)
        # the start routes register_job_endpoints generates
        and context.original_route.endpoint.__qualname__
        == "register_job_endpoints.<locals>.start_job"
    }

    assert starts
    for path, body in starts.items():
        assert body is not None, path
        model = body.field_info.annotation
        assert isinstance(model, type) and issubclass(model, BaseModel), path
        assert model.__name__.endswith("JobStart"), path
        assert "project_id" not in model.model_fields, path


def test_start_job_of_a_non_member_is_forbidden(
    non_member_client: TestClient, test_project: ProjectORM
):
    payload = TagRecommendationJobInput(project_id=test_project.id)

    response = non_member_client.post(
        f"/projects/{test_project.id}/{TAG_RECOMMENDATION}",
        json=payload.model_dump(mode="json"),
    )

    assert response.status_code == 403, response.text


# ===========================================================================
# GET JOBS (/projects/{project_id}/jobs/{job_type}) TESTS
# ===========================================================================


def test_get_jobs_lists_the_jobs_of_the_path_project_only(
    client: TestClient,
    test_project: ProjectORM,
    tag_recommendation_jobs: TagRecommendationJobs,
):
    response = client.get(f"/projects/{test_project.id}/{TAG_RECOMMENDATION}")

    assert response.status_code == 200, response.text
    assert [job["job_id"] for job in response.json()] == [
        tag_recommendation_jobs["own"]
    ]


def test_get_jobs_of_a_non_member_is_forbidden(
    non_member_client: TestClient, test_project: ProjectORM
):
    response = non_member_client.get(
        f"/projects/{test_project.id}/{TAG_RECOMMENDATION}"
    )

    assert response.status_code == 403, response.text


# ===========================================================================
# GET, ABORT, RETRY JOB (/projects/{project_id}/jobs/{job_type}/{job_id}) TESTS
# ===========================================================================

JOB_ROUTES = [
    # read the job
    pytest.param("GET", "", id="get"),
    # stop the job
    pytest.param("POST", "/abort", id="abort"),
    # requeue the job
    pytest.param("POST", "/retry", id="retry"),
]


def test_get_job_returns_the_job_of_the_path_project(
    client: TestClient,
    test_project: ProjectORM,
    tag_recommendation_jobs: TagRecommendationJobs,
):
    job_id = tag_recommendation_jobs["own"]

    response = client.get(f"/projects/{test_project.id}/{TAG_RECOMMENDATION}/{job_id}")

    assert response.status_code == 200, response.text
    assert response.json()["job_id"] == job_id
    assert response.json()["project_id"] == test_project.id


@pytest.mark.parametrize("method,suffix", JOB_ROUTES)
def test_job_of_another_project_is_not_found(
    client: TestClient,
    test_project: ProjectORM,
    tag_recommendation_jobs: TagRecommendationJobs,
    method: str,
    suffix: str,
):
    """The user is a member of both projects, but the job of the other project
    does not exist in the project of the path."""
    job_id = tag_recommendation_jobs["other"]

    response = client.request(
        method, f"/projects/{test_project.id}/{TAG_RECOMMENDATION}/{job_id}{suffix}"
    )

    assert response.status_code == 404, response.text


@pytest.mark.parametrize("method,suffix", JOB_ROUTES)
def test_job_of_another_type_is_not_found(
    client: TestClient,
    test_project: ProjectORM,
    tag_recommendation_jobs: TagRecommendationJobs,
    method: str,
    suffix: str,
):
    """A tag recommendation job of the project is no crawler job."""
    job_id = tag_recommendation_jobs["own"]

    response = client.request(
        method, f"/projects/{test_project.id}/jobs/crawler/{job_id}{suffix}"
    )

    assert response.status_code == 404, response.text


@pytest.mark.parametrize("method,suffix", JOB_ROUTES)
def test_unknown_job_is_not_found(
    client: TestClient, test_project: ProjectORM, method: str, suffix: str
):
    response = client.request(
        method, f"/projects/{test_project.id}/{TAG_RECOMMENDATION}/unknown{suffix}"
    )

    assert response.status_code == 404, response.text


@pytest.mark.parametrize("method,suffix", JOB_ROUTES)
def test_job_route_of_a_non_member_is_forbidden(
    non_member_client: TestClient,
    test_project: ProjectORM,
    tag_recommendation_jobs: TagRecommendationJobs,
    method: str,
    suffix: str,
):
    job_id = tag_recommendation_jobs["own"]

    response = non_member_client.request(
        method, f"/projects/{test_project.id}/{TAG_RECOMMENDATION}/{job_id}{suffix}"
    )

    assert response.status_code == 403, response.text


def test_retry_job_is_rejected_when_the_feature_is_disabled(
    client: TestClient,
    featureless_project: FeaturelessProject,
    featureless_tag_recommendation_job: str,
):
    """A retry checks the input again like the start: tag recommendation is
    disabled in the job's project, so the job is not requeued."""
    project_id = featureless_project["project"].id

    response = client.post(
        f"/projects/{project_id}/{TAG_RECOMMENDATION}/"
        f"{featureless_tag_recommendation_job}/retry"
    )

    assert_feature_disabled(response, "tag_recommendation")
