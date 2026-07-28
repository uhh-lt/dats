from sqlalchemy.orm import Session

from core.code.code_branch_dto import CodeBranchCreate
from core.code.code_branch_orm import CodeBranchORM
from repos.db.crud_base import CRUDBase, UpdateNotAllowed


class CRUDCodeBranch(CRUDBase[CodeBranchORM, CodeBranchCreate, UpdateNotAllowed]):
    def create_for_user(
        self, db: Session, *, create_dto: CodeBranchCreate, user_id: int
    ) -> CodeBranchORM:
        name = create_dto.name.strip()
        if not name:
            raise ValueError("Branch name cannot be blank")
        branch = CodeBranchORM(
            name=name,
            project_id=create_dto.project_id,
            created_by_id=user_id,
        )
        db.add(branch)
        db.flush()
        return branch

    def read_by_project(
        self, db: Session, *, project_id: int, include_archived: bool = False
    ) -> list[CodeBranchORM]:
        query = db.query(self.model).filter(self.model.project_id == project_id)
        if not include_archived:
            query = query.filter(self.model.is_archived == False)  # noqa: E712
        return query.order_by(self.model.name, self.model.id).all()


crud_code_branch = CRUDCodeBranch(CodeBranchORM)
