from typing import List

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.crud.user import SYSTEM_USER_ID
from app.core.data.dto.action import ActionType, ActionTargetObjectType, ActionCreate
from app.core.data.dto.document_tag import DocumentTagCreate, DocumentTagUpdate
from app.core.data.orm.document_tag import DocumentTagORM, SourceDocumentDocumentTagLinkTable


class CRUDDocumentTag(CRUDBase[DocumentTagORM, DocumentTagCreate, DocumentTagUpdate]):
    def remove_by_project(self, db: Session, *, proj_id: int) -> List[int]:
        statement = delete(self.model).where(self.model.project_id == proj_id).returning(self.model.id)
        removed_ids = db.execute(statement).fetchall()
        db.commit()

        removed_ids = list(map(lambda t: t[0], removed_ids))

        from app.core.data.crud.action import crud_action
        for rid in removed_ids:
            create_dto = ActionCreate(project_id=proj_id,
                                      user_id=SYSTEM_USER_ID,
                                      action_type=ActionType.DELETE,
                                      target_type=ActionTargetObjectType.document_tag,
                                      target_id=rid)
            crud_action.create(db=db, create_dto=create_dto)
        return removed_ids

    def link_multiple_document_tags(self, db: Session, *, sdoc_ids: List[int], tag_ids: List[int]) -> int:
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

        # get the project id (assuming all doc tags and sdocs are in the same project!)
        proj_id = self.read(db, tag_ids[0]).project_id

        from app.core.data.crud.action import crud_action
        for sid in sdoc_ids:
            create_dto = ActionCreate(project_id=proj_id,
                                      user_id=SYSTEM_USER_ID,  # FIXME use correct user
                                      action_type=ActionType.UPDATE,
                                      target_type=ActionTargetObjectType.source_document,
                                      target_id=sid)
            crud_action.create(db=db, create_dto=create_dto)

        return len(new_rows)

    def unlink_multiple_document_tags(self, db: Session, *, sdoc_ids: List[int], tag_ids: List[int]) -> int:
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

        # get the project id (assuming all doc tags and sdocs are in the same project!)
        proj_id = self.read(db, tag_ids[0]).project_id

        from app.core.data.crud.action import crud_action
        for sid in sdoc_ids:
            create_dto = ActionCreate(project_id=proj_id,
                                      user_id=SYSTEM_USER_ID,  # FIXME use correct user
                                      action_type=ActionType.UPDATE,
                                      target_type=ActionTargetObjectType.source_document,
                                      target_id=sid)
            crud_action.create(db=db, create_dto=create_dto)

        return len(del_rows)


crud_document_tag = CRUDDocumentTag(DocumentTagORM)
