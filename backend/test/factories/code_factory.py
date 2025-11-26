from sqlalchemy.orm import Session

from core.code.code_crud import crud_code
from core.code.code_dto import CodeCreate
from core.code.code_orm import CodeORM


class CodeFactory:
    def __init__(self, db_session: Session):
        self.db_session = db_session

    def create(
        self,
        create_dto: CodeCreate | None = None,
    ) -> CodeORM:
        if create_dto is None:
            create_dto = CodeCreate(
                name="test_code",
                description="Code used in test",
                color="rgb(20,20,20)",
                is_system=False,
                enabled=True,
                project_id=1,
            )

        return crud_code.create(
            db=self.db_session,
            create_dto=create_dto,
        )
