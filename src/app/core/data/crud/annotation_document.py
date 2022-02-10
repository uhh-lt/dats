from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase, UpdateDTOType, ORMModelType
from app.core.data.dto.annotation_document import AnnotationDocumentCreate
from app.core.data.orm.annotation_document import AnnotationDocumentORM


class CRUDAnnotationDocument(CRUDBase[AnnotationDocumentORM, AnnotationDocumentCreate, None]):

    def update(self, db: Session, *, id: int, update_dto: UpdateDTOType) -> ORMModelType:
        # Flo: We no not want to update AnnotationDocument
        raise NotImplementedError()


crud_adoc = CRUDAnnotationDocument(AnnotationDocumentORM)
