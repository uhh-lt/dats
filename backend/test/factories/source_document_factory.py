from sqlalchemy.orm import Session

from common.doc_type import DocType
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_dto import SourceDocumentCreate
from core.doc.source_document_orm import SourceDocumentORM


class SourceDocumentFactory:
    def __init__(self, db_session: Session) -> None:
        self.db_session = db_session

    def create(
        self,
        create_dto: SourceDocumentCreate | None = None,
    ) -> SourceDocumentORM:
        if create_dto is None:
            create_dto = SourceDocumentCreate(
                filename="File Name",
                name="Source Document",
                doctype=DocType.text,
                project_id=1,
                folder_id=1,
            )
        return crud_sdoc.create(
            db=self.db_session,
            create_dto=create_dto,
        )
