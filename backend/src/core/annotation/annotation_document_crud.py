import datetime

from core.annotation.annotation_document_dto import (
    AnnotationDocumentCreate,
    AnnotationDocumentUpdate,
)
from core.annotation.annotation_document_orm import AnnotationDocumentORM
from repos.db.crud_base import CRUDBase, NoSuchElementError
from sqlalchemy.orm import Session


class CRUDAnnotationDocument(
    CRUDBase[AnnotationDocumentORM, AnnotationDocumentCreate, AnnotationDocumentUpdate]
):
    ### READ OPERATIONS ###

    def read_by_user(self, db: Session, *, user_id: int) -> list[AnnotationDocumentORM]:
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

    ### UPDATE OPERATIONS ###

    def update_timestamp(
        self, db: Session, *, id: int, manual_commit: bool = False
    ) -> AnnotationDocumentORM | None:
        self.update(
            db=db,
            id=id,
            update_dto=AnnotationDocumentUpdate(updated=datetime.datetime.now()),
            manual_commit=manual_commit,
        )

    ### DELETE OPERATIONS ###

    def delete_by_sdoc(self, db: Session, *, sdoc_id: int) -> list[int]:
        # find all adocs to be removed
        query = db.query(self.model).filter(self.model.source_document_id == sdoc_id)
        removed_orms = query.all()
        ids = [removed_orm.id for removed_orm in removed_orms]

        # delete the adocs
        query.delete()
        db.commit()

        return ids

    ### OTHER OPERATIONS ###

    def exists_or_create(
        self, db: Session, *, user_id: int, sdoc_id: int, manual_commit: bool = False
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
                manual_commit=manual_commit,
            )
        return db_obj


crud_adoc = CRUDAnnotationDocument(AnnotationDocumentORM)
