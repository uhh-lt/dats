from typing import List, NoReturn

from fastapi import Depends, Request
from loguru import logger
from sqlalchemy.orm import Session

from api.dependencies import get_current_user, get_db_session
from app.core.data.crud import Crud
from app.core.data.crud.crud_base import NoSuchElementError
from app.core.data.orm.project import ProjectORM
from app.core.data.orm.user import UserORM
from app.core.data.orm.util import get_orm_user_id, get_parent_project_id


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
        try:
            # Some read functions take an int, others take a str
            # (e.g. PreprocessingJobs).
            # There's no good way to bind the value of `Crud` to the
            # type of `object_id`, so we switch off the type checker
            # for this line :(
            orm_object = crud.value.read(self.db, object_id)  # type: ignore
        except NoSuchElementError:
            self.deny_access(f"{crud.name} {object_id} does not exist")

        project_id = get_parent_project_id(orm_object)
        if project_id is None:
            self.deny_access("Object has no parent project")

        self.assert_in_project(project_id)

    def assert_in_same_project_as_many(
        self, crud: Crud, object_ids: List[int] | List[str]
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

        required_project_ids = {get_parent_project_id(obj) for obj in objs}
        if None in required_project_ids:
            self.deny_access("One or several objects have no parent project")

        user_project_ids = {proj.id for proj in self.user.projects}

        for required_project_id in required_project_ids:
            self.assert_condition(required_project_id in user_project_ids)

    def assert_object_has_same_user_id(self, crud: Crud, object_id: int | str):
        try:
            # Some read functions take an int, others take a str
            # (e.g. PreprocessingJobs).
            # There's no good way to bind the value of `Crud` to the
            # type of `object_id`, so we switch off the type checker
            # for this line :(
            orm_object = crud.value.read(self.db, object_id)  # type: ignore
        except NoSuchElementError:
            self.deny_access("Object does not exist")

        user_id = get_orm_user_id(orm_object)
        if user_id is None:
            self.deny_access("Object has no user id set")

        self.assert_is_same_user(user_id)

    def assert_is_same_user(self, other_user_id: int):
        self.assert_condition(self.user.id == other_user_id)

    def assert_in_project(self, project_id: int):
        authorized_project_exists = self.db.query(
            self.db.query(ProjectORM)
            .join(ProjectORM.users)
            .filter(UserORM.id == self.user.id, ProjectORM.id == project_id)
            .exists()
        ).scalar()

        self.assert_condition(
            authorized_project_exists, f"User needs to be in project {project_id}"
        )

    def assert_condition(self, is_authorized: bool, note: str = ""):
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
