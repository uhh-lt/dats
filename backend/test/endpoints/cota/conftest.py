from datetime import date
from typing import TypedDict

import pytest
from fastapi.encoders import jsonable_encoder

from composite_keys_test_utils import TwoTenants, create_two_tenants
from core.project.project_orm import ProjectORM
from core.user.user_orm import UserORM
from feature_test_utils import (
    SentenceEmbeddingProject,
    create_featureless_project,
    create_sentence_embedding_project,
)
from modules.concept_over_time_analysis.cota_crud import crud_cota
from modules.concept_over_time_analysis.cota_dto import (
    COTAConcept,
    COTACreateIntern,
    COTARead,
    COTASentence,
    COTAUpdateIntern,
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


@pytest.fixture(scope="function")
def tenants(db_session, test_user, test_project) -> TwoTenants:
    """
    This fixture sets up two projects with one row of every project-owned table
    each (see `composite_keys_test_utils.TenantRows` for the full inventory):
    `own` in the test project, `foreign` in "Foreign Project". The search space
    of "COTA <p>" holds sentence 0 ("Alpha beta.", dated 2020-01-01, no concept
    annotation) of "doc_<p>.txt" of its project.

    Non-obvious derived behavior: the test user is a member of both projects, so
    an id of the other project is the only reason a request fails.
    """
    tenants = create_two_tenants(db_session, user=test_user, project=test_project)
    for rows in (tenants["own"], tenants["foreign"]):
        sentence = COTASentence(
            sdoc_id=rows["sdoc"].id,
            sentence_id=0,
            concept_similarities={},
            concept_probabilities={},
            concept_annotation=None,
            x=0.0,
            y=0.0,
            date=date(2020, 1, 1),
            text="Alpha beta.",
        )
        crud_cota.update(
            db=db_session,
            project_id=rows["project"].id,
            id=rows["cota"].id,
            update_dto=COTAUpdateIntern(search_space=[jsonable_encoder(sentence)]),
        )
    db_session.commit()
    return tenants
