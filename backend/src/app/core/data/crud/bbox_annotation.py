from typing import List, Optional

import srsly
from sqlalchemy.orm import Session

from app.core.data.crud.annotation_document import crud_adoc
from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.action import ActionType
from app.core.data.dto.bbox_annotation import (
    BBoxAnnotationCreate,
    BBoxAnnotationCreateWithCodeId,
    BBoxAnnotationRead,
    BBoxAnnotationReadResolvedCode,
    BBoxAnnotationUpdate,
    BBoxAnnotationUpdateWithCodeId,
)
from app.core.data.dto.code import CodeRead
from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.bbox_annotation import BBoxAnnotationORM
from app.core.data.orm.code import CodeORM, CurrentCodeORM


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

    def create_with_code_id(
        self, db: Session, *, create_dto: BBoxAnnotationCreateWithCodeId
    ) -> BBoxAnnotationORM:
        from app.core.data.crud.code import crud_code

        db_code = crud_code.read(db=db, id=create_dto.code_id)
        ccid = db_code.current_code.id

        create_dto_with_ccid = BBoxAnnotationCreate(
            x_min=create_dto.x_min,
            x_max=create_dto.x_max,
            y_min=create_dto.y_min,
            y_max=create_dto.y_max,
            current_code_id=ccid,
            annotation_document_id=create_dto.annotation_document_id,
        )

        return self.create(db=db, create_dto=create_dto_with_ccid)

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

    def read_by_code_and_user(
        self, db: Session, *, code_id: int, user_id: int
    ) -> List[BBoxAnnotationORM]:
        query = (
            db.query(self.model)
            .join(AnnotationDocumentORM)
            .join(CurrentCodeORM)
            .join(CodeORM)
            .filter(CodeORM.id == code_id, AnnotationDocumentORM.user_id == user_id)
        )

        return query.all()

    def update(
        self, db: Session, *, id: int, update_dto: BBoxAnnotationUpdate
    ) -> Optional[BBoxAnnotationORM]:
        bbox_anno = super().update(db, id=id, update_dto=update_dto)
        # update the annotation document's timestamp
        crud_adoc.update_timestamp(db=db, id=bbox_anno.annotation_document_id)

        return bbox_anno

    def update_with_code_id(
        self, db: Session, *, id: int, update_dto: BBoxAnnotationUpdateWithCodeId
    ) -> BBoxAnnotationORM:
        from app.core.data.crud.code import crud_code

        db_code = crud_code.read(db=db, id=update_dto.code_id)
        ccid = db_code.current_code.id

        update_dto_with_ccid = BBoxAnnotationUpdate(
            current_code_id=ccid,
        )

        return self.update(db=db, id=id, update_dto=update_dto_with_ccid)

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
            BBoxAnnotationReadResolvedCode(
                **BBoxAnnotationRead.model_validate(db_obj).model_dump(
                    exclude={"current_code_id"}
                ),
                code=CodeRead.model_validate(db_obj.current_code.code),
                user_id=db_obj.annotation_document.user_id,
                sdoc_id=db_obj.annotation_document.source_document_id,
            ).model_dump()
        )


crud_bbox_anno = CRUDBBoxAnnotation(BBoxAnnotationORM)
