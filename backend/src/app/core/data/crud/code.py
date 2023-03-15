from typing import List, Dict, Any, Optional

from fastapi.encoders import jsonable_encoder
from sqlalchemy import delete
from sqlalchemy.orm import Session
import srsly

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.crud.current_code import crud_current_code
from app.core.data.crud.user import SYSTEM_USER_ID
from app.core.data.dto.action import ActionType, ActionTargetObjectType, ActionCreate
from app.core.data.dto.code import CodeCreate, CodeUpdate
from app.core.data.dto.current_code import CurrentCodeCreate
from app.core.data.orm.code import CodeORM
from app.util.color import get_next_color
from config import conf


class CRUDCode(CRUDBase[CodeORM, CodeCreate, CodeUpdate]):
    def create(self, db: Session, *, create_dto: CodeCreate) -> CodeORM:
        dto_obj_data = jsonable_encoder(create_dto)
        # first create the code
        # noinspection PyArgumentList
        db_obj = self.model(**dto_obj_data)
        db.add(db_obj)
        db.commit()

        # second create a CurrentCode that links to the code
        ccc = CurrentCodeCreate(code_id=db_obj.id)
        cc_db_obj = crud_current_code.create(db=db, create_dto=ccc)

        db.refresh(db_obj)

        # create the action manually since we are not using the crud base create
        from app.core.data.crud.action import crud_action

        action_create_dto = ActionCreate(
            project_id=create_dto.project_id,
            user_id=create_dto.user_id,
            action_type=ActionType.CREATE,
            target_type=ActionTargetObjectType.code,
            target_id=db_obj.id,
            before_state=None,
            after_state=srsly.json_dumps(db_obj.as_dict()),
        )
        crud_action.create(db=db, create_dto=action_create_dto)

        return db_obj

    def create_system_codes_for_project(
        self, db: Session, proj_id: int
    ) -> List[CodeORM]:
        created: List[CodeORM] = []

        def __create_recursively(
            code_dict: Dict[str, Dict[str, Any]], parent_code_id: Optional[int] = None
        ):
            for code_name in code_dict.keys():
                create_dto = CodeCreate(
                    name=str(code_name),
                    color=get_next_color(),
                    description=code_dict[code_name]["desc"],
                    project_id=proj_id,
                    user_id=SYSTEM_USER_ID,
                    parent_code_id=parent_code_id,
                )

                if not self.exists_by_name_and_user_and_project(
                    db,
                    code_name=create_dto.name,
                    proj_id=create_dto.project_id,
                    user_id=create_dto.user_id,
                ):
                    db_code = self.create(db=db, create_dto=create_dto)
                    created.append(db_code)

                    if "children" in code_dict[code_name]:
                        __create_recursively(
                            code_dict[code_name]["children"], parent_code_id=db_code.id
                        )

        __create_recursively(conf.system_codes)

        return created

    def read_by_name(self, db: Session, code_name: str) -> List[CodeORM]:
        return db.query(self.model).filter(self.model.name == code_name).all()

    def read_by_name_and_project(
        self, db: Session, code_name: str, proj_id: int
    ) -> List[CodeORM]:
        return (
            db.query(self.model)
            .filter(self.model.name == code_name, self.model.project_id == proj_id)
            .all()
        )

    def read_by_user_and_project(
        self, db: Session, user_id: int, proj_id: int
    ) -> List[CodeORM]:
        return (
            db.query(self.model)
            .filter(self.model.user_id == user_id, self.model.project_id == proj_id)
            .all()
        )

    def read_by_name_and_user(
        self, db: Session, code_name: str, user_id: int
    ) -> List[CodeORM]:
        return (
            db.query(self.model)
            .filter(self.model.name == code_name, self.model.user_id == user_id)
            .all()
        )

    def read_by_name_and_user_and_project(
        self, db: Session, code_name: str, user_id: int, proj_id: int
    ) -> CodeORM:
        return (
            db.query(self.model)
            .filter(
                self.model.name == code_name,
                self.model.user_id == user_id,
                self.model.project_id == proj_id,
            )
            .first()
        )

    def exists_by_name(self, db: Session, *, code_name: str) -> bool:
        return (
            db.query(self.model.id).filter(self.model.name == code_name).first()
            is not None
        )

    def exists_by_name_and_project(
        self, db: Session, *, code_name: str, proj_id: int
    ) -> bool:
        return (
            db.query(self.model.id)
            .filter(self.model.name == code_name, self.model.project_id == proj_id)
            .first()
            is not None
        )

    def exists_by_name_and_user(
        self, db: Session, *, code_name: str, user_id: int
    ) -> bool:
        return (
            db.query(self.model.id)
            .filter(self.model.name == code_name, self.model.user_id == user_id)
            .first()
            is not None
        )

    def exists_by_name_and_user_and_project(
        self, db: Session, *, code_name: str, user_id: int, proj_id: int
    ) -> bool:
        return (
            db.query(self.model.id)
            .filter(
                self.model.name == code_name,
                self.model.user_id == user_id,
                self.model.project_id == proj_id,
            )
            .first()
            is not None
        )

    def remove_by_user_and_project(
        self, db: Session, user_id: int, proj_id: int
    ) -> List[int]:
        statement = (
            delete(self.model)
            .where(self.model.user_id == user_id, self.model.project_id == proj_id)
            .returning(self.model.id)
        )
        removed_ids = db.execute(statement).fetchall()
        db.commit()

        removed_ids = list(map(lambda t: t[0], removed_ids))

        from app.core.data.crud.action import crud_action

        for rid in removed_ids:
            create_dto = ActionCreate(
                project_id=proj_id,
                user_id=user_id,
                action_type=ActionType.CREATE,
                target_type=ActionTargetObjectType.code,
                target_id=rid,
                before_state="",  # FIXME: use the removed objects JSON
                after_state=None,
            )
            crud_action.create(db=db, create_dto=create_dto)

        return removed_ids

    def remove_by_project(self, db: Session, *, proj_id: int) -> List[int]:
        statement = (
            delete(self.model)
            .where(self.model.project_id == proj_id)
            .returning(self.model.id)
        )
        removed_ids = db.execute(statement).fetchall()
        db.commit()
        removed_ids = list(map(lambda t: t[0], removed_ids))

        from app.core.data.crud.action import crud_action

        for rid in removed_ids:
            create_dto = ActionCreate(
                project_id=proj_id,
                user_id=SYSTEM_USER_ID,
                action_type=ActionType.CREATE,
                target_type=ActionTargetObjectType.code,
                target_id=rid,
                before_state="",  # FIXME: use the removed objects JSON
                after_state=None,
            )
            crud_action.create(db=db, create_dto=create_dto)

        return removed_ids


crud_code = CRUDCode(CodeORM)
