from typing import Generic, List, Optional, Type, TypeVar

from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.data.dto.action import ActionType, ActionCreate
from app.core.data.orm.orm_base import ORMBase

ORMModelType = TypeVar("ORMModelType", bound=ORMBase)
CreateDTOType = TypeVar("CreateDTOType", bound=BaseModel)
UpdateDTOType = TypeVar("UpdateDTOType", bound=BaseModel)


class NoSuchElementError(Exception):
    def __init__(self, model: Type[ORMModelType], **kwargs):
        self.model = model
        self.model_name = model.__name__.replace('ORM', '')
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
        if not db_obj:
            raise NoSuchElementError(self.model, id=id)
        return db_obj

    def read_by_ids(self, db: Session, ids: List[int]) -> List[ORMModelType]:
        return db.query(self.model).filter(self.model.id.in_(ids)).all()

    def read_multi(self, db: Session, *, skip: int = 0, limit: int = 100) -> List[ORMModelType]:
        return db.query(self.model).offset(skip).limit(limit).all()

    def exists(self, db: Session, *, id: int, raise_error: bool = False) -> Optional[bool]:
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

        self.__create_action(db_obj=db_obj, action_type=ActionType.CREATE)

        return db_obj
    
    def create_multi(self, db: Session, *, create_dtos: List[CreateDTOType]) -> List[ORMModelType]:
        db_obj = [self.model(**jsonable_encoder(x)) for x in create_dtos]
        db.add_all(db_obj)
        db.commit()
        return db_obj


    def update(self, db: Session, *, id: int, update_dto: UpdateDTOType) -> Optional[ORMModelType]:
        db_obj = self.read(db=db, id=id)
        obj_data = jsonable_encoder(db_obj)
        update_data = update_dto.dict(exclude_unset=True)
        for field in obj_data:
            if field in update_data:
                setattr(db_obj, field, update_data[field])
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)

        self.__create_action(db_obj=db_obj, action_type=ActionType.CREATE)
        return db_obj

    def remove(self, db: Session, *, id: int) -> Optional[ORMModelType]:
        db_obj = self.read(db=db, id=id)

        self.__create_action(db_obj=db_obj, action_type=ActionType.DELETE)

        # delete the ORM after the action created so that we can read its ID
        db.delete(db_obj)
        db.commit()
        return db_obj

    @staticmethod
    def __create_action(db_obj: ORMModelType, action_type: ActionType) -> None:
        # local import to avoid circular dependency
        from app.core.data.orm.util import get_parent_project_id, get_action_target_type

        action_target_type = get_action_target_type(db_obj)
        if action_target_type is not None:

            proj_id = get_parent_project_id(db_obj)
            if proj_id is not None:
                from app.core.data.crud.user import SYSTEM_USER_ID
                from app.core.db.sql_service import SQLService
                from app.core.data.crud.action import crud_action

                create_dto = ActionCreate(project_id=proj_id,
                                          user_id=SYSTEM_USER_ID,  # FIXME use correct user
                                          action_type=action_type,
                                          target_type=action_target_type,
                                          target_id=db_obj.id)
                with SQLService().db_session() as db:
                    crud_action.create(db=db, create_dto=create_dto)
