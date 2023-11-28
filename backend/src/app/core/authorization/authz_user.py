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

    def assert_in_same_project_as(self, crud: Crud, object_id: int):
        try:
            orm_object = crud.value.read(self.db, object_id)
        except NoSuchElementError:
            self.assert_bool(False, "Object does not exist")
            return

        project_id = get_parent_project_id(orm_object)
        if project_id is None:
            self.assert_bool(False, "Object has no parent project")
            return

        self.assert_in_project(project_id)

    def assert_object_has_same_user_id(self, crud: Crud, object_id: int):
        try:
            orm_object = crud.value.read(self.db, object_id)
        except NoSuchElementError:
            self.assert_bool(False, "Object does not exist")
            return

        user_id = get_orm_user_id(orm_object)
        if user_id is None:
            self.assert_bool(False, "Object has no user id set")
            return

        self.assert_is_same_user(user_id)

    def assert_is_same_user(self, other_user_id: int):
        self.assert_bool(self.user.id == other_user_id)

    def assert_in_project(self, project_id: int):
        authorized_project_exists = self.db.query(
            self.db.query(ProjectORM)
            .join(ProjectORM.users)
            .filter(UserORM.id == self.user.id, ProjectORM.id == project_id)
            .exists()
        ).scalar()

        self.assert_bool(authorized_project_exists)

    def assert_bool(self, is_authorized: bool, note: str = ""):
        # log decision
        result_description = "passed" if is_authorized else "failed"

        note = f", note: {note}" if note != "" else ""

        logger.opt(depth=1).debug(
            f"check {result_description}: user {self.user.id}, {self.request.method} {self.request.url.path}{note}"
        )

        if not is_authorized:
            raise ForbiddenError()
