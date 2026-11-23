"""The store of the artefacts kept in columns of a document's data row
(`SourceDocumentDataORM`); the only user of `crud_sdoc_data`."""

from collections.abc import Sequence

from sqlalchemy.orm import Session

from core.doc.source_document_data_crud import crud_sdoc_data
from core.doc.source_document_data_dto import (
    SourceDocumentDataCreate,
    SourceDocumentDataUpdate,
)
from core.doc.source_document_data_orm import SourceDocumentDataORM
from systems.artefact_system.artefact_exceptions import ForeignArtefactDataError
from systems.artefact_system.artefact_registry import ArtefactStore

# the columns of the data row an artefact can own
COLUMNS = frozenset(
    c.key for c in SourceDocumentDataORM.__table__.columns if c.key != "id"
)


class DocumentData(ArtefactStore):
    """Some columns of the document's data row."""

    def __init__(self, *columns: str) -> None:
        unknown = sorted(set(columns) - COLUMNS)
        if unknown:
            raise ValueError(f"The document data has no columns {unknown}.")
        self.columns = frozenset(columns)

    def owned(self) -> frozenset[str]:
        return frozenset(f"document data column '{c}'" for c in self.columns)

    def read(self, db: Session, *, sdoc_id: int) -> SourceDocumentDataORM:
        """The document's data row. Raises `NoSuchElementError` without one."""
        return crud_sdoc_data.read(db=db, id=sdoc_id)

    def read_many(
        self,
        db: Session,
        *,
        sdoc_ids: list[int],
        with_stores: Sequence["DocumentData"] = (),
    ) -> dict[int, SourceDocumentDataORM]:
        """The data rows of the documents by id, with the columns of this store
        and of `with_stores` loaded (e.g. the content that token offsets point
        into; others load when they are read); documents without one have no
        entry."""
        columns = self.columns.union(*(store.columns for store in with_stores))
        return crud_sdoc_data.read_columns_by_ids(
            db=db, ids=sdoc_ids, columns=sorted(columns)
        )

    def write(
        self, db: Session, *, sdoc_id: int, update: SourceDocumentDataUpdate
    ) -> None:
        """Write the store's columns that `update` sets. Raises
        `ForeignArtefactDataError` if it sets a column of another artefact."""
        foreign = sorted(update.model_fields_set - self.columns)
        if foreign:
            raise ForeignArtefactDataError(
                [f"document data column '{c}'" for c in foreign]
            )
        crud_sdoc_data.update(db=db, id=sdoc_id, update_dto=update)


def create_document_data(
    db: Session, *, create_dto: SourceDocumentDataCreate
) -> SourceDocumentDataORM:
    """Create the data row of a new document: empty at the upload, with the
    archived data at the import."""
    return crud_sdoc_data.create(db=db, create_dto=create_dto)
