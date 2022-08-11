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

    @staticmethod
    def link_multiple_document_tags(db: Session, *, sdoc_ids: List[int], tag_ids: List[int]) -> int:
        """
        Links all SDocs with all DocTags
        """
        from sqlalchemy.dialects.postgresql import insert

        insert_values = [
            {
                "source_document_id": str(sdoc_id),
                "document_tag_id": str(tag_id)
            }
            for sdoc_id in sdoc_ids for tag_id in tag_ids
        ]

        insert_stmt = insert(SourceDocumentDocumentTagLinkTable) \
            .on_conflict_do_nothing() \
            .returning(SourceDocumentDocumentTagLinkTable.source_document_id)

        new_rows = db.execute(
            insert_stmt,
            insert_values).fetchall()
        db.commit()

        return len(new_rows)

    # noinspection PyUnresolvedReferences
    @staticmethod
    def unlink_multiple_document_tags(db: Session, *, sdoc_ids: List[int], tag_ids: List[int]) -> int:
        """
        Unlinks all DocTags with all SDocs
        """
        del_rows = db.execute(
            delete(SourceDocumentDocumentTagLinkTable).where(
                SourceDocumentDocumentTagLinkTable.source_document_id.in_(sdoc_ids),
                SourceDocumentDocumentTagLinkTable.document_tag_id.in_(tag_ids)
            ).returning(SourceDocumentDocumentTagLinkTable.source_document_id)
        ).fetchall()
        db.commit()

        return len(del_rows)


crud_document_tag = CRUDDocumentTag(DocumentTagORM)
