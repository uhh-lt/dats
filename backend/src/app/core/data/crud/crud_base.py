from typing import Generic, List, Optional, Type, TypeVar

import srsly
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.data.dto.action import ActionCreate, ActionType
from app.core.data.orm.orm_base import ORMBase

ORMModelType = TypeVar("ORMModelType", bound=ORMBase)
CreateDTOType = TypeVar("CreateDTOType", bound=BaseModel)
UpdateDTOType = TypeVar("UpdateDTOType", bound=BaseModel)


class UpdateNotAllowed(BaseModel):
    pass


class NoSuchElementError(Exception):
    def __init__(self, model: Type[ORMModelType], **kwargs):
        self.model = model
        self.model_name = model.__name__.replace("ORM", "")
        super().__init__(f"There exists no {self.model_name} with: {kwargs} !")


class CRUDBase(Generic[ORMModelType, CreateDTOType, UpdateDTOType]):
    def __init__(self, model: Type[ORMModelType]):
        """
        Generic CRUD access with default methods to Create, Read, Update, Delete ORM models.

        **Parameters**

        * `model`: A SQLAlchemy model class
        """
        self.model = model

    def read(self, db: Session, id: int) -> ORMModelType:
        db_obj = db.query(self.model).filter(self.model.id == id).first()
        if db_obj is None:
            raise NoSuchElementError(self.model, id=id)
        return db_obj

    def read_by_ids(self, db: Session, ids: List[int]) -> List[ORMModelType]:
        return db.query(self.model).filter(self.model.id.in_(ids)).all()

    def read_multi(
        self, db: Session, *, skip: int = 0, limit: int = 100
    ) -> List[ORMModelType]:
        return db.query(self.model).offset(skip).limit(limit).all()

    def exists(self, db: Session, *, id: int, raise_error: bool = False) -> bool:
        exists = db.query(self.model.id).filter(self.model.id == id).first() is not None
        if not exists and raise_error:
            raise NoSuchElementError(self.model, id=id)
        return exists

    def create(self, db: Session, *, create_dto: CreateDTOType) -> ORMModelType:
        dto_obj_data = jsonable_encoder(create_dto)
        db_obj = self.model(**dto_obj_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)

        after_state = self._get_action_state_from_orm(db_obj=db_obj)

        self._create_action(
            db_obj=db_obj, action_type=ActionType.CREATE, after_state=after_state
        )

        return db_obj

    def create_multi(
        self, db: Session, *, create_dtos: List[CreateDTOType]
    ) -> List[ORMModelType]:
        db_objs = [self.model(**jsonable_encoder(x)) for x in create_dtos]
        db.add_all(db_objs)
        db.commit()

        for db_obj in db_objs:
            db.refresh(db_obj)
            after_state = self._get_action_state_from_orm(db_obj=db_obj)
            self._create_action(
                db_obj=db_obj, action_type=ActionType.CREATE, after_state=after_state
            )

        return db_objs

    def update(
        self, db: Session, *, id: int, update_dto: UpdateDTOType
    ) -> ORMModelType:
        db_obj = self.read(db=db, id=id)
        before_state = self._get_action_state_from_orm(db_obj=db_obj)

        obj_data = jsonable_encoder(db_obj.as_dict())
        update_data = update_dto.model_dump(exclude_unset=True)
        for field in obj_data:
            if field in update_data:
                setattr(db_obj, field, update_data[field])
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)

        after_state = self._get_action_state_from_orm(db_obj=db_obj)

        self._create_action(
            db_obj=db_obj,
            action_type=ActionType.UPDATE,
            before_state=before_state,
            after_state=after_state,
        )

        return db_obj

    def remove(self, db: Session, *, id: int) -> ORMModelType:
        db_obj = self.read(db=db, id=id)
        before_state = self._get_action_state_from_orm(db_obj=db_obj)

        self._create_action(
            db_obj=db_obj, action_type=ActionType.DELETE, before_state=before_state
        )

        # delete the ORM after the action created so that we can read its ID
        db.delete(db_obj)
        db.commit()
        return db_obj

    # TODO: remove_multi ?

    def _get_action_user_id_from_orm(self, db_obj: ORMModelType) -> Optional[int]:
        from app.core.data.crud.user import SYSTEM_USER_ID

        return SYSTEM_USER_ID

    def _get_action_state_from_orm(self, db_obj: ORMModelType) -> Optional[str]:
        return srsly.json_dumps(db_obj.as_dict())

    def _create_action(
        self,
        db_obj: ORMModelType,
        action_type: ActionType,
        before_state: Optional[str] = None,
        after_state: Optional[str] = None,
    ) -> None:
        # local import to avoid circular dependency
        from app.core.data.orm.util import get_action_target_type, get_parent_project_id

        action_target_type = get_action_target_type(db_obj)
        if action_target_type is None:
            return

        proj_id = get_parent_project_id(db_obj)
        if proj_id is None:
            return

        from app.core.data.crud.action import crud_action
        from app.core.db.sql_service import SQLService

        if action_type == ActionType.CREATE and after_state is None:
            raise ValueError("after_state must be provided for CREATE action")
        elif action_type == ActionType.UPDATE and (
            after_state is None or before_state is None
        ):
            raise ValueError("before_state and after_state must be provided for UPDATE")
        elif action_type == ActionType.DELETE and before_state is None:
            raise ValueError("before_state must be provided for DELETE action")

        create_dto = ActionCreate(
            project_id=proj_id,
            user_id=self._get_action_user_id_from_orm(db_obj=db_obj),
            action_type=action_type,
            target_type=action_target_type,
            target_id=db_obj.id,
            before_state=before_state,
            after_state=after_state,
        )
        with SQLService().db_session() as db:
            crud_action.create(db=db, create_dto=create_dto)
