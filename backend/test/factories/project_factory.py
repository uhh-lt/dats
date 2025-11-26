from sqlalchemy.orm import Session

from core.project.project_dto import ProjectCreate
from core.project.project_orm import ProjectORM
from core.project.project_service import ProjectService


class ProjectFactory:
    def __init__(self, db_session: Session):
        self.ps = ProjectService()
        self.db_session = db_session

    def create(
        self, creating_user_id: int, create_dto: ProjectCreate | None = None
    ) -> ProjectORM:
        if create_dto is None:
            # TODO randomize?
            create_dto = ProjectCreate(
                title="Test Project", description="A project for testing"
            )
        return self.ps.create_project(
            db=self.db_session,
            create_dto=create_dto,
            creating_user_id=creating_user_id,
        )
