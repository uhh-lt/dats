from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

import dats_test_utils
from feature_test_utils import FeaturelessProject, assert_feature_disabled
from job_test_utils import HeldJobs
from modules.tag_recommendation.tag_recommendation_crud import (
    crud_tag_recommendation_link,
)
from modules.tag_recommendation.tag_recommendation_dto import (
    TagRecommendationJobInput,
    TagRecommendationLinkRead,
    TagRecommendationResult,
)
from modules.tag_recommendation.tag_recommendation_enum import (
    TagRecommendationMethod,
)
from modules.tag_recommendation.tag_recommendation_orm import (
    TagRecommendationLinkORM,
)
from systems.job_system.job_system_enum import JobStatus

from .conftest import (
    FOREIGN_ML_JOB_ID,
    OWN_ML_JOB_ID,
    TagRecommendationJobProject,
    TagRecommendationProject,
)


@pytest.fixture(scope="function")
def outsider_client(
    app_client: TestClient, tag_recommendation_project: TagRecommendationProject
) -> Generator[TestClient, None, None]:
    """A client that sends its requests as the outsider."""
    c = dats_test_utils.create_user_client(
        app_client, tag_recommendation_project["outsider"]
    )
    yield c
    c.close()


def _unreviewed_recommendation_ids(client: TestClient, ml_job_id: str) -> set[int]:
    response = client.get(f"/tagrecommendation/job/{ml_job_id}")
    assert response.status_code == 200, response.text
    results = [TagRecommendationResult.model_validate(r) for r in response.json()]
    return {rid for result in results for rid in result.recommendation_ids}


# ===========================================================================
# REVIEW RECOMMENDATIONS (/tagrecommendation/review_recommendations) TESTS
# ===========================================================================


def test_review_recommendations_marks_own_recommendations_as_reviewed(
    client: TestClient, tag_recommendation_project: TagRecommendationProject
):
    """A project member reviews both recommendations of their project."""
    p = tag_recommendation_project
    ids = [p["recommendation_a"].id, p["recommendation_b"].id]

    response = client.patch("/tagrecommendation/review_recommendations", json=ids)

    assert response.status_code == 200, response.text
    results = [TagRecommendationLinkRead.model_validate(r) for r in response.json()]
    assert [r.predicted_tag_id for r in results] == [p["tag_a"].id, p["tag_b"].id]
    assert all(r.is_reviewed for r in results)
    assert _unreviewed_recommendation_ids(client, OWN_ML_JOB_ID) == set()


def test_review_recommendations_rejects_non_member_and_changes_nothing(
    client: TestClient,
    outsider_client: TestClient,
    tag_recommendation_project: TagRecommendationProject,
):
    """A user who is not a member of the project cannot review its
    recommendations, and the recommendations stay unreviewed."""
    p = tag_recommendation_project
    ids = [p["recommendation_a"].id, p["recommendation_b"].id]

    response = outsider_client.patch(
        "/tagrecommendation/review_recommendations", json=ids
    )

    assert response.status_code == 403, response.text
    assert _unreviewed_recommendation_ids(client, OWN_ML_JOB_ID) == set(ids)


def test_review_recommendations_rejects_mixed_own_and_foreign_ids(
    client: TestClient,
    outsider_client: TestClient,
    tag_recommendation_project: TagRecommendationProject,
):
    """A member cannot smuggle a recommendation of a foreign project into a
    review of their own ones; the whole request is rejected and nothing changes."""
    p = tag_recommendation_project
    own_ids = [p["recommendation_a"].id]
    foreign_id = p["foreign_recommendation"].id

    response = client.patch(
        "/tagrecommendation/review_recommendations", json=[*own_ids, foreign_id]
    )

    assert response.status_code == 403, response.text
    assert _unreviewed_recommendation_ids(client, OWN_ML_JOB_ID) == {
        p["recommendation_a"].id,
        p["recommendation_b"].id,
    }
    assert _unreviewed_recommendation_ids(outsider_client, FOREIGN_ML_JOB_ID) == {
        foreign_id
    }


def test_review_recommendations_rejects_unknown_id(
    client: TestClient, tag_recommendation_project: TagRecommendationProject
):
    """An id that does not exist is rejected like a foreign one, so the
    endpoint does not reveal which ids exist."""
    response = client.patch("/tagrecommendation/review_recommendations", json=[999_999])

    assert response.status_code == 403, response.text


def test_review_recommendations_rejects_a_disabled_feature_and_changes_nothing(
    client: TestClient,
    db_session: Session,
    featureless_recommendation: TagRecommendationLinkORM,
):
    """A member cannot review the recommendations of a project whose tag
    recommendation is disabled, and the recommendation stays unreviewed (read
    from the database, as the job listing is gated by the feature too)."""
    response = client.patch(
        "/tagrecommendation/review_recommendations",
        json=[featureless_recommendation.id],
    )

    assert_feature_disabled(response, "tag_recommendation")
    db_session.expire_all()
    assert not crud_tag_recommendation_link.read(
        db=db_session, id=featureless_recommendation.id
    ).is_reviewed


# ===========================================================================
# TAG RECOMMENDATION JOBS (/job/tag_recommendation) TESTS
# ===========================================================================
# The job endpoints are generated from the job registration (job system).


def test_a_started_tag_recommendation_job_is_listed(
    client: TestClient, test_project, held_jobs: HeldJobs
):
    """A job started in a project with tag recommendation is listed for the
    project (it is held, so it does not run)."""
    payload = TagRecommendationJobInput(project_id=test_project.id)

    started = client.post(
        "/job/tag_recommendation", json=payload.model_dump(mode="json")
    )
    listed = client.get(f"/job/tag_recommendation/project/{test_project.id}")

    assert started.status_code == 200, started.text
    assert listed.status_code == 200, listed.text
    assert [job["job_id"] for job in listed.json()] == [started.json()["job_id"]]


def test_a_tag_recommendation_job_of_a_disabled_feature_stays_listed(
    client: TestClient, featureless_project: FeaturelessProject
):
    """The generated job listing checks the membership only, as every job
    listing: a project without tag recommendation lists its jobs (none here),
    while starting one is rejected (see the job endpoint tests)."""
    response = client.get(
        f"/job/tag_recommendation/project/{featureless_project['project'].id}"
    )

    assert response.status_code == 200, response.text
    assert response.json() == []


# --- running the job --------------------------------------------------------
# The job runs in-process (held jobs), the recommendations are read by its id.


def _run_job(
    client: TestClient,
    held_jobs: HeldJobs,
    payload: TagRecommendationJobInput,
) -> dict[int, list[int]]:
    """Start and run the job; its recommendations: tag ids by document id."""
    started = client.post(
        "/job/tag_recommendation", json=payload.model_dump(mode="json")
    )
    assert started.status_code == 200, started.text
    held_jobs.run("tag_recommendation")
    job_id = started.json()["job_id"]
    (job,) = held_jobs.ran("tag_recommendation")
    assert job.get_status() == JobStatus.FINISHED

    response = client.get(f"/tagrecommendation/job/{job_id}")
    assert response.status_code == 200, response.text
    results = [TagRecommendationResult.model_validate(r) for r in response.json()]
    return {r.sdoc_id: r.suggested_tag_ids for r in results}


@pytest.mark.parametrize(
    "method",
    [
        # the nearest tagged documents vote for their tags
        pytest.param(TagRecommendationMethod.KNN, id="knn"),
        # each tagged document passes its tags to its nearest documents
        pytest.param(TagRecommendationMethod.SIMPLE, id="simple"),
    ],
)
def test_tag_recommendation_job_recommends_the_tag_of_the_nearest_document(
    client: TestClient,
    held_jobs: HeldJobs,
    tag_recommendation_job_project: TagRecommendationJobProject,
    method: TagRecommendationMethod,
):
    """Without tag ids every applied tag counts: each untagged document gets
    the tag of the tagged document next to it; the document without an
    embedding gets none, and the job finishes."""
    p = tag_recommendation_job_project

    recommendations = _run_job(
        client,
        held_jobs,
        TagRecommendationJobInput(project_id=p["project"].id, method=method),
    )

    assert recommendations == {
        p["sports_untagged"].id: [p["sports"].id],
        p["politics_untagged"].id: [p["politics"].id],
    }


def test_tag_recommendation_job_recommends_only_the_given_tags(
    client: TestClient,
    held_jobs: HeldJobs,
    tag_recommendation_job_project: TagRecommendationJobProject,
):
    """With the tag ids [politics], SIMPLE recommends politics only, also for
    the untagged document about politics."""
    p = tag_recommendation_job_project

    recommendations = _run_job(
        client,
        held_jobs,
        TagRecommendationJobInput(
            project_id=p["project"].id,
            method=TagRecommendationMethod.SIMPLE,
            tag_ids=[p["politics"].id],
        ),
    )

    assert recommendations[p["politics_untagged"].id] == [p["politics"].id]
    assert {tag for tags in recommendations.values() for tag in tags} == {
        p["politics"].id
    }


def test_tag_recommendation_job_without_a_tagged_document_recommends_nothing(
    client: TestClient,
    held_jobs: HeldJobs,
    tag_recommendation_job_project: TagRecommendationJobProject,
):
    """No document carries the tag `unused`: the job finishes without
    recommendations."""
    p = tag_recommendation_job_project

    recommendations = _run_job(
        client,
        held_jobs,
        TagRecommendationJobInput(
            project_id=p["project"].id,
            method=TagRecommendationMethod.KNN,
            tag_ids=[p["unused"].id],
        ),
    )

    assert recommendations == {}


def test_knn_with_tag_ids_classifies_every_document_without_these_tags(
    client: TestClient,
    held_jobs: HeldJobs,
    tag_recommendation_job_project: TagRecommendationJobProject,
):
    """With the tag ids [sports], KNN classifies the documents that do not carry
    sports, untagged ones included: the documents with an embedding all get
    sports, the only tag."""
    p = tag_recommendation_job_project

    recommendations = _run_job(
        client,
        held_jobs,
        TagRecommendationJobInput(
            project_id=p["project"].id,
            method=TagRecommendationMethod.KNN,
            tag_ids=[p["sports"].id],
        ),
    )

    assert recommendations == {
        p["politics_tagged"].id: [p["sports"].id],
        p["sports_untagged"].id: [p["sports"].id],
        p["politics_untagged"].id: [p["sports"].id],
    }


def test_exclusive_keeps_a_tag_only_where_its_documents_are_nearest(
    client: TestClient,
    held_jobs: HeldJobs,
    tag_recommendation_job_project: TagRecommendationJobProject,
):
    """EXCLUSIVE with several tags per document: a tag is recommended only for
    documents whose nearest tagged document carries it, so each untagged
    document gets the one tag of its topic, not both."""
    p = tag_recommendation_job_project

    recommendations = _run_job(
        client,
        held_jobs,
        TagRecommendationJobInput(
            project_id=p["project"].id,
            method=TagRecommendationMethod.EXCLUSIVE,
            multi_class=True,
        ),
    )

    assert recommendations == {
        p["sports_untagged"].id: [p["sports"].id],
        p["politics_untagged"].id: [p["politics"].id],
    }
