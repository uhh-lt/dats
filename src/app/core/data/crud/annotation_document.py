from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase, UpdateDTOType, ORMModelType
from app.core.data.dto.annotation_document import AnnotationDocumentCreate
from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.span_annotation import SpanAnnotationORM


class CRUDAnnotationDocument(CRUDBase[AnnotationDocumentORM, AnnotationDocumentCreate, None]):

    def update(self, db: Session, *, id: int, update_dto: UpdateDTOType) -> ORMModelType:
        # Flo: We no not want to update AnnotationDocument
        raise NotImplementedError()

    def remove_all_span_annotations(self, db: Session, *, id: int) -> AnnotationDocumentORM:
        db_obj = self.read(db=db, id=id)
        statement = delete(SpanAnnotationORM).where(SpanAnnotationORM.annotation_document_id == db_obj.id)
        db.execute(statement)
        db.commit()
        return db_obj


crud_adoc = CRUDAnnotationDocument(AnnotationDocumentORM)
