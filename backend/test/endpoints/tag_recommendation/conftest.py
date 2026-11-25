from collections.abc import Generator
from typing import TypedDict

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

import dats_test_utils
from core.doc.source_document_orm import SourceDocumentORM
from core.project.project_crud import crud_project
from core.project.project_dto import ProjectCreate
from core.project.project_orm import ProjectORM
from core.project.project_service import ProjectService
from core.tag.tag_crud import crud_tag
from core.tag.tag_dto import TagCreate
from core.tag.tag_orm import TagORM
from core.user.user_crud import crud_user
from core.user.user_dto import UserCreate
from core.user.user_orm import UserORM
from feature_test_utils import FeaturelessProject, create_featureless_project
from job_test_utils import store_job
from modules.tag_recommendation.document_embedding_crud import crud_document_embedding
from modules.tag_recommendation.document_embedding_dto import DocumentObjectIdentifier
from modules.tag_recommendation.tag_recommendation_crud import (
    crud_tag_recommendation_link,
)
from modules.tag_recommendation.tag_recommendation_dto import (
    TagRecommendationJobInput,
    TagRecommendationLinkCreate,
)
from modules.tag_recommendation.tag_recommendation_orm import (
    TagRecommendationLinkORM,
)
from repos.vector.weaviate_repo import WeaviateRepo

OWN_ML_JOB_ID = "own-tag-recommendation-job"
FOREIGN_ML_JOB_ID = "foreign-tag-recommendation-job"
FEATURELESS_ML_JOB_ID = "featureless-tag-recommendation-job"


class TagRecommendationProject(TypedDict):
    """This fixture sets up the following projects:

    - `project` "Simple Test Project" of the test user (testuser@dats.org), the
      only member. It has the text document `sdoc` "Test Document" and the tags
      `tag_a` "Tag A" and `tag_b` "Tag B" (neither linked to the document).
    - The tag recommendation job `OWN_ML_JOB_ID` of `project` (stored, not
      run) and two unreviewed recommendations of it for `sdoc`:
      `recommendation_a` predicts `tag_a` with score 0.9, `recommendation_b`
      predicts `tag_b` with score 0.4.
    - `outsider` "Outside User" (outsider@dats.org) is not a member of `project`.
      `foreign_project` "Foreign Project" belongs to the outsider only; it has
      its own document "Test Document", the tag `foreign_tag` "Foreign Tag", the
      tag recommendation job `FOREIGN_ML_JOB_ID` (stored, not run) and its
      unreviewed recommendation `foreign_recommendation` (predicts `foreign_tag`
      with score 0.7).

    Derived behavior:

    - `GET /projects/{project_id}/jobs/tag-recommendation/{job_id}/recommendations`
      lists only unreviewed
      recommendations, so a reviewed recommendation disappears from it.
    """

    project: ProjectORM
    tag_a: TagORM
    tag_b: TagORM
    recommendation_a: TagRecommendationLinkORM
    recommendation_b: TagRecommendationLinkORM
    outsider: UserORM
    foreign_project: ProjectORM
    foreign_tag: TagORM
    foreign_recommendation: TagRecommendationLinkORM


def _create_tag(db: Session, project_id: int, name: str) -> TagORM:
    return crud_tag.create(
        db=db, project_id=project_id, create_dto=TagCreate(name=name)
    )


def _create_recommendation(
    db: Session, *, ml_job_id: str, sdoc_id: int, tag: TagORM, score: float
) -> TagRecommendationLinkORM:
    return crud_tag_recommendation_link.create(
        db=db,
        create_dto=TagRecommendationLinkCreate(
            project_id=tag.project_id,
            ml_job_id=ml_job_id,
            source_document_id=sdoc_id,
            predicted_tag_id=tag.id,
            prediction_score=score,
        ),
    )


@pytest.fixture(scope="function")
def tag_recommendation_project(
    db_session: Session, project_with_sdoc: dats_test_utils.ProjectWithSdoc
) -> TagRecommendationProject:
    """See `TagRecommendationProject`."""
    project = project_with_sdoc["project"]
    sdoc = project_with_sdoc["source_document"]
    tag_a = _create_tag(db_session, project.id, "Tag A")
    tag_b = _create_tag(db_session, project.id, "Tag B")
    store_job(
        "tag_recommendation",
        TagRecommendationJobInput(project_id=project.id),
        job_id=OWN_ML_JOB_ID,
    )
    recommendation_a = _create_recommendation(
        db_session, ml_job_id=OWN_ML_JOB_ID, sdoc_id=sdoc.id, tag=tag_a, score=0.9
    )
    recommendation_b = _create_recommendation(
        db_session, ml_job_id=OWN_ML_JOB_ID, sdoc_id=sdoc.id, tag=tag_b, score=0.4
    )

    outsider = crud_user.create(
        db=db_session,
        create_dto=UserCreate(
            first_name="Outside",
            last_name="User",
            email="outsider@dats.org",
            password="MyTestPassword123",
        ),
    )
    db_session.commit()
    foreign_project = crud_project.read(
        db=db_session,
        id=ProjectService()
        .create_project(
            db=db_session,
            create_dto=ProjectCreate(
                title="Foreign Project", description="Project of the outsider"
            ),
            creating_user_id=outsider.id,
        )
        .id,
    )
    foreign_sdoc = dats_test_utils.create_project_with_sdoc(
        db_session, foreign_project
    )["source_document"]
    foreign_tag = _create_tag(db_session, foreign_project.id, "Foreign Tag")
    store_job(
        "tag_recommendation",
        TagRecommendationJobInput(project_id=foreign_project.id),
        job_id=FOREIGN_ML_JOB_ID,
    )
    foreign_recommendation = _create_recommendation(
        db_session,
        ml_job_id=FOREIGN_ML_JOB_ID,
        sdoc_id=foreign_sdoc.id,
        tag=foreign_tag,
        score=0.7,
    )
    db_session.commit()

    return {
        "project": project,
        "tag_a": tag_a,
        "tag_b": tag_b,
        "recommendation_a": recommendation_a,
        "recommendation_b": recommendation_b,
        "outsider": outsider,
        "foreign_project": foreign_project,
        "foreign_tag": foreign_tag,
        "foreign_recommendation": foreign_recommendation,
    }


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


@pytest.fixture(scope="function")
def featureless_project(db_session, test_user: UserORM) -> FeaturelessProject:
    """
    This fixture sets up the following project, in addition to `test_project`
    (which enables the features that are on by default):

    - project: "Featureless Project" of `test_user`, without any enabled feature
    - sdoc: text document "text_done.txt" in it, with the steps of a project
      without features finished
    """
    return create_featureless_project(db_session, test_user)


@pytest.fixture(scope="function")
def featureless_recommendation(
    db_session: Session, featureless_project: FeaturelessProject
) -> TagRecommendationLinkORM:
    """
    This fixture adds to `featureless_project` (whose tag recommendation is
    disabled) the tag "Featureless Tag", the tag recommendation job
    `FEATURELESS_ML_JOB_ID` (stored, not run) and one unreviewed recommendation
    of it, which predicts that tag for its document "text_done.txt" with score
    0.8.
    """
    project = featureless_project["project"]
    store_job(
        "tag_recommendation",
        TagRecommendationJobInput(project_id=project.id),
        job_id=FEATURELESS_ML_JOB_ID,
    )
    tag = _create_tag(db_session, project.id, "Featureless Tag")
    recommendation = _create_recommendation(
        db_session,
        ml_job_id=FEATURELESS_ML_JOB_ID,
        sdoc_id=featureless_project["sdoc"].id,
        tag=tag,
        score=0.8,
    )
    db_session.commit()
    return recommendation


class TagRecommendationJobProject(TypedDict):
    """
    This fixture sets up the following documents and tags in `test_project`
    (which enables tag recommendation):

    - tags `sports` "Sports", `politics` "Politics" and `unused` "Unused" (no
      document carries it)
    - text document `sports_tagged` "sports_tagged.txt", tagged `sports`, with
      the document embedding [1, 0, 0]
    - text document `politics_tagged` "politics_tagged.txt", tagged `politics`,
      with the document embedding [0, 1, 0]
    - text document `sports_untagged` "sports_untagged.txt", untagged, with the
      document embedding [0.9, 0.1, 0]
    - text document `politics_untagged` "politics_untagged.txt", untagged, with
      the document embedding [0.1, 0.9, 0]
    - text document `no_embedding` "no_embedding.txt", untagged, without a
      document embedding

    Non-obvious derived behavior:

    - Each untagged document lies next to the tagged document of its topic, so
      KNN and SIMPLE recommend that document's tag for it.
    - `no_embedding` gets no recommendation and does not fail the job.
    """

    project: ProjectORM
    sports: TagORM
    politics: TagORM
    unused: TagORM
    sports_tagged: SourceDocumentORM
    politics_tagged: SourceDocumentORM
    sports_untagged: SourceDocumentORM
    politics_untagged: SourceDocumentORM
    no_embedding: SourceDocumentORM


@pytest.fixture(scope="function")
def tag_recommendation_job_project(
    db_session: Session, test_project: ProjectORM
) -> TagRecommendationJobProject:
    """See `TagRecommendationJobProject`."""
    tags = {
        key: _create_tag(db_session, test_project.id, name)
        for key, name in (
            ("sports", "Sports"),
            ("politics", "Politics"),
            ("unused", "Unused"),
        )
    }
    embeddings: dict[str, list[float] | None] = {
        "sports_tagged": [1.0, 0.0, 0.0],
        "politics_tagged": [0.0, 1.0, 0.0],
        "sports_untagged": [0.9, 0.1, 0.0],
        "politics_untagged": [0.1, 0.9, 0.0],
        "no_embedding": None,
    }
    sdocs = {
        key: dats_test_utils.create_text_document(
            db_session,
            project=test_project,
            filename=f"{key}.txt",
            name=f"{key}.txt",
            sentences=[f"A text about {key}."],
        )
        for key in embeddings
    }
    crud_tag.link_multiple_tags(
        db=db_session,
        project_id=test_project.id,
        sdoc_ids=[sdocs["sports_tagged"].id],
        tag_ids=[tags["sports"].id],
    )
    crud_tag.link_multiple_tags(
        db=db_session,
        project_id=test_project.id,
        sdoc_ids=[sdocs["politics_tagged"].id],
        tag_ids=[tags["politics"].id],
    )
    client = WeaviateRepo().get_client()
    for key, embedding in embeddings.items():
        if embedding is not None:
            crud_document_embedding.create(
                client=client,
                project_id=test_project.id,
                id=DocumentObjectIdentifier(sdoc_id=sdocs[key].id),
                embedding=embedding,
            )
    db_session.commit()
    return {
        "project": test_project,
        "sports": tags["sports"],
        "politics": tags["politics"],
        "unused": tags["unused"],
        "sports_tagged": sdocs["sports_tagged"],
        "politics_tagged": sdocs["politics_tagged"],
        "sports_untagged": sdocs["sports_untagged"],
        "politics_untagged": sdocs["politics_untagged"],
        "no_embedding": sdocs["no_embedding"],
    }
