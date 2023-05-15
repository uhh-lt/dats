from typing import List, Optional

from app.core.data.crud.annotation_document import crud_adoc
from app.core.data.crud.crud_base import CRUDBase
from app.core.data.crud.user import SYSTEM_USER_ID
from app.core.data.dto.action import ActionCreate, ActionTargetObjectType, ActionType
from app.core.data.dto.bbox_annotation import BBoxAnnotationCreate, BBoxAnnotationUpdate
from app.core.data.orm.bbox_annotation import BBoxAnnotationORM
from fastapi.encoders import jsonable_encoder
from sqlalchemy import delete
from sqlalchemy.orm import Session


class CRUDBBoxAnnotation(
    CRUDBase[BBoxAnnotationORM, BBoxAnnotationCreate, BBoxAnnotationUpdate]
):
    def create(
        self, db: Session, *, create_dto: BBoxAnnotationCreate
    ) -> BBoxAnnotationORM:
        # create the BboxAnnotation
        db_obj = super().create(db=db, create_dto=create_dto)

        # update the annotation document's timestamp
        crud_adoc.update_timestamp(db=db, id=create_dto.annotation_document_id)

        return db_obj

    def read_by_adoc(
        self, db: Session, *, adoc_id: int, skip: int = 0, limit: int = 100
    ) -> List[BBoxAnnotationORM]:
        return (
            db.query(self.model)
            .where(self.model.annotation_document_id == adoc_id)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def update(
        self, db: Session, *, id: int, update_dto: BBoxAnnotationUpdate
    ) -> Optional[BBoxAnnotationORM]:
        bbox_anno = super().update(db, id=id, update_dto=update_dto)
        # update the annotation document's timestamp
        crud_adoc.update_timestamp(db=db, id=bbox_anno.annotation_document_id)

        return bbox_anno

    def remove(self, db: Session, *, id: int) -> Optional[BBoxAnnotationORM]:
        bbox_anno = super().remove(db, id=id)
        # update the annotation document's timestamp
        crud_adoc.update_timestamp(db=db, id=bbox_anno.annotation_document_id)

        return bbox_anno

    def remove_by_adoc(self, db: Session, *, adoc_id: int) -> List[int]:
        statement = (
            delete(self.model)
            .where(self.model.annotation_document_id == adoc_id)
            .returning(self.model.id)
        )
        removed_ids = db.execute(statement).fetchall()
        db.commit()
        removed_ids = list(map(lambda t: t[0], removed_ids))

        from app.core.data.crud.annotation_document import crud_adoc

        proj_id = crud_adoc.read(db=db, id=adoc_id).source_document.project_id

        from app.core.data.crud.action import crud_action

        for rid in removed_ids:
            create_dto = ActionCreate(
                project_id=proj_id,
                user_id=SYSTEM_USER_ID,
                action_type=ActionType.DELETE,
                target_type=ActionTargetObjectType.bbox_annotation,
                target_id=rid,
                before_state="",  # FIXME: use the removed objects JSON
                after_state=None,
            )
            crud_action.create(db=db, create_dto=create_dto)

        # update the annotation document's timestamp
        crud_adoc.update_timestamp(db=db, id=adoc_id)

        return removed_ids


crud_bbox_anno = CRUDBBoxAnnotation(BBoxAnnotationORM)
