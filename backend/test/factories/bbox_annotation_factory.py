from sqlalchemy.orm import Session

from core.annotation.bbox_annotation_crud import crud_bbox_anno
from core.annotation.bbox_annotation_dto import BBoxAnnotationCreate
from core.annotation.bbox_annotation_orm import BBoxAnnotationORM


class BBoxAnnotationFactory:
    def __init__(self, db_session: Session):
        self.db_session = db_session

    def create(
        self,
        user_id: int,
        create_dto: BBoxAnnotationCreate | None = None,
    ) -> BBoxAnnotationORM:
        if create_dto is None:
            create_dto = BBoxAnnotationCreate(
                x_min=10,
                x_max=30,
                y_min=15,
                y_max=40,
                code_id=1,
                sdoc_id=1,
            )

        return crud_bbox_anno.create(
            db=self.db_session,
            create_dto=create_dto,
            user_id=user_id,
        )
