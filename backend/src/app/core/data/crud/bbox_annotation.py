from typing import List

import srsly
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
        dto_obj_data = jsonable_encoder(create_dto.dict())
        # noinspection PyArgumentList
        db_obj = self.model(**dto_obj_data)
        db.add(db_obj)
        db.commit()

        db.refresh(db_obj)

        # update the annotation document's timestamp
        crud_adoc.update_timestamp(db=db, id=create_dto.annotation_document_id)

        # create action manually because we're not using crud base create
        from app.core.data.crud.action import crud_action

        action_create_dto = ActionCreate(
            project_id=db_obj.annotation_document.source_document.project_id,
            user_id=SYSTEM_USER_ID,  # FIXME use correct user
            action_type=ActionType.CREATE,
            target_type=ActionTargetObjectType.span_annotation,
            target_id=db_obj.id,
            before_state=None,
            after_state=srsly.json_dumps(db_obj.as_dict()),
        )
        crud_action.create(db=db, create_dto=action_create_dto)

        return db_obj

    def create_multi(
        self, db: Session, *, create_dtos: List[BBoxAnnotationCreate]
    ) -> List[BBoxAnnotationORM]:
        # create the BboxAnnotation
        dto_objs_data = [
            jsonable_encoder(create_dto.dict()) for create_dto in create_dtos
        ]
        # noinspection PyArgumentList
        db_objs = [self.model(**dto_obj_data) for dto_obj_data in dto_objs_data]
        db.add_all(db_objs)
        db.commit()

        # update all affected annotation documents' timestamp
        adoc_ids = list(
            set([create_dto.annotation_document_id for create_dto in create_dtos])
        )
        for adoc_id in adoc_ids:
            crud_adoc.update_timestamp(db=db, id=adoc_id)

        # we do not create actions manually here: why?

        return db_objs

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

        return removed_ids


crud_bbox_anno = CRUDBBoxAnnotation(BBoxAnnotationORM)
