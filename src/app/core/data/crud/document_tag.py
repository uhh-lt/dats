from typing import List

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.document_tag import DocumentTagCreate, DocumentTagUpdate
from app.core.data.orm.document_tag import DocumentTagORM, SourceDocumentDocumentTagLinkTable


class CRUDDocumentTag(CRUDBase[DocumentTagORM, DocumentTagCreate, DocumentTagUpdate]):
    def remove_by_project(self, db: Session, *, proj_id: int) -> List[int]:
        statement = delete(self.model).where(self.model.project_id == proj_id).returning(self.model.id)
        removed_ids = db.execute(statement).fetchall()
        db.commit()
        return list(map(lambda t: t[0], removed_ids))

    def set_multiple_document_tags(self, db: Session, *, sdoc_ids: List[int], tag_ids: List[int]) -> int:
        """
        Sets DocTags to SDocs
        """
        from app.core.data.crud.source_document import crud_sdoc

        sdoc_db_objs = crud_sdoc.read_by_ids(db=db, ids=sdoc_ids)
        doc_tag_db_objs = self.read_by_ids(db=db, ids=tag_ids)

        for sdoc_db_obj in sdoc_db_objs:
            sdoc_db_obj.document_tags = doc_tag_db_objs
        db.commit()

        return len(sdoc_ids)


crud_document_tag = CRUDDocumentTag(DocumentTagORM)
