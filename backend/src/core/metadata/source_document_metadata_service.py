from sqlalchemy.orm import Session

from common.singleton_meta import SingletonMeta
from core.metadata.metadata_exceptions import ReadOnlyMetadataError
from core.metadata.source_document_metadata_crud import crud_sdoc_meta
from core.metadata.source_document_metadata_dto import (
    SourceDocumentMetadataRead,
    SourceDocumentMetadataUpdate,
    SourceDocumentMetadataUpdateBulk,
)
from core.metadata.source_document_metadata_orm import SourceDocumentMetadataORM


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

        Args:
            update_dtos: The new values. Must not repeat an id.

        Returns:
            The updated metadata, in the order of `update_dtos`.

        Raises:
            ReadOnlyMetadataError: If any metadata is read-only.
            ValueError: If a value has the wrong type for its metadata key.
        """
        # 1) only the system may change read-only metadata (doc processing fills it)
        metadatas = crud_sdoc_meta.read_by_ids(
            db=db, ids=[u.sdoc_metadata_id for u in update_dtos]
        )
        self._assert_writable(metadatas)

        # 2) update them
        crud_sdoc_meta.update_multi(
            db=db,
            ids=[u.sdoc_metadata_id for u in update_dtos],
            update_dtos=[
                SourceDocumentMetadataUpdate(
                    **u.model_dump(exclude={"sdoc_metadata_id"})
                )
                for u in update_dtos
            ],
        )

        return [
            SourceDocumentMetadataRead.model_validate(metadata)
            for metadata in metadatas
        ]

    def delete(self, db: Session, *, id: int) -> SourceDocumentMetadataRead:
        """
        Delete a user-editable source document metadata value.

        Returns:
            The deleted metadata as it was before the deletion.

        Raises:
            ReadOnlyMetadataError: If the metadata is read-only.
        """
        # 1) only the system may delete read-only metadata (doc processing fills it)
        metadata = crud_sdoc_meta.read(db=db, id=id)
        self._assert_writable([metadata])
        deleted = SourceDocumentMetadataRead.model_validate(metadata)

        # 2) delete it
        crud_sdoc_meta.delete(db=db, id=id)

        return deleted

    def _assert_writable(self, metadatas: list[SourceDocumentMetadataORM]) -> None:
        read_only_keys = list(
            dict.fromkeys(
                m.project_metadata.key
                for m in metadatas
                if m.project_metadata.read_only
            )
        )
        if read_only_keys:
            raise ReadOnlyMetadataError(read_only_keys)
