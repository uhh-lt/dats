from typing import List, Optional

from fastapi.encoders import jsonable_encoder
from preprocessing.preprocessing_job_payload_dto import (
    PreprocessingJobPayloadCreate,
    PreprocessingJobPayloadUpdate,
)
from preprocessing.preprocessing_job_payload_orm import PreprocessingJobPayloadORM
from repos.db.crud_base import CRUDBase, NoSuchElementError
from sqlalchemy.orm import Session
from systems.job_system.background_job_base_dto import BackgroundJobStatus


class CRUDPreprocessingJobPayload(
    CRUDBase[
        PreprocessingJobPayloadORM,
        PreprocessingJobPayloadCreate,
        PreprocessingJobPayloadUpdate,
    ]
):
    def read(self, db: Session, uuid: str) -> PreprocessingJobPayloadORM:
        db_obj = db.query(self.model).filter(self.model.id == uuid).first()
        if db_obj is None:
            raise NoSuchElementError(self.model, id=id)
        return db_obj

    def read_by_ids(
        self, db: Session, uuids: List[str]
    ) -> List[PreprocessingJobPayloadORM]:
        return db.query(self.model).filter(self.model.id.in_(uuids)).all()

    def read_by_ppj_id_and_status(
        self,
        db: Session,
        ppj_uuid: str,
        status: BackgroundJobStatus,
    ) -> List[PreprocessingJobPayloadORM]:
        return (
            db.query(self.model)
            .filter(
                self.model.prepro_job_id == ppj_uuid,
                self.model.status == str(status),
            )
            .all()
        )

    def read_ids_by_ppj_id_and_status(
        self,
        db: Session,
        ppj_uuid: str,
        status: BackgroundJobStatus,
    ) -> List[str]:
        res = (
            db.query(self.model.id)
            .filter(
                self.model.prepro_job_id == ppj_uuid,
                self.model.status == str(status),
            )
            .all()
        )
        return list(map(lambda r: str(r[0]), res))

    def update(
        self, db: Session, *, uuid: str, update_dto: PreprocessingJobPayloadUpdate
    ) -> Optional[PreprocessingJobPayloadORM]:
        db_obj = self.read(db=db, uuid=uuid)
        obj_data = jsonable_encoder(db_obj)
        update_data = update_dto.model_dump(exclude_unset=True)
        for field in obj_data:
            if field in update_data:
                setattr(db_obj, field, update_data[field])
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)

        return db_obj

    def remove(self, db: Session, *, uuid: str) -> PreprocessingJobPayloadORM:
        db_obj = self.read(db=db, uuid=uuid)
        db.delete(db_obj)
        db.commit()
        return db_obj


crud_prepro_job_payload = CRUDPreprocessingJobPayload(PreprocessingJobPayloadORM)
