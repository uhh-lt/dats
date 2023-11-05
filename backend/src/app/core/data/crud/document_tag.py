from typing import List, Optional

import srsly
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.action import ActionType
from app.core.data.dto.document_tag import (
    DocumentTagCreate,
    DocumentTagRead,
    DocumentTagUpdate,
)
from app.core.data.orm.document_tag import (
    DocumentTagORM,
    SourceDocumentDocumentTagLinkTable,
)


class CRUDDocumentTag(CRUDBase[DocumentTagORM, DocumentTagCreate, DocumentTagUpdate]):
    def update(
        self, db: Session, *, id: int, update_dto: DocumentTagUpdate
    ) -> DocumentTagORM | None:
        if update_dto.parent_tag_id == -1:
            update_dto.parent_tag_id = None
        return super().update(db, id=id, update_dto=update_dto)

    def remove_by_project(self, db: Session, *, proj_id: int) -> List[int]:
        # find all document tags to be removed
        query = db.query(self.model).filter(self.model.project_id == proj_id)
        removed_orms = query.all()
        ids = [removed_orm.id for removed_orm in removed_orms]

        # create actions
        for removed_orm in removed_orms:
            before_state = self._get_action_state_from_orm(removed_orm)
            self._create_action(
                db_obj=removed_orm,
                action_type=ActionType.DELETE,
                before_state=before_state,
            )

        # delete the adocs
        query.delete()
        db.commit()

        return ids

    def link_multiple_document_tags(
        self, db: Session, *, sdoc_ids: List[int], tag_ids: List[int]
    ) -> int:
        """
        Links all SDocs with all DocTags
        """

        # create before state
        from app.core.data.crud.source_document import crud_sdoc

        sdoc_orms = crud_sdoc.read_by_ids(db, sdoc_ids)
        before_states = [
            crud_sdoc._get_action_state_from_orm(sdoc_orm) for sdoc_orm in sdoc_orms
        ]

        # insert links (sdoc <-> tag)
        from sqlalchemy.dialects.postgresql import insert

        insert_values = [
            {"source_document_id": str(sdoc_id), "document_tag_id": str(tag_id)}
            for sdoc_id in sdoc_ids
            for tag_id in tag_ids
        ]

        insert_stmt = (
            insert(SourceDocumentDocumentTagLinkTable)
            .on_conflict_do_nothing()
            .returning(SourceDocumentDocumentTagLinkTable.source_document_id)
        )

        new_rows = db.execute(insert_stmt, insert_values).fetchall()
        db.commit()

        # create after state
        sdoc_orms = crud_sdoc.read_by_ids(db, sdoc_ids)
        after_states = [
            crud_sdoc._get_action_state_from_orm(sdoc_orm) for sdoc_orm in sdoc_orms
        ]

        # create actions
        for db_obj, before_state, after_state in zip(
            sdoc_orms, before_states, after_states
        ):
            crud_sdoc._create_action(
                db_obj=db_obj,
                action_type=ActionType.UPDATE,
                before_state=before_state,
                after_state=after_state,
            )

        return len(new_rows)

    def unlink_multiple_document_tags(
        self, db: Session, *, sdoc_ids: List[int], tag_ids: List[int]
    ) -> int:
        """
        Unlinks all DocTags with all SDocs
        """
        # create before state
        from app.core.data.crud.source_document import crud_sdoc

        sdoc_orms = crud_sdoc.read_by_ids(db, sdoc_ids)
        before_states = [
            crud_sdoc._get_action_state_from_orm(sdoc_orm) for sdoc_orm in sdoc_orms
        ]

        # remove links (sdoc <-> tag)
        del_rows = db.execute(
            delete(SourceDocumentDocumentTagLinkTable)
            .where(
                SourceDocumentDocumentTagLinkTable.source_document_id.in_(sdoc_ids),
                SourceDocumentDocumentTagLinkTable.document_tag_id.in_(tag_ids),
            )
            .returning(SourceDocumentDocumentTagLinkTable.source_document_id)
        ).fetchall()
        db.commit()

        # create after state
        sdoc_orms = crud_sdoc.read_by_ids(db, sdoc_ids)
        after_states = [
            crud_sdoc._get_action_state_from_orm(sdoc_orm) for sdoc_orm in sdoc_orms
        ]

        # create actions
        for db_obj, before_state, after_state in zip(
            sdoc_orms, before_states, after_states
        ):
            crud_sdoc._create_action(
                db_obj=db_obj,
                action_type=ActionType.UPDATE,
                before_state=before_state,
                after_state=after_state,
            )

        return len(del_rows)

    def _get_action_state_from_orm(self, db_obj: DocumentTagORM) -> Optional[str]:
        return srsly.json_dumps(DocumentTagRead.model_validate(db_obj).model_dump())


crud_document_tag = CRUDDocumentTag(DocumentTagORM)
