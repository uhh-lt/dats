from typing import Generic, NamedTuple, Optional

from loguru import logger
from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import (
    CreateDTOType,
    CRUDBase,
    ORMModelType,
    UpdateDTOType,
)
from app.core.data.dto.action import ActionType
from app.core.data.dto.user import UserRead
from app.core.data.orm.orm_base import ORMBase
from app.core.data.orm.project import ProjectORM
from app.core.data.orm.user import UserORM
from app.core.data.orm.util import get_parent_project_id
from app.core.db.sql_service import SQLService
from app.util.singleton_meta import SingletonMeta


class ForbiddenError(Exception):
    def __init__(self, action: str, model: str):
        self.model = model
        super().__init__(f"User is not authorized to {action} {self.model}")


class AuthorizationCheck(
    NamedTuple, Generic[ORMModelType, CreateDTOType, UpdateDTOType]
):
    action: ActionType
    crud_object: CRUDBase[ORMModelType, CreateDTOType, UpdateDTOType]
    object_id: Optional[int]


class AuthorizationService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.sql_service = SQLService()
        return super(AuthorizationService, cls).__new__(cls)

    def check_authorization(self, subject: UserRead, check: AuthorizationCheck) -> None:
        is_authorized = False
        with self.sql_service.db_session() as db:
            orm_object = None
            if check.object_id is not None:
                orm_object = check.crud_object.read(db, check.object_id)
            is_authorized = self.is_authorized(db, subject, check.action, orm_object)

        if is_authorized:
            logger.debug(
                f"allowing user #{subject.id} to {check.action} ({type(check.crud_object).__name__}, id {check.object_id})"
            )
        else:
            logger.warning(
                f"denying user #{subject.id} to {check.action} ({type(check.crud_object).__name__}, id {check.object_id})"
            )

        if not is_authorized:
            model_name = type(orm_object).__name__.replace("ORM", "")
            raise ForbiddenError(check.action, model_name)

    def is_authorized(
        self,
        db: Session,
        subject: UserRead,
        action: ActionType,
        orm_object: Optional[ORMBase],
    ) -> bool:
        if orm_object is None:
            match action:
                case ActionType.CREATE:
                    # At the moment, every user can create anything
                    return True
                case _:
                    # reading, updating or deleting need a specific object
                    return False

        if isinstance(orm_object, UserORM):
            # Users can only access themselves
            return orm_object.id == subject.id

        project_id = get_parent_project_id(orm_object)
        if isinstance(project_id, int):
            authorized_project = (
                db.query(ProjectORM.id)
                .join(ProjectORM.users)
                .filter(UserORM.id == subject.id, ProjectORM.id == project_id)
                .first()
            )
            # TODO logging
            return authorized_project is not None

        return False
