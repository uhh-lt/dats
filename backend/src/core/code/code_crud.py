from sqlalchemy.orm import Session

from config import conf
from config_schema import SystemCodeConfig
from core.code.code_dto import CodeCreate, CodeUpdate
from core.code.code_orm import CodeORM
from repos.db.crud_base import BATCH_SIZE, SQLCRUDBase
from utils.color_utils import get_next_color


class CRUDCode(SQLCRUDBase[CodeORM, CodeCreate, CodeUpdate]):
    ### CREATE OPERATIONS ###

    def create_system_codes_for_project(
        self, db: Session, *, project_id: int
    ) -> list[CodeORM]:
        created: list[CodeORM] = []

        def __create_recursively(
            code_list: list[SystemCodeConfig], parent_code_id: int | None = None
        ) -> None:
            for system_code in code_list:
                create_dto = CodeCreate(
                    name=system_code.name,
                    color=get_next_color(),
                    description=system_code.desc,
                    project_id=project_id,
                    parent_id=parent_code_id,
                    is_system=True,
                    enabled=system_code.enabled,
                )

                existing_code_id = self.read_id_by_name_and_project(
                    db,
                    code_name=create_dto.name,
                    project_id=create_dto.project_id,
                )

                if existing_code_id is None:
                    db_code = self.create(db=db, create_dto=create_dto)
                    existing_code_id = db_code.id
                    created.append(db_code)

                if len(system_code.children) > 0:
                    __create_recursively(
                        system_code.children,
                        parent_code_id=existing_code_id,
                    )

        __create_recursively(conf.system_codes)

        return created

    ### READ OPERATIONS ###

    def read_by_name(self, db: Session, *, code_name: str) -> list[CodeORM]:
        return db.query(self.model).filter(self.model.name == code_name).all()

    def read_by_names(
        self, db: Session, *, project_id: int, names: list[str]
    ) -> list[CodeORM]:
        if not names:
            return []

        db_objs: list[CodeORM] = []
        for i in range(0, len(names), BATCH_SIZE):
            batch_names = names[i : i + BATCH_SIZE]
            db_objs.extend(
                db.query(self.model)
                .filter(
                    self.model.project_id == project_id,
                    self.model.name.in_(batch_names),
                )
                .all()
            )
        return db_objs

    def read_system_codes_by_project(
        self, db: Session, *, project_id: int
    ) -> list[CodeORM]:
        return (
            db.query(self.model)
            .filter(self.model.project_id == project_id, self.model.is_system == True)  # noqa: E712
            .all()
        )

    def read_by_name_and_project(
        self, db: Session, *, code_name: str, project_id: int
    ) -> CodeORM | None:
        return (
            db.query(self.model)
            .filter(self.model.name == code_name, self.model.project_id == project_id)
            .first()
        )

    def read_id_by_name_and_project(
        self, db: Session, *, code_name: str, project_id: int
    ) -> int | None:
        code_id = (
            db.query(self.model.id)
            .filter(self.model.name == code_name, self.model.project_id == project_id)
            .first()
        )
        return code_id[0] if code_id else None

    def read_with_children(self, db: Session, *, code_id: int) -> list[CodeORM]:
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

    def update_multi(
        self, db: Session, *, ids: list[int], update_dtos: list[CodeUpdate]
    ) -> list[CodeORM]:
        codes = super().update_multi(db=db, ids=ids, update_dtos=update_dtos)

        # enabling or disabling a code applies to all its descendants; enabling
        # also enables its ancestors, so the code is reachable from the top
        for code, update_dto in zip(codes, update_dtos):
            if update_dto.enabled is None:
                continue
            for descendant in self.read_with_children(db=db, code_id=code.id):
                descendant.enabled = update_dto.enabled
            parent = code.parent if update_dto.enabled else None
            while parent is not None:
                parent.enabled = True
                parent = parent.parent
        db.flush()
        return codes

    ### OTHER OPERATIONS ###

    def exists_by_name(self, db: Session, *, code_name: str) -> bool:
        return (
            db.query(self.model.id).filter(self.model.name == code_name).first()
            is not None
        )


crud_code = CRUDCode(CodeORM)
