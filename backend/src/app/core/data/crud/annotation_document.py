import datetime
from typing import List, Optional

from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase, NoSuchElementError
from app.core.data.dto.action import ActionType
from app.core.data.dto.annotation_document import (
    AnnotationDocumentCreate,
    AnnotationDocumentUpdate,
)
from app.core.data.orm.annotation_document import AnnotationDocumentORM


class CRUDAnnotationDocument(
    CRUDBase[AnnotationDocumentORM, AnnotationDocumentCreate, AnnotationDocumentUpdate]
):
    def update_timestamp(
        self, db: Session, *, id: int
    ) -> Optional[AnnotationDocumentORM]:
        self.update(
            db=db,
            id=id,
            update_dto=AnnotationDocumentUpdate(updated=datetime.datetime.now()),
        )

    def read_by_user(self, db: Session, *, user_id: int) -> List[AnnotationDocumentORM]:
        return db.query(self.model).filter(self.model.user_id == user_id).all()

    def read_by_sdoc_and_user(
        self, db: Session, *, sdoc_id: int, user_id: int, raise_error: bool = True
    ) -> Optional[AnnotationDocumentORM]:
        db_obj = (
            db.query(self.model)
            .filter(
                self.model.source_document_id == sdoc_id,
                self.model.user_id == user_id,
            )
            .first()
        )
        if raise_error and not db_obj:
            raise NoSuchElementError(self.model, sdoc_id=sdoc_id, user_id=user_id)
        return db_obj

    def exists_by_sdoc_and_user(
        self, db: Session, *, sdoc_id: int, user_id: int, raise_error: bool = False
    ) -> Optional[bool]:
        exists = (
            db.query(self.model)
            .filter(
                self.model.source_document_id == sdoc_id,
                self.model.user_id == user_id,
            )
            .first()
            is not None
        )
        if not exists and raise_error:
            raise NoSuchElementError(self.model, id=id)
        return exists

    def remove_by_sdoc(self, db: Session, *, sdoc_id: int) -> List[int]:
        # find all adocs to be removed
        query = db.query(self.model).filter(self.model.source_document_id == sdoc_id)
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


crud_adoc = CRUDAnnotationDocument(AnnotationDocumentORM)
