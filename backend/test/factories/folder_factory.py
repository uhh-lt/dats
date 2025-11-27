from sqlalchemy.orm import Session

from core.doc.folder_crud import crud_folder
from core.doc.folder_dto import FolderCreate, FolderType
from core.doc.folder_orm import FolderORM


class FolderFactory:
    def __init__(self, db_session: Session):
        self.db_session = db_session

    def create(
        self,
        create_dto: FolderCreate | None = None,
    ) -> FolderORM:
        if create_dto is None:
            create_dto = FolderCreate(
                name="Name",
                folder_type=FolderType.NORMAL,
                parent_id=1,
                project_id=1,
            )

        return crud_folder.create(
            db=self.db_session,
            create_dto=create_dto,
        )
