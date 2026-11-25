from typing import TypedDict

import pytest

from core.project.project_orm import ProjectORM
from core.user.user_orm import UserORM
from feature_test_utils import (
    SentenceEmbeddingProject,
    create_featureless_project,
    create_sentence_embedding_project,
)
from modules.concept_over_time_analysis.cota_dto import (
    COTAConcept,
    COTACreateIntern,
    COTARead,
)
from modules.concept_over_time_analysis.cota_service import COTAService


class ProjectWithCota(TypedDict):
    project: ProjectORM
    cota: COTARead


@pytest.fixture(scope="function")
def project_with_cota(db_session, test_project) -> ProjectWithCota:
    """This fixture sets up the following project:

    - project: the test project of the test user (without project metadata)
    - cota: the ConceptOverTimeAnalysis "Test COTA" in the project, with default
      settings and no concepts
    """
    cota = COTAService().create(
        db=db_session,
        project_id=test_project.id,
        cota_create=COTACreateIntern(name="Test COTA"),
    )
    db_session.commit()
    db_session.refresh(test_project)

    return {"project": test_project, "cota": cota}


@pytest.fixture(scope="function")
def featureless_project_with_cota(db_session, test_user: UserORM) -> ProjectWithCota:
    """This fixture sets up the following project, in addition to `test_project`:

    - project: "Featureless Project" of `test_user`, without any enabled feature
      (so concepts over time is disabled), with the text document
      "text_done.txt"
    - cota: the ConceptOverTimeAnalysis "Featureless COTA" in the project,
      created before the feature was disabled, with default settings and no
      concepts
    """
    project = create_featureless_project(db_session, test_user)["project"]
    cota = COTAService().create(
        db=db_session,
        project_id=project.id,
        cota_create=COTACreateIntern(name="Featureless COTA"),
    )
    db_session.commit()
    return {"project": project, "cota": cota}


@pytest.fixture(scope="function")
def embedded_cota(
    db_session, test_user: UserORM
) -> tuple[SentenceEmbeddingProject, COTARead]:
    """The project of `SentenceEmbeddingProject`, "COTA Only", which enables
    only concepts over time (not semantic search), and its
    ConceptOverTimeAnalysis "Embedded COTA" with default settings (search
    space top 1000, threshold 0.8, no date metadata), an empty search space and
    the two concepts "greeting" (id "c1") and "animal" (id "c2"), as the
    refinement job reads it."""
    project = create_sentence_embedding_project(
        db_session, test_user, title="COTA Only", features=["concepts_over_time"]
    )
    cota = COTAService().create(
        db=db_session,
        project_id=project["project"].id,
        cota_create=COTACreateIntern(name="Embedded COTA"),
    )
    db_session.commit()
    concepts = [
        COTAConcept(id=i, name=n, description=n, color="#000000", visible=True)
        for i, n in (("c1", "greeting"), ("c2", "animal"))
    ]
    return project, cota.model_copy(update={"concepts": concepts})
