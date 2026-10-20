import datetime

from sqlalchemy import update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from config import conf
from core.annotation.annotation_document_dto import (
    AnnotationDocumentCreate,
    AnnotationDocumentUpdate,
)
from core.annotation.annotation_document_orm import AnnotationDocumentORM
from repos.db.crud_base import CRUDBase, NoSuchElementError


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
        self,
        db: Session,
        *,
        id: int,
    ) -> AnnotationDocumentORM | None:
        self.update(
            db=db,
            id=id,
            update_dto=AnnotationDocumentUpdate(
                updated=datetime.datetime.now(datetime.UTC)
            ),
        )

    def update_timestamps(self, db: Session, *, ids: list[int]) -> None:
        """Update annotation-document timestamps using batched SQL statements."""
        updated = datetime.datetime.now(datetime.UTC)
        for i in range(0, len(ids), conf.postgres.batch_size):
            batch_ids = ids[i : i + conf.postgres.batch_size]
            db.execute(
                update(self.model)
                .where(self.model.id.in_(batch_ids))
                .values(updated=updated)
            )
        db.flush()

    ### DELETE OPERATIONS ###

    def delete_by_sdoc(self, db: Session, *, sdoc_id: int) -> list[int]:
        # find all adocs to be removed
        query = db.query(self.model).filter(self.model.source_document_id == sdoc_id)
        removed_orms = query.all()
        ids = [removed_orm.id for removed_orm in removed_orms]

        # delete the adocs
        query.delete()
        db.flush()

        return ids

    ### OTHER OPERATIONS ###

    def exists_or_create(
        self,
        db: Session,
        *,
        user_id: int,
        sdoc_id: int,
    ) -> AnnotationDocumentORM:
        return self.exists_or_create_multi(db=db, user_id=user_id, sdoc_ids=[sdoc_id])[
            sdoc_id
        ]

    def exists_or_create_multi(
        self,
        db: Session,
        *,
        user_id: int,
        sdoc_ids: list[int],
    ) -> dict[int, AnnotationDocumentORM]:
        """Return annotation documents for a user, creating missing rows in bulk.

        Concurrent jobs (e.g. object detection and spacy of the same image) create the
        same annotation document, so a check-then-insert would race. ON CONFLICT DO
        NOTHING waits for the other transaction and skips the row if it committed.
        """
        unique_sdoc_ids = list(dict.fromkeys(sdoc_ids))
        annotation_documents: list[AnnotationDocumentORM] = []
        for i in range(0, len(unique_sdoc_ids), conf.postgres.batch_size):
            batch_ids = unique_sdoc_ids[i : i + conf.postgres.batch_size]
            db.execute(
                insert(self.model)
                .values(
                    [
                        {"user_id": user_id, "source_document_id": sdoc_id}
                        for sdoc_id in batch_ids
                    ]
                )
                .on_conflict_do_nothing(
                    index_elements=[
                        self.model.source_document_id,
                        self.model.user_id,
                    ]
                )
            )
            annotation_documents.extend(
                db.query(self.model)
                .filter(
                    self.model.user_id == user_id,
                    self.model.source_document_id.in_(batch_ids),
                )
                .all()
            )
        db.flush()

        return {
            annotation_document.source_document_id: annotation_document
            for annotation_document in annotation_documents
        }


crud_adoc = CRUDAnnotationDocument(AnnotationDocumentORM)
