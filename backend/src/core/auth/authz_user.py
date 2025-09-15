from typing import NoReturn

from fastapi import Depends, Request, status
from loguru import logger
from sqlalchemy.orm import Session

from common.crud_enum import Crud
from common.dependencies import get_current_user, get_db_session
from common.exception_handler import exception_handler
from core.user.user_orm import UserORM
from repos.db.crud_base import NoSuchElementError
from repos.db.orm_base import ORMBase


@exception_handler(status.HTTP_403_FORBIDDEN)
class ForbiddenError(Exception):
    def __init__(self):
        super().__init__("User is not authorized")


class AuthzUser:
    """The AuthzUser, short for "Authorization User", is the entrypoint
    for authorization logic in our fastapi endpoint functions.
    """

    user: UserORM
    db: Session
    request: Request

    def __init__(
        self,
        request: Request,
        user: UserORM = Depends(get_current_user),
        db: Session = Depends(get_db_session),
    ):
        self.request = request
        self.user = user
        self.db = db

    def assert_in_same_project_as(self, crud: Crud, object_id: int | str):
        orm_object = self.read_crud(crud, object_id)

        project_id = orm_object.get_project_id()
        if project_id is None:
            self.deny_access("Object has no parent project")

        self.assert_in_project(project_id)

    def assert_in_same_project_as_many(
        self, crud: Crud, object_ids: list[int] | list[str]
    ):
        if len(object_ids) == 0:
            return

        # Some read functions take an int, others take a str
        # (e.g. PreprocessingJobs).
        # There's no good way to bind the value of `Crud` to the
        # type of `object_id`, so we switch off the type checker
        # for this line :(
        objs = crud.value.read_by_ids(self.db, object_ids)  # type: ignore
        loaded_object_ids = {obj.id for obj in objs}
        if loaded_object_ids != set(object_ids):
            self.deny_access(
                f"One or several objects were not found: {set(object_ids) - loaded_object_ids}"
            )

        required_project_ids = {obj.get_project_id() for obj in objs}
        if None in required_project_ids:
            self.deny_access("One or several objects have no parent project")

        # Since we pre-load user projects, this should require no db query
        user_project_ids = {proj.id for proj in self.user.projects}

        self.assert_true(required_project_ids.issubset(user_project_ids))

    def assert_object_has_same_user_id(self, crud: Crud, object_id: int | str):
        orm_object = self.read_crud(crud, object_id)

        user_id = orm_object.get_user_id()
        if user_id is None:
            self.deny_access("Object has no user id set")

        self.assert_is_same_user(user_id)

    def assert_is_same_user(self, other_user_id: int):
        self.assert_true(self.user.id == other_user_id)

    def assert_in_project(self, project_id: int):
        # Since we're eager-loading user projects in crud_user.read_by_email,
        # this statement is faster than sending a custom query
        authorized_project = next(
            (proj for proj in self.user.projects if proj.id == project_id), None
        )

        self.assert_true(
            authorized_project is not None, f"User needs to be in project {project_id}"
        )

    def assert_true(self, is_authorized: bool, note: str = ""):
        self.log_check(is_authorized, note)

        if not is_authorized:
            raise ForbiddenError()

    def deny_access(self, note: str = "") -> NoReturn:
        self.log_check(False, note)

        raise ForbiddenError()

    def log_check(self, is_authorized: bool, note: str = ""):
        result_description = "passed" if is_authorized else "failed"

        note = f", note: {note}" if note != "" else ""

        logger.opt(depth=1).debug(
            f"check {result_description}: user {self.user.id}, {self.request.method} {self.request.url.path}{note}"
        )

    def read_crud(self, crud: Crud, id: int | str) -> ORMBase:
        try:
            # Some read functions take an int, others take a str
            # (e.g. PreprocessingJobs).
            # There's no good way to bind the value of `Crud` to the
            # type of `object_id`, so we switch off the type checker
            # for this line :(
            return crud.value.read(self.db, id)  # type: ignore
        except NoSuchElementError:
            self.deny_access("Object does not exist")
