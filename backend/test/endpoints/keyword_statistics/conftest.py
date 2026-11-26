from typing import TypedDict

import pytest
from sqlalchemy.orm import Session

from core.doc.source_document_orm import SourceDocumentORM
from core.metadata.source_document_metadata_crud import crud_sdoc_meta
from core.project.project_orm import ProjectORM
from core.user.user_orm import UserORM
from dats_test_utils import create_text_document
from feature_test_utils import (
    FeaturelessProject,
    create_featureless_project,
    create_project_with_features,
)
from text_steps_test_utils import TextStepsProject, create_text_steps_project


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
def text_steps_project(db_session, test_user: UserORM) -> TextStepsProject:
    """The project described in `TextStepsProject` (`text_steps_test_utils.py`)."""
    return create_text_steps_project(db_session, test_user)


class KeywordProjects(TypedDict):
    own_project: ProjectORM
    own_sdoc: SourceDocumentORM
    foreign_sdoc: SourceDocumentORM


def _create_keyword_sdoc(
    db: Session, project: ProjectORM, name: str, keywords: list[str]
) -> SourceDocumentORM:
    sdoc = create_text_document(
        db, project=project, filename=name, name=name, sentences=["Some text."]
    )
    crud_sdoc_meta.read_by_sdoc_and_key(
        db=db, project_id=project.id, key="keywords", sdoc_id=sdoc.id
    ).list_value = keywords
    return sdoc


@pytest.fixture(scope="function")
def keyword_projects(
    db_session, test_user: UserORM, test_project: ProjectORM
) -> KeywordProjects:
    """
    This fixture sets up two projects of the test user with keyword statistics
    and one text document each:

    - own_project: the test project with `own_sdoc` "own.txt", keywords
      "alpha" and "beta"
    - "Foreign Project" with `foreign_sdoc` "foreign.txt", keywords "alpha" and
      "gamma"
    """
    foreign_project = create_project_with_features(
        db_session, test_user, title="Foreign Project", features=["keyword_statistics"]
    )
    own_sdoc = _create_keyword_sdoc(
        db_session, test_project, "own.txt", ["alpha", "beta"]
    )
    foreign_sdoc = _create_keyword_sdoc(
        db_session, foreign_project, "foreign.txt", ["alpha", "gamma"]
    )
    db_session.commit()
    return {
        "own_project": test_project,
        "own_sdoc": own_sdoc,
        "foreign_sdoc": foreign_sdoc,
    }
