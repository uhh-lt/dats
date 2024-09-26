from typing import List, Optional

import srsly
from sqlalchemy.orm import Session

from app.core.data.crud.annotation_document import crud_adoc
from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.action import ActionType
from app.core.data.dto.bbox_annotation import (
    BBoxAnnotationCreate,
    BBoxAnnotationCreateIntern,
    BBoxAnnotationReadResolved,
    BBoxAnnotationUpdate,
)
from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.bbox_annotation import BBoxAnnotationORM


class CRUDBBoxAnnotation(
    CRUDBase[BBoxAnnotationORM, BBoxAnnotationCreateIntern, BBoxAnnotationUpdate]
):
    def create(
        self, db: Session, *, create_dto: BBoxAnnotationCreate
    ) -> BBoxAnnotationORM:
        # get or create the annotation document
        adoc = crud_adoc.exists_or_create(
            db=db, user_id=create_dto.user_id, sdoc_id=create_dto.sdoc_id
        )

        # create the BboxAnnotation
        db_obj = super().create(
            db=db,
            create_dto=BBoxAnnotationCreateIntern(
                x_min=create_dto.x_min,
                x_max=create_dto.x_max,
                y_min=create_dto.y_min,
                y_max=create_dto.y_max,
                code_id=create_dto.code_id,
                annotation_document_id=adoc.id,
            ),
        )

        # update the annotation document's timestamp
        crud_adoc.update_timestamp(db=db, id=adoc.id)

        return db_obj

    def read_by_user_and_sdoc(
        self,
        db: Session,
        *,
        user_id: int,
        sdoc_id: int,
    ) -> List[BBoxAnnotationORM]:
        query = (
            db.query(self.model)
            .join(self.model.annotation_document)
            .where(
                AnnotationDocumentORM.user_id == user_id,
                AnnotationDocumentORM.source_document_id == sdoc_id,
            )
        )

        return query.all()

    def read_by_users_and_sdoc(
        self,
        db: Session,
        *,
        user_ids: List[int],
        sdoc_id: int,
    ) -> List[BBoxAnnotationORM]:
        query = (
            db.query(self.model)
            .join(self.model.annotation_document)
            .where(
                AnnotationDocumentORM.user_id.in_(user_ids),
                AnnotationDocumentORM.source_document_id == sdoc_id,
            )
        )

        return query.all()

    def read_by_code_and_user(
        self, db: Session, *, code_id: int, user_id: int
    ) -> List[BBoxAnnotationORM]:
        query = (
            db.query(self.model)
            .join(self.model.annotation_document)
            .filter(
                self.model.code_id == code_id, AnnotationDocumentORM.user_id == user_id
            )
        )

        return query.all()

    def update(
        self, db: Session, *, id: int, update_dto: BBoxAnnotationUpdate
    ) -> BBoxAnnotationORM:
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
        # find all bbox annotations to be removed
        query = db.query(self.model).filter(
            self.model.annotation_document_id == adoc_id
        )
        removed_orms = query.all()
        ids = [removed_orm.id for removed_orm in removed_orms]

        # create actions
        for removed_orm in removed_orms:
            before_state = self._get_action_state_from_orm(removed_orm)
            self._create_action(
                db_obj=removed_orm,
                action_type=ActionType.DELETE,
                before_state=before_state,
            )

        # update the annotation document's timestamp
        from app.core.data.crud.annotation_document import crud_adoc

        crud_adoc.update_timestamp(db=db, id=adoc_id)

        # delete the bbox annotations
        query.delete()
        db.commit()

        return ids

    def _get_action_user_id_from_orm(self, db_obj: BBoxAnnotationORM) -> int:
        return db_obj.annotation_document.user_id

    def _get_action_state_from_orm(self, db_obj: BBoxAnnotationORM) -> Optional[str]:
        return srsly.json_dumps(
            BBoxAnnotationReadResolved.model_validate(db_obj).model_dump()
        )


crud_bbox_anno = CRUDBBoxAnnotation(BBoxAnnotationORM)
