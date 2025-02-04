import datetime
from typing import List, Optional

from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase, NoSuchElementError
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

    def exists_or_create(
        self, db: Session, *, user_id: int, sdoc_id: int
    ) -> AnnotationDocumentORM:
        db_obj = (
            db.query(self.model)
            .filter(
                self.model.user_id == user_id, self.model.source_document_id == sdoc_id
            )
            .first()
        )
        if db_obj is None:
            return self.create(
                db=db,
                create_dto=AnnotationDocumentCreate(
                    user_id=user_id, source_document_id=sdoc_id
                ),
            )
        return db_obj

    def read_by_user(self, db: Session, *, user_id: int) -> List[AnnotationDocumentORM]:
        return db.query(self.model).filter(self.model.user_id == user_id).all()

    def read_by_sdoc_and_user(
        self, db: Session, *, sdoc_id: int, user_id: int
    ) -> AnnotationDocumentORM:
        db_obj = (
            db.query(self.model)
            .filter(
                self.model.source_document_id == sdoc_id,
                self.model.user_id == user_id,
            )
            .first()
        )
        if db_obj is None:
            raise NoSuchElementError(self.model, sdoc_id=sdoc_id, user_id=user_id)

        return db_obj

    def remove_by_sdoc(self, db: Session, *, sdoc_id: int) -> List[int]:
        # find all adocs to be removed
        query = db.query(self.model).filter(self.model.source_document_id == sdoc_id)
        removed_orms = query.all()
        ids = [removed_orm.id for removed_orm in removed_orms]

        # delete the adocs
        query.delete()
        db.commit()

        return ids


crud_adoc = CRUDAnnotationDocument(AnnotationDocumentORM)
