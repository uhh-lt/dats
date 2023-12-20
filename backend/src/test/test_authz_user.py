from typing import Callable

import pytest
from sqlalchemy.orm import Session

from app.core.authorization.authz_user import AuthzUser, ForbiddenError
from app.core.data.crud import Crud
from app.core.data.crud.code import crud_code
from app.core.data.crud.project import crud_project
from app.core.data.dto.user import UserRead
from app.core.data.orm.code import CodeORM
from app.core.data.orm.project import ProjectORM
from app.core.db.sql_service import SQLService


def test_assert_true(authz_user: AuthzUser):
    authz_user.assert_condition(True, "")

    with pytest.raises(ForbiddenError):
        authz_user.assert_condition(False, "")


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
    make_project: Callable[[], ProjectORM],
    rollbacked_session: Session,
):
    authz_user.assert_in_same_project_as(Crud.CODE, code)

    project = make_project()
    crud_project.dissociate_user(
        rollbacked_session, user_id=authz_user.user.id, proj_id=project.id
    )
    code_orm = crud_code.read(rollbacked_session, code)
    previous_project = code_orm.project
    code_orm.project_id = project.id

    with pytest.raises(ForbiddenError):
        # Check code that exists but is not in project
        authz_user.assert_in_same_project_as(Crud.CODE, code)

    with pytest.raises(ForbiddenError):
        # Check code that does not exist
        authz_user.assert_in_same_project_as(Crud.CODE, code + 1)

    with pytest.raises(ForbiddenError):
        # Check entity that has no parent project
        authz_user.assert_in_same_project_as(Crud.USER, authz_user.user.id)

    code_orm.project_id = previous_project.id


def test_assert_in_same_project_as_many(
    authz_user: AuthzUser,
    code: int,
    rollbacked_session: Session,
    make_project: Callable[[], ProjectORM],
    make_code: Callable[[], CodeORM],
):
    authz_user.assert_in_same_project_as_many(Crud.CODE, [code])
    # This should always pass
    authz_user.assert_in_same_project_as_many(Crud.CODE, [])

    project = make_project()
    crud_project.dissociate_user(
        rollbacked_session, user_id=authz_user.user.id, proj_id=project.id
    )
    code_orm = crud_code.read(rollbacked_session, code)
    previous_project = code_orm.project
    code_orm.project_id = project.id

    with pytest.raises(ForbiddenError):
        # Check code that exists but is not in project
        authz_user.assert_in_same_project_as_many(Crud.CODE, [code])

    with pytest.raises(ForbiddenError):
        # Check with a second code that is in the project
        second_code = make_code()
        authz_user.assert_in_same_project_as_many(Crud.CODE, [code, second_code.id])

    with pytest.raises(ForbiddenError):
        # Check code that does not exist
        authz_user.assert_in_same_project_as_many(Crud.CODE, [code + 1])

    with pytest.raises(ForbiddenError):
        # Check entity that has no parent project
        authz_user.assert_in_same_project_as_many(Crud.USER, [authz_user.user.id])

    code_orm.project_id = previous_project.id
