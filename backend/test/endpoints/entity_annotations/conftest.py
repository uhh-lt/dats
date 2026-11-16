import pytest
from sqlalchemy.orm import Session

from core.user.user_orm import UserORM
from text_steps_test_utils import TextStepsProject, create_text_steps_project


@pytest.fixture(scope="function")
def text_steps_project(db_session: Session, test_user: UserORM) -> TextStepsProject:
    """The project described in `TextStepsProject` (`text_steps_test_utils.py`)."""
    return create_text_steps_project(db_session, test_user)
