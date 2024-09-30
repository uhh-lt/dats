from typing import Any, Dict, List, Optional

import srsly
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.action import ActionType
from app.core.data.dto.code import CodeCreate, CodeRead, CodeUpdate
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

        # create the action manually since we are not using the crud base create
        after_state = self._get_action_state_from_orm(db_obj=db_obj)
        self._create_action(
            db_obj=db_obj,
            action_type=ActionType.CREATE,
            after_state=after_state,
        )

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
                    parent_id=parent_code_id,
                    is_system=True,
                )

                if not self.exists_by_name_and_project(
                    db,
                    code_name=create_dto.name,
                    proj_id=create_dto.project_id,
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
    ) -> Optional[CodeORM]:
        return (
            db.query(self.model)
            .filter(self.model.name == code_name, self.model.project_id == proj_id)
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

    def remove_by_project(self, db: Session, *, proj_id: int) -> List[int]:
        # find all codes to be removed
        query = db.query(self.model).filter(self.model.project_id == proj_id)
        removed_orms = query.all()
        ids = [removed_orm.id for removed_orm in removed_orms]

        # create actions
        for removed_orm in removed_orms:
            before_state = self._get_action_state_from_orm(removed_orm)
            self._create_action(
                db_obj=removed_orm,
                action_type=ActionType.DELETE,
                before_state=before_state,
            )

        # delete the codes
        query.delete()
        db.commit()

        return ids

    def _get_action_state_from_orm(self, db_obj: CodeORM) -> Optional[str]:
        return srsly.json_dumps(
            CodeRead.model_validate(db_obj).model_dump(),
        )


crud_code = CRUDCode(CodeORM)
