from typing import TypedDict

import pytest

from core.project.project_orm import ProjectORM
from modules.concept_over_time_analysis.cota_dto import COTACreateIntern, COTARead
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
        cota_create=COTACreateIntern(name="Test COTA", project_id=test_project.id),
    )
    db_session.commit()
    db_session.refresh(test_project)

    return {"project": test_project, "cota": cota}
