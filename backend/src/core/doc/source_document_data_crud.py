from sqlalchemy.orm import Session, load_only

from core.doc.source_document_data_dto import (
    SourceDocumentDataCreate,
    SourceDocumentDataUpdate,
)
from core.doc.source_document_data_orm import SourceDocumentDataORM
from repos.db.crud_base import BATCH_SIZE, SQLCRUDBase


class CRUDSourceDocumentData(
    SQLCRUDBase[
        SourceDocumentDataORM,
        SourceDocumentDataCreate,
        SourceDocumentDataUpdate,
    ]
):
    ### READ OPERATIONS ###

    def read_columns_by_ids(
        self, db: Session, *, ids: list[int], columns: list[str]
    ) -> dict[int, SourceDocumentDataORM]:
        """
        Read some columns of the data of documents, in batches of `BATCH_SIZE`.

        Args:
            ids: The IDs of the source documents.
            columns: The columns to load; the others load when they are read.

        Returns:
            The document data by source document ID. Documents without data have
            no entry.
        """
        if not ids:
            return {}

        loaded = load_only(*(getattr(self.model, c) for c in columns))
        unique_ids = list(dict.fromkeys(ids))
        db_objs: dict[int, SourceDocumentDataORM] = {}
        for i in range(0, len(unique_ids), BATCH_SIZE):
            batch_ids = unique_ids[i : i + BATCH_SIZE]
            for db_obj in (
                db.query(self.model)
                .options(loaded)
                .filter(self.model.id.in_(batch_ids))
                .all()
            ):
                db_objs[db_obj.id] = db_obj
        return db_objs


crud_sdoc_data = CRUDSourceDocumentData(SourceDocumentDataORM)
