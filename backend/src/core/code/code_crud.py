from sqlalchemy.orm import Session

from core.code.code_dto import CodeCreate, CodeUpdate
from core.code.code_exceptions import SystemCodeConflictError
from core.code.code_orm import CodeORM
from core.code.system_codes import ROOT, ROOT_DESCRIPTION, SystemCode
from repos.db.crud_base import BATCH_SIZE, SQLCRUDBase


class CRUDCode(SQLCRUDBase[CodeORM, CodeCreate, CodeUpdate]):
    ### CREATE OPERATIONS ###

    def create_system_codes(
        self, db: Session, *, project_id: int, codes: list[SystemCode]
    ) -> list[CodeORM]:
        """
        Create the system code trees below the root `SYSTEM_CODE`, which is
        created if missing. The trees may overlap. An existing system code of
        the same name is reused if it has the declared parent.

        Args:
            project_id: The project to create the codes in.
            codes: The code trees; without codes nothing is created.

        Returns:
            The created codes.

        Raises:
            SystemCodeConflictError: A user code has the name of a declared code,
                or a system code of that name has another parent.
        """
        created: list[CodeORM] = []
        if not codes:
            return created

        def ensure(
            name: str, description: str, enabled: bool, parent_id: int | None
        ) -> int:
            existing = self.read_by_name_and_project(
                db, code_name=name, project_id=project_id
            )
            if existing is None:
                db_code = self.create(
                    db=db,
                    create_dto=CodeCreate(
                        name=name,
                        description=description,
                        project_id=project_id,
                        parent_id=parent_id,
                        is_system=True,
                        enabled=enabled,
                    ),
                )
                created.append(db_code)
                return db_code.id
            if not existing.is_system:
                raise SystemCodeConflictError(
                    project_id=project_id, name=name, reason="a user code has the name"
                )
            if existing.parent_id != parent_id:
                raise SystemCodeConflictError(
                    project_id=project_id,
                    name=name,
                    reason="a system code of the name has another parent",
                )
            return existing.id

        def create_tree(code: SystemCode, parent_id: int) -> None:
            code_id = ensure(code.name, code.description, code.enabled, parent_id)
            for child in code.children:
                create_tree(child, code_id)

        root_id = ensure(ROOT, ROOT_DESCRIPTION, True, None)
        for tree in codes:
            create_tree(tree, root_id)
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
