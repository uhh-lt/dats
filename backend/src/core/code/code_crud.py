from sqlalchemy.orm import Session

from config import conf
from config_schema import SystemCodeConfig
from core.code.code_dto import CodeCreate, CodeUpdate
from core.code.code_orm import CodeORM
from core.code.code_service import code_service
from repos.db.crud_base import CRUDBase
from utils.color_utils import get_next_color


class CRUDCode(CRUDBase[CodeORM, CodeCreate, CodeUpdate]):
    def create(self, db: Session, *, create_dto: CodeCreate) -> CodeORM:
        return code_service.create(db, create_dto=create_dto, author_id=None)

    def create_multi(
        self, db: Session, *, create_dtos: list[CodeCreate]
    ) -> list[CodeORM]:
        return [self.create(db, create_dto=create_dto) for create_dto in create_dtos]

    def update(self, db: Session, *, id: int, update_dto: CodeUpdate) -> CodeORM:
        return code_service.update(
            db, code_id=id, update_dto=update_dto, author_id=None
        )

    def delete(self, db: Session, *, id: int) -> CodeORM:
        raise RuntimeError("Codes must be tombstoned through CodeService")

    def remove_multi(self, db: Session, *, ids: list[int]) -> int:
        raise RuntimeError("Codes must be tombstoned through CodeService")

    def create_system_codes_for_project(
        self, db: Session, proj_id: int
    ) -> list[CodeORM]:
        created: list[CodeORM] = []

        def create_recursively(
            code_list: list[SystemCodeConfig], parent_concept_id=None
        ) -> None:
            for system_code in code_list:
                existing = self.read_by_name_and_project(
                    db, code_name=system_code.name, proj_id=proj_id
                )
                if existing is None:
                    existing = self.create(
                        db=db,
                        create_dto=CodeCreate(
                            name=system_code.name,
                            color=get_next_color(),
                            description=system_code.desc,
                            project_id=proj_id,
                            parent_concept_id=parent_concept_id,
                            is_system=True,
                            enabled=system_code.enabled,
                        ),
                    )
                    created.append(existing)
                if system_code.children:
                    create_recursively(system_code.children, existing.concept_id)

        create_recursively(conf.system_codes)
        return created

    def read_by_name(self, db: Session, code_name: str) -> list[CodeORM]:
        return (
            db.query(self.model)
            .filter(
                self.model.name == code_name,
                self.model.is_active == True,  # noqa: E712
                self.model.is_deleted == False,  # noqa: E712
            )
            .all()
        )

    def read_by_names(
        self, db: Session, project_id: int, names: list[str]
    ) -> list[CodeORM]:
        return (
            db.query(self.model)
            .filter(
                self.model.project_id == project_id,
                self.model.branch_id.is_(None),
                self.model.name.in_(names),
                self.model.is_active == True,  # noqa: E712
                self.model.is_deleted == False,  # noqa: E712
            )
            .all()
        )

    def read_system_codes_by_project(self, db: Session, proj_id: int) -> list[CodeORM]:
        return (
            db.query(self.model)
            .filter(
                self.model.project_id == proj_id,
                self.model.branch_id.is_(None),
                self.model.is_system == True,  # noqa: E712
                self.model.is_active == True,  # noqa: E712
                self.model.is_deleted == False,  # noqa: E712
            )
            .all()
        )

    def read_by_name_and_project(
        self, db: Session, code_name: str, proj_id: int
    ) -> CodeORM | None:
        return (
            db.query(self.model)
            .filter(
                self.model.name == code_name,
                self.model.project_id == proj_id,
                self.model.branch_id.is_(None),
                self.model.is_active == True,  # noqa: E712
                self.model.is_deleted == False,  # noqa: E712
            )
            .first()
        )

    def read_id_by_name_and_project(
        self, db: Session, *, code_name: str, proj_id: int
    ) -> int | None:
        code = self.read_by_name_and_project(db, code_name, proj_id)
        return code.id if code else None

    def read_with_children(self, db: Session, *, code_id: int) -> list[CodeORM]:
        code = self.read(db, code_id)
        visible = code_service.read_visible_map(db, project_id=code.project_id)
        children_by_parent: dict = {}
        for candidate in visible.values():
            children_by_parent.setdefault(candidate.parent_concept_id, []).append(
                candidate
            )
        return code_service._subtree(code, children_by_parent)

    def exists_by_name(self, db: Session, *, code_name: str) -> bool:
        return bool(self.read_by_name(db, code_name))


crud_code = CRUDCode(CodeORM)
