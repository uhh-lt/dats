from typing import Callable

import pytest
from sqlalchemy.orm import Session

from core.auth.authz_user import AuthzUser, ForbiddenError
from core.project.project_crud import crud_project
from core.project.project_orm import ProjectORM
from core.user.user_dto import UserRead
from core.user.user_orm import UserORM


def test_assert_true(authz_user: AuthzUser):
    authz_user.assert_true(True, "")

    with pytest.raises(ForbiddenError):
        authz_user.assert_true(False, "")


def test_assert_in_project(
    user: UserORM, project: ProjectORM, db: Session, authz_user: AuthzUser
):
    authz_user.assert_in_project(project.id)

    crud_project.dissociate_user(db, proj_id=project.id, user_id=user.id)

    with pytest.raises(ForbiddenError):
        authz_user.assert_in_project(project.id)


def test_assert_is_same_user(
    authz_user: AuthzUser, user: UserORM, make_user: Callable[[], UserRead]
):
    authz_user.assert_is_same_user(user.id)

    with pytest.raises(ForbiddenError):
        new_user = make_user()
        authz_user.assert_is_same_user(new_user.id)
