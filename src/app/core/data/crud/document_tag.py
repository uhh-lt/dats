from typing import List

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.document_tag import DocumentTagCreate, DocumentTagUpdate
from app.core.data.orm.document_tag import DocumentTagORM


class CRUDDocumentTag(CRUDBase[DocumentTagORM, DocumentTagCreate, DocumentTagUpdate]):
    def remove_by_project(self, db: Session, *, proj_id: int) -> List[int]:
        statement = delete(self.model).where(self.model.project_id == proj_id).returning(self.model.id)
        removed_ids = db.execute(statement).fetchall()
        db.commit()
        return list(map(lambda t: t[0], removed_ids))


crud_document_tag = CRUDDocumentTag(DocumentTagORM)
