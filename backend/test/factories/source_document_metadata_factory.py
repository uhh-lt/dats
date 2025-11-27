from sqlalchemy.orm import Session

from common.meta_type import MetaType
from core.metadata.source_document_metadata_crud import crud_sdoc_meta
from core.metadata.source_document_metadata_dto import SourceDocumentMetadataCreate
from core.metadata.source_document_metadata_orm import SourceDocumentMetadataORM


class SourceDocumentMetadataFactory:
    def __init__(self, db_session: Session):
        self.db_session = db_session

    def create(
        self, create_dto: SourceDocumentMetadataCreate | None = None
    ) -> SourceDocumentMetadataORM:
        if create_dto is None:
            create_dto = SourceDocumentMetadataCreate.with_metatype(
                source_document_id=1,
                project_metadata_id=1,
                metatype=MetaType.STRING,
                value="test",
            )

        return crud_sdoc_meta.create(db=self.db_session, create_dto=create_dto)
