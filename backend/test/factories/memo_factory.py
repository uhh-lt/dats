from uuid import uuid4

from sqlalchemy.orm import Session

from core.memo.memo_crud import crud_memo
from core.memo.memo_dto import AttachedObjectType, MemoCreateIntern
from core.memo.memo_orm import MemoORM


class MemoFactory:
    def __init__(self, db_session: Session):
        self.db_session = db_session

    def create(
        self,
        attached_object_id: int,
        attached_object_type: AttachedObjectType,
        create_dto: MemoCreateIntern | None = None,
    ) -> MemoORM:
        if create_dto is None:
            create_dto = MemoCreateIntern(
                uuid=str(uuid4()),
                project_id=1,
                user_id=1,
                title="test memo",
                content="This is the default test content for a memo.",
                content_json='{"type": "doc", "content": []}',
                starred=False,
            )

        return crud_memo.create_for_attached_object(
            db=self.db_session,
            attached_object_id=attached_object_id,
            attached_object_type=attached_object_type,
            create_dto=create_dto,
        )
