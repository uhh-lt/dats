from typing import TypedDict

import pytest
from sqlalchemy.orm import Session

import dats_test_utils
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
from modules.ml.tag_recommendation.tag_recommendation_crud import (
    crud_tag_recommendation_link,
)
from modules.ml.tag_recommendation.tag_recommendation_dto import (
    TagRecommendationLinkCreate,
)
from modules.ml.tag_recommendation.tag_recommendation_orm import (
    TagRecommendationLinkORM,
)

OWN_ML_JOB_ID = "own-tag-recommendation-job"
FOREIGN_ML_JOB_ID = "foreign-tag-recommendation-job"


class TagRecommendationProject(TypedDict):
    """This fixture sets up the following projects:

    - `project` "Simple Test Project" of the test user (testuser@dats.org), the
      only member. It has the text document `sdoc` "Test Document" and the tags
      `tag_a` "Tag A" and `tag_b` "Tag B" (neither linked to the document).
    - Two unreviewed recommendations of the ML job `OWN_ML_JOB_ID` for `sdoc`:
      `recommendation_a` predicts `tag_a` with score 0.9, `recommendation_b`
      predicts `tag_b` with score 0.4.
    - `outsider` "Outside User" (outsider@dats.org) is not a member of `project`.
      `foreign_project` "Foreign Project" belongs to the outsider only; it has
      its own document "Test Document", the tag `foreign_tag` "Foreign Tag" and the
      unreviewed recommendation `foreign_recommendation` of the ML job
      `FOREIGN_ML_JOB_ID` (predicts `foreign_tag` with score 0.7).

    Derived behavior:

    - `GET /tagrecommendation/job/{ml_job_id}` lists only unreviewed
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
        db=db, create_dto=TagCreate(name=name, project_id=project_id)
    )


def _create_recommendation(
    db: Session, *, ml_job_id: str, sdoc_id: int, tag_id: int, score: float
) -> TagRecommendationLinkORM:
    return crud_tag_recommendation_link.create(
        db=db,
        create_dto=TagRecommendationLinkCreate(
            ml_job_id=ml_job_id,
            source_document_id=sdoc_id,
            predicted_tag_id=tag_id,
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
    recommendation_a = _create_recommendation(
        db_session, ml_job_id=OWN_ML_JOB_ID, sdoc_id=sdoc.id, tag_id=tag_a.id, score=0.9
    )
    recommendation_b = _create_recommendation(
        db_session, ml_job_id=OWN_ML_JOB_ID, sdoc_id=sdoc.id, tag_id=tag_b.id, score=0.4
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
    foreign_recommendation = _create_recommendation(
        db_session,
        ml_job_id=FOREIGN_ML_JOB_ID,
        sdoc_id=foreign_sdoc.id,
        tag_id=foreign_tag.id,
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
def featureless_project(db_session, test_user: UserORM) -> FeaturelessProject:
    """
    This fixture sets up the following project, in addition to `test_project`
    (which enables all features):

    - project: "Featureless Project" of `test_user`, without any enabled feature
    - sdoc: text document "text_done.txt" in it, with the steps of a project
      without features finished
    """
    return create_featureless_project(db_session, test_user)
