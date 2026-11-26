from typing import NoReturn

from fastapi import Depends, Request
from loguru import logger
from sqlalchemy.orm import Session

from common.dependencies import DBSession, get_current_user
from core.auth.auth_exceptions import ForbiddenError
from core.user.user_crud import crud_user
from core.user.user_orm import UserORM
from repos.db.sql_exceptions import NoSuchElementError


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
        db: DBSession,
        user: UserORM = Depends(get_current_user),
    ):
        self.request = request
        self.user = user
        self.db = db

    @property
    def is_api_key(self) -> bool:
        """Whether the current request was authenticated with an API key
        (vs. a JWT from a human user). Recorded by `get_current_user`."""
        return getattr(self.request.state, "auth_method", "jwt") == "api_key"

    def assert_is_same_user(self, other_user_id: int):
        self.assert_true(self.user.id == other_user_id)

    def assert_can_annotate_as(self, user_id: int | None, project_id: int) -> int:
        """
        The user that new annotations in the project belong to: the current user
        (`user_id` None or the own id) or a virtual user of the project. Other users'
        annotations are read-only.
        """
        if user_id is None or user_id == self.user.id:
            return self.user.id

        try:
            user = crud_user.read(db=self.db, id=user_id)
        except NoSuchElementError:
            self.deny_access(f"User {user_id} does not exist")
        # only virtual users have a project
        self.assert_true(
            user.project_id == project_id,
            f"User {user_id} must be a virtual user of project {project_id}",
        )
        return user_id

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
