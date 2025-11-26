# backend/test/factories_plain/tag_factory.py

from sqlalchemy.orm import Session

from core.tag.tag_crud import crud_tag
from core.tag.tag_dto import TagCreate
from core.tag.tag_orm import TagORM


class TagFactory:
    def __init__(self, db_session: Session):
        self.db_session = db_session

    def create(
        self,
        create_dto: TagCreate | None = None,
    ) -> TagORM:
        if create_dto is None:
            create_dto = TagCreate(
                name=("test_tag"),
                description=("Tag created in tests"),
                project_id=1,
            )

        return crud_tag.create(
            db=self.db_session,
            create_dto=create_dto,
        )
