import datetime

from sqlalchemy import update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from core.annotation.annotation_document_dto import (
    AnnotationDocumentCreate,
    AnnotationDocumentUpdate,
)
from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.annotation.annotation_exceptions import (
    AnnotationDocumentOfAnotherProjectError,
)
from repos.db.crud_base import BATCH_SIZE
from repos.db.project_crud_base import ProjectCRUDBase


class CRUDAnnotationDocument(
    ProjectCRUDBase[
        AnnotationDocumentORM, AnnotationDocumentCreate, AnnotationDocumentUpdate
    ]
):
    ### READ OPERATIONS ###

    def read_by_user_and_sdocs(
        self, db: Session, *, project_id: int, user_id: int, sdoc_ids: list[int]
    ) -> list[AnnotationDocumentORM]:
        """
        Read the annotation documents of a user for the given documents. A document
        has one if the user annotated it (the "Annotated by" filter).

        Args:
            project_id: The project of the annotation documents.
            user_id: The ID of the user.
            sdoc_ids: The IDs of the documents.

        Returns:
            The existing annotation documents, in no particular order.
        """
        if not sdoc_ids:
            return []

        db_objs: list[AnnotationDocumentORM] = []
        for i in range(0, len(sdoc_ids), BATCH_SIZE):
            batch_ids = sdoc_ids[i : i + BATCH_SIZE]
            db_objs.extend(
                db.query(self.model)
                .filter(
                    self.model.project_id == project_id,
                    self.model.user_id == user_id,
                    self.model.source_document_id.in_(batch_ids),
                )
                .all()
            )
        return db_objs

    ### UPDATE OPERATIONS ###

    def update_timestamps(
        self, db: Session, *, project_id: int, ids: list[int]
    ) -> None:
        """
        Set the updated timestamp of annotation documents to now, in batches.

        Args:
            project_id: The project of the annotation documents.
            ids: The annotation documents.
        """
        if not ids:
            return

        updated = datetime.datetime.now(datetime.UTC)
        for i in range(0, len(ids), BATCH_SIZE):
            batch_ids = ids[i : i + BATCH_SIZE]
            db.execute(
                update(self.model)
                .where(
                    self.model.project_id == project_id,
                    self.model.id.in_(batch_ids),
                )
                .values(updated=updated)
            )
        db.flush()

    ### OTHER OPERATIONS ###

    def exists_or_create(
        self,
        db: Session,
        *,
        project_id: int,
        user_id: int,
        sdoc_id: int,
    ) -> AnnotationDocumentORM:
        return self.exists_or_create_multi(
            db=db, project_id=project_id, user_id=user_id, sdoc_ids=[sdoc_id]
        )[sdoc_id]

    def exists_or_create_multi(
        self,
        db: Session,
        *,
        project_id: int,
        user_id: int,
        sdoc_ids: list[int],
    ) -> dict[int, AnnotationDocumentORM]:
        """Return annotation documents for a user, creating missing rows in bulk.

        The rows are created in the project, so a document of another project (or
        one that does not exist) fails at the composite foreign key (409).

        Concurrent jobs (e.g. object detection and spacy of the same image) create the
        same annotation document, so a check-then-insert would race. ON CONFLICT DO
        NOTHING waits for the other transaction and skips the row if it committed.

        Args:
            project_id: The project of the documents.
            user_id: The user of the annotation documents.
            sdoc_ids: The documents. Duplicates are allowed.

        Returns:
            The annotation document by document id.

        Raises:
            AnnotationDocumentOfAnotherProjectError: If the user's annotation
                document of a document belongs to another project (409).
        """
        if not sdoc_ids:
            return {}

        unique_sdoc_ids = list(dict.fromkeys(sdoc_ids))
        annotation_documents: list[AnnotationDocumentORM] = []
        for i in range(0, len(unique_sdoc_ids), BATCH_SIZE):
            batch_ids = unique_sdoc_ids[i : i + BATCH_SIZE]
            db.execute(
                insert(self.model)
                .values(
                    [
                        {
                            "project_id": project_id,
                            "user_id": user_id,
                            "source_document_id": sdoc_id,
                        }
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
                    self.model.project_id == project_id,
                    self.model.user_id == user_id,
                    self.model.source_document_id.in_(batch_ids),
                )
                .all()
            )
        db.flush()

        # a document of another project that already has an annotation document of
        # the user is skipped by ON CONFLICT instead of failing at the foreign key
        adoc_by_sdoc_id = {
            annotation_document.source_document_id: annotation_document
            for annotation_document in annotation_documents
        }
        foreign_sdoc_ids = [id for id in unique_sdoc_ids if id not in adoc_by_sdoc_id]
        if foreign_sdoc_ids:
            raise AnnotationDocumentOfAnotherProjectError(
                project_id=project_id, sdoc_ids=foreign_sdoc_ids
            )
        return adoc_by_sdoc_id


crud_adoc = CRUDAnnotationDocument(AnnotationDocumentORM)
