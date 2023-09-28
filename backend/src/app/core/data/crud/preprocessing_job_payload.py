from typing import List, Optional

from app.core.data.crud.crud_base import CRUDBase, NoSuchElementError
from app.core.data.dto.preprocessing_job_payload import (
    PreprocessingJobPayloadCreate,
    PreprocessingJobPayloadUpdate,
)
from app.core.data.orm.preprocessing_job_payload import PreprocessingJobPayloadORM
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session


class CRUDPreprocessingJobPayload(
    CRUDBase[
        PreprocessingJobPayloadORM,
        PreprocessingJobPayloadCreate,
        PreprocessingJobPayloadUpdate,
    ]
):
    def read(self, db: Session, uuid: str) -> PreprocessingJobPayloadORM:
        db_obj = db.query(self.model).filter(self.model.id == uuid).first()
        if not db_obj:
            raise NoSuchElementError(self.model, id=id)
        return db_obj

    def read_by_ids(
        self, db: Session, uuids: List[str]
    ) -> List[PreprocessingJobPayloadORM]:
        return db.query(self.model).filter(self.model.id.in_(uuids)).all()

    def update(
        self, db: Session, *, uuid: str, update_dto: PreprocessingJobPayloadUpdate
    ) -> Optional[PreprocessingJobPayloadORM]:
        db_obj = self.read(db=db, uuid=uuid)
        obj_data = jsonable_encoder(db_obj)
        update_data = update_dto.dict(exclude_unset=True)
        for field in obj_data:
            if field in update_data:
                setattr(db_obj, field, update_data[field])
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)

        return db_obj

    def remove(self, db: Session, *, uuid: str) -> PreprocessingJobPayloadORM:
        db_obj = self.read(db=db, uuid=uuid)
        # delete the ORM after the action created so that we can read its ID
        db.delete(db_obj)
        db.commit()
        return db_obj


crud_prepro_job_payload = CRUDPreprocessingJobPayload(PreprocessingJobPayloadORM)
