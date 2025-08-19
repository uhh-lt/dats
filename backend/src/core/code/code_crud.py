from typing import Any

from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from config import conf
from core.code.code_dto import CodeCreate, CodeUpdate
from core.code.code_orm import CodeORM
from repos.db.crud_base import CRUDBase
from utils.color_utils import get_next_color


class CRUDCode(CRUDBase[CodeORM, CodeCreate, CodeUpdate]):
    ### CREATE OPERATIONS ###

    def create(self, db: Session, *, create_dto: CodeCreate) -> CodeORM:
        dto_obj_data = jsonable_encoder(create_dto)
        # first create the code
        # noinspection PyArgumentList
        db_obj = self.model(**dto_obj_data)
        db.add(db_obj)
        db.commit()

        return db_obj

    def create_system_codes_for_project(
        self, db: Session, proj_id: int
    ) -> list[CodeORM]:
        created: list[CodeORM] = []

        def __create_recursively(
            code_dict: dict[str, dict[str, Any]], parent_code_id: int | None = None
        ):
            for code_name in code_dict.keys():
                create_dto = CodeCreate(
                    name=str(code_name),
                    color=get_next_color(),
                    description=code_dict[code_name]["desc"],
                    project_id=proj_id,
                    parent_id=parent_code_id,
                    is_system=True,
                    enabled=code_dict[code_name].get("enabled", True),
                )

                existing_code_id = self.read_id_by_name_and_project(
                    db,
                    code_name=create_dto.name,
                    proj_id=create_dto.project_id,
                )

                if existing_code_id is None:
                    db_code = self.create(db=db, create_dto=create_dto)
                    existing_code_id = db_code.id
                    created.append(db_code)

                if "children" in code_dict[code_name]:
                    __create_recursively(
                        code_dict[code_name]["children"],
                        parent_code_id=existing_code_id,
                    )

        __create_recursively(conf.system_codes)

        return created

    ### READ OPERATIONS ###

    def read_by_name(self, db: Session, code_name: str) -> list[CodeORM]:
        return db.query(self.model).filter(self.model.name == code_name).all()

    def read_system_codes_by_project(self, db: Session, proj_id: int) -> list[CodeORM]:
        return (
            db.query(self.model)
            .filter(self.model.project_id == proj_id, self.model.is_system == True)  # noqa: E712
            .all()
        )

    def read_by_name_and_project(
        self, db: Session, code_name: str, proj_id: int
    ) -> CodeORM | None:
        return (
            db.query(self.model)
            .filter(self.model.name == code_name, self.model.project_id == proj_id)
            .first()
        )

    def read_id_by_name_and_project(
        self, db: Session, *, code_name: str, proj_id: int
    ) -> int | None:
        code_id = (
            db.query(self.model.id)
            .filter(self.model.name == code_name, self.model.project_id == proj_id)
            .first()
        )
        return code_id[0] if code_id else None

    def read_with_children(self, db: Session, *, code_id) -> list[CodeORM]:
        topq = (
            db.query(self.model.id)
            .filter(self.model.id == code_id)
            .cte("cte", recursive=True)
        )
        bottomq = db.query(self.model.id).join(topq, self.model.parent_id == topq.c.id)
        recursive_q = topq.union(bottomq)  # type: ignore
        return (
            db.query(self.model)
            .filter(self.model.id.in_(db.query(recursive_q.c.id)))
            .all()
        )

    ### UPDATE OPERATIONS ###

    def update_with_children(
        self, db: Session, *, code_id, update_dto: CodeUpdate
    ) -> CodeORM:
        if update_dto.enabled is None:
            return self.update(db, id=code_id, update_dto=update_dto)
        codes = self.read_with_children(db, code_id=code_id)
        obj_data = jsonable_encoder(codes[0].as_dict())
        update_data = update_dto.model_dump(exclude_unset=True)
        for field in obj_data:
            if field in update_data:
                setattr(codes[0], field, update_data[field])
        for code in codes:
            code.enabled = update_dto.enabled
        db.add_all(codes)
        db.commit()
        return codes[0]

    ### OTHER OPERATIONS ###

    def exists_by_name(self, db: Session, *, code_name: str) -> bool:
        return (
            db.query(self.model.id).filter(self.model.name == code_name).first()
            is not None
        )


crud_code = CRUDCode(CodeORM)
