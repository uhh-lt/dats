from typing import List

from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.action import ActionType, ActionCreate
from app.core.data.orm.action import ActionORM
from app.core.data.orm.object_handle import ObjectHandleORM


class CRUDAction(CRUDBase[ActionORM, ActionCreate, None]):

    def create(self, db: Session, *, create_dto: ActionCreate) -> ActionORM:
        raise NotImplementedError()

    def read_by_user_and_project(self,
                                 db: Session,
                                 user_id: int,
                                 proj_id: int) -> List[ActionORM]:
        return db.query(self.model).filter(self.model.user_id == user_id,
                                           self.model.project_id == proj_id).all()

    def read_by_user_and_project_and_action_type(self,
                                                 db: Session,
                                                 user_id: int,
                                                 proj_id: int,
                                                 action_type: ActionType) -> List[ActionORM]:
        return db.query(self.model).filter(self.model.user_id == user_id,
                                           self.model.project_id == proj_id,
                                           self.model.action_type == action_type).all()

    def exists_for_user_and_object_handle(self, db: Session, *, user_id: int, target_id: int) -> bool:
        return db.query(self.model.id).filter(self.model.user_id == user_id,
                                              self.model.target_id == target_id).first() is not None

    # Flo: this should not be called directly but only via ActionService
    def _create_action(self, create_dto: ActionCreate, db: Session, oh_db_obj: ObjectHandleORM):
        # create the Action
        dto_obj_data = jsonable_encoder(create_dto)
        dto_obj_data["target_id"] = oh_db_obj.id
        # noinspection PyArgumentList
        db_obj = self.model(**dto_obj_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj


crud_action = CRUDAction(ActionORM)
