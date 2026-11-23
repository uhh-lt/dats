import pytest

from core.user.user_orm import UserORM
from feature_test_utils import FeaturelessProject, create_featureless_project
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
