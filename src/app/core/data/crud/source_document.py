from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase, UpdateDTOType, ORMModelType
from app.core.data.dto.source_document import SourceDocumentCreate
from app.core.data.orm.source_document import SourceDocumentORM


class CRUDSourceDocument(CRUDBase[SourceDocumentORM, SourceDocumentCreate, None]):

    def update(self, db: Session, *, id: int, update_dto: UpdateDTOType) -> ORMModelType:
        # Flo: We no not want to update SourceDocument
        raise NotImplementedError()


crud_sdoc = CRUDSourceDocument(SourceDocumentORM)
