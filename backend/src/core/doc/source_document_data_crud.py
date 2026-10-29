from sqlalchemy import select
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

    def read_offsets_by_ids(
        self, db: Session, *, ids: list[int]
    ) -> dict[int, SourceDocumentDataORM]:
        """
        Read the token and sentence offsets of documents, without their texts
        (content, html, raw html), in batches of `BATCH_SIZE`.

        Args:
            ids: The IDs of the source documents.

        Returns:
            The document data by source document ID, with only `token_starts`,
            `token_ends`, `sentence_starts` and `sentence_ends` loaded. Documents
            without data have no entry.
        """
        if not ids:
            return {}

        unique_ids = list(dict.fromkeys(ids))
        db_objs: dict[int, SourceDocumentDataORM] = {}
        for i in range(0, len(unique_ids), BATCH_SIZE):
            batch_ids = unique_ids[i : i + BATCH_SIZE]
            for db_obj in (
                db.query(self.model)
                .options(
                    load_only(
                        self.model.token_starts,
                        self.model.token_ends,
                        self.model.sentence_starts,
                        self.model.sentence_ends,
                    )
                )
                .filter(self.model.id.in_(batch_ids))
                .all()
            ):
                db_objs[db_obj.id] = db_obj
        return db_objs

    def read_contents_by_ids(self, db: Session, *, ids: list[int]) -> dict[int, str]:
        """
        Read the plain text content of documents, in batches of `BATCH_SIZE`.

        Args:
            ids: The IDs of the source documents.

        Returns:
            The content by source document ID. Documents without data have no entry.
        """
        if not ids:
            return {}

        unique_ids = list(dict.fromkeys(ids))
        contents: dict[int, str] = {}
        for i in range(0, len(unique_ids), BATCH_SIZE):
            batch_ids = unique_ids[i : i + BATCH_SIZE]
            for id, content in db.execute(
                select(self.model.id, self.model.content).where(
                    self.model.id.in_(batch_ids)
                )
            ):
                contents[id] = content
        return contents


crud_sdoc_data = CRUDSourceDocumentData(SourceDocumentDataORM)
