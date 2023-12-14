from typing import Callable

import pytest

from app.core.authorization.authz_user import AuthzUser, ForbiddenError
from app.core.data.crud import Crud
from app.core.data.crud.code import crud_code
from app.core.data.crud.project import crud_project
from app.core.data.dto.user import UserRead
from app.core.data.orm.project import ProjectORM
from app.core.db.sql_service import SQLService


def test_assert_true(authz_user: AuthzUser):
    authz_user.assert_bool(True, "")

    with pytest.raises(ForbiddenError):
        authz_user.assert_bool(False, "")


def test_assert_in_project(
    user: int, project: int, session: SQLService, authz_user: AuthzUser
):
    with session.db_session() as db:
        authz_user.assert_in_project(project)

        crud_project.dissociate_user(db, proj_id=project, user_id=user)

        with pytest.raises(ForbiddenError):
            authz_user.assert_in_project(project)


def test_assert_is_same_user(
    authz_user: AuthzUser, user: int, make_user: Callable[[], UserRead]
):
    authz_user.assert_is_same_user(user)

    with pytest.raises(ForbiddenError):
        new_user = make_user()
        authz_user.assert_is_same_user(new_user.id)


def test_assert_object_has_same_user_id(
    authz_user: AuthzUser,
    code: int,
    session: SQLService,
    make_user: Callable[[], UserRead],
):
    # TODO test this function for other ORMs
    authz_user.assert_object_has_same_user_id(Crud.CODE, code)

    with session.db_session() as db:
        new_user = make_user()
        code_orm = crud_code.read(db, code)
        previous_user = code_orm.user
        code_orm.user_id = new_user.id
        db.commit()

        with pytest.raises(ForbiddenError):
            authz_user.assert_object_has_same_user_id(Crud.CODE, code)

        # Without this, the code cleanup will fail
        # due to the user cleanup removing the code through
        # a cascade
        code_orm.user_id = previous_user.id
        db.commit()


def test_assert_in_same_project_as(
    authz_user: AuthzUser,
    code: int,
    session: SQLService,
    make_project: Callable[[], ProjectORM],
):
    authz_user.assert_in_same_project_as(Crud.CODE, code)

    with session.db_session() as db:
        project = make_project()
        crud_project.dissociate_user(db, user_id=authz_user.user.id, proj_id=project.id)
        code_orm = crud_code.read(db, code)
        previous_project = code_orm.project
        code_orm.project_id = project.id
        db.commit()

        with pytest.raises(ForbiddenError):
            authz_user.assert_in_same_project_as(Crud.CODE, code)

        code_orm.project_id = previous_project.id
        db.commit()
