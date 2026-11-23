"""The store of the artefacts kept in metadata values of a document
(`SourceDocumentMetadataORM`), the values of some project metadata keys."""

from collections.abc import Mapping

from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from core.metadata.source_document_metadata_crud import crud_sdoc_meta
from core.metadata.source_document_metadata_orm import SourceDocumentMetadataORM
from systems.artefact_system.artefact_exceptions import ForeignArtefactDataError
from systems.artefact_system.artefact_registry import ArtefactStore


class MetadataValue(ArtefactStore):
    """The values of some metadata keys of a document."""

    def __init__(self, *keys: str) -> None:
        self.keys = frozenset(keys)

    def owned(self) -> frozenset[str]:
        return frozenset(f"metadata key '{k}'" for k in self.keys)

    def read(self, db: Session, *, sdoc_id: int) -> SourceDocumentMetadataORM:
        """The document's value of the store's one key. Raises
        `NoSuchElementError` without one."""
        (key,) = self.keys
        return crud_sdoc_meta.read_by_sdoc_and_key(db=db, key=key, sdoc_id=sdoc_id)

    def read_by_project(
        self, db: Session, *, project_id: int
    ) -> list[SourceDocumentMetadataORM]:
        """The values of the store's one key of all documents of the project."""
        (key,) = self.keys
        return crud_sdoc_meta.read_by_project_and_key(
            db=db, project_id=project_id, key=key
        )

    def write(
        self,
        db: Session,
        *,
        project_id: int,
        sdoc_id: int,
        doctype: DocType,
        values: Mapping[str, object],
    ) -> None:
        """Write the values of the store's keys. Raises `ForeignArtefactDataError`
        for a key of another artefact."""
        foreign = sorted(set(values) - self.keys)
        if foreign:
            raise ForeignArtefactDataError([f"metadata key '{k}'" for k in foreign])
        crud_sdoc_meta.update_multi_with_doctype(
            db=db,
            project_id=project_id,
            sdoc_id=sdoc_id,
            doctype=doctype,
            keys=list(values),
            values=list(values.values()),
        )
