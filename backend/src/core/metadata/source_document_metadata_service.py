from loguru import logger
from sqlalchemy.orm import Session

from common.singleton_meta import SingletonMeta
from core.metadata.source_document_metadata_crud import crud_sdoc_meta
from core.metadata.source_document_metadata_dto import (
    SourceDocumentMetadataRead,
    SourceDocumentMetadataUpdate,
    SourceDocumentMetadataUpdateBulk,
)


class SourceDocumentMetadataService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        return super(SourceDocumentMetadataService, cls).__new__(cls)

    def update(
        self, db: Session, *, id: int, update_dto: SourceDocumentMetadataUpdate
    ) -> SourceDocumentMetadataRead:
        """Like `update_multi`, for one metadata value."""
        return self.update_multi(
            db=db,
            update_dtos=[
                SourceDocumentMetadataUpdateBulk(
                    sdoc_metadata_id=id, **update_dto.model_dump()
                )
            ],
        )[0]

    def update_multi(
        self, db: Session, *, update_dtos: list[SourceDocumentMetadataUpdateBulk]
    ) -> list[SourceDocumentMetadataRead]:
        """
        Update user-editable source document metadata, each identified by its id.
        Read-only metadata is left unchanged (and logged).

        Args:
            update_dtos: The new values. Must not repeat an id.

        Returns:
            All given metadata (read-only ones unchanged), in the order of
            `update_dtos`.

        Raises:
            ValueError: If a value has the wrong type for its metadata key.
        """
        # 1) skip read-only metadata: only the system may change it
        metadatas = crud_sdoc_meta.read_by_ids(
            db=db, ids=[u.sdoc_metadata_id for u in update_dtos]
        )
        writable: list[SourceDocumentMetadataUpdateBulk] = []
        for metadata, update_dto in zip(metadatas, update_dtos):
            if metadata.project_metadata.read_only:
                logger.warning(
                    f"Cannot update read-only SourceDocumentMetadata {metadata.project_metadata.key} from"
                    f" SourceDocument {metadata.source_document_id}!"
                )
                continue
            writable.append(update_dto)

        # 2) update the writable ones
        crud_sdoc_meta.update_multi(
            db=db,
            ids=[u.sdoc_metadata_id for u in writable],
            update_dtos=[
                SourceDocumentMetadataUpdate(
                    **u.model_dump(exclude={"sdoc_metadata_id"})
                )
                for u in writable
            ],
        )

        return [
            SourceDocumentMetadataRead.model_validate(metadata)
            for metadata in metadatas
        ]
