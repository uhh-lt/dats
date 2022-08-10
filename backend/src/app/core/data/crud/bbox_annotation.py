from typing import List

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.bbox_annotation import BBoxAnnotationCreate, BBoxAnnotationUpdate
from app.core.data.orm.bbox_annotation import BBoxAnnotationORM


class CRUDBBoxAnnotation(CRUDBase[BBoxAnnotationORM, BBoxAnnotationCreate, BBoxAnnotationUpdate]):

    def read_by_adoc(self, db: Session, *, adoc_id: int, skip: int = 0, limit: int = 100) -> List[BBoxAnnotationORM]:
        return db.query(self.model).where(self.model.annotation_document_id == adoc_id).offset(skip).limit(limit).all()

    def remove_by_adoc(self, db: Session, *, adoc_id: int) -> List[int]:
        statement = delete(self.model).where(self.model.annotation_document_id == adoc_id).returning(self.model.id)
        removed_ids = db.execute(statement).fetchall()
        db.commit()
        return list(map(lambda t: t[0], removed_ids))


crud_bbox_anno = CRUDBBoxAnnotation(BBoxAnnotationORM)
