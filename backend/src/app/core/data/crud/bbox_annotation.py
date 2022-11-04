from typing import List

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.core.data.action_service import ActionService
from app.core.data.crud.crud_base import CRUDBase
from app.core.data.crud.user import SYSTEM_USER_ID
from app.core.data.dto.action import ActionType, ActionTargetObjectType
from app.core.data.dto.bbox_annotation import BBoxAnnotationCreate, BBoxAnnotationUpdate
from app.core.data.orm.bbox_annotation import BBoxAnnotationORM


class CRUDBBoxAnnotation(CRUDBase[BBoxAnnotationORM, BBoxAnnotationCreate, BBoxAnnotationUpdate]):

    def read_by_adoc(self, db: Session, *, adoc_id: int, skip: int = 0, limit: int = 100) -> List[BBoxAnnotationORM]:
        return db.query(self.model).where(self.model.annotation_document_id == adoc_id).offset(skip).limit(limit).all()

    def remove_by_adoc(self, db: Session, *, adoc_id: int) -> List[int]:
        statement = delete(self.model).where(self.model.annotation_document_id == adoc_id).returning(self.model.id)
        removed_ids = db.execute(statement).fetchall()
        db.commit()
        removed_ids = list(map(lambda t: t[0], removed_ids))

        from app.core.data.crud.annotation_document import crud_adoc
        proj_id = crud_adoc.read(db=db, id=adoc_id).source_document.project_id

        for rid in removed_ids:
            ActionService().create_action(proj_id=proj_id,
                                          user_id=SYSTEM_USER_ID,
                                          action_type=ActionType.DELETE,
                                          target=ActionTargetObjectType.bbox_annotation,
                                          target_id=rid)
        return removed_ids


crud_bbox_anno = CRUDBBoxAnnotation(BBoxAnnotationORM)
