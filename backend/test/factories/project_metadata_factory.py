from sqlalchemy.orm import Session

from core.metadata.project_metadata_crud import crud_project_meta
from core.metadata.project_metadata_dto import DocType, MetaType, ProjectMetadataCreate
from core.metadata.project_metadata_orm import ProjectMetadataORM


class ProjectMetadataFactory:
    def __init__(self, db_session: Session):
        self.db_session = db_session

    def create(
        self,
        create_dto: ProjectMetadataCreate | None = None,
    ) -> ProjectMetadataORM:
        if create_dto is None:
            create_dto = ProjectMetadataCreate(
                key="default_meta_key",
                metatype=MetaType.STRING,
                read_only=False,
                doctype=DocType.text,
                description="Default test metadata field for a project.",
                project_id=1,
            )

        return crud_project_meta.create(
            db=self.db_session,
            create_dto=create_dto,
        )
