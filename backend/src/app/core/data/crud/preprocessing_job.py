from typing import List, Optional

from fastapi.encoders import jsonable_encoder
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase, NoSuchElementError
from app.core.data.crud.preprocessing_job_payload import crud_prepro_job_payload
from app.core.data.dto.background_job_base import BackgroundJobStatus
from app.core.data.dto.preprocessing_job import (
    PreprocessingJobCreate,
    PreprocessingJobUpdate,
)
from app.core.data.dto.preprocessing_job_payload import PreprocessingJobPayloadCreate
from app.core.data.orm.preprocessing_job import PreprocessingJobORM


class CRUDPreprocessingJob(
    CRUDBase[PreprocessingJobORM, PreprocessingJobCreate, PreprocessingJobUpdate]
):
    def read(self, db: Session, uuid: str) -> PreprocessingJobORM:
        db_obj = db.query(self.model).filter(self.model.id == uuid).first()
        if db_obj is None:
            raise NoSuchElementError(self.model, id=id)
        return db_obj

    def read_by_ids(self, db: Session, uuids: List[str]) -> List[PreprocessingJobORM]:
        return db.query(self.model).filter(self.model.id.in_(uuids)).all()

    def read_by_proj_id(self, db: Session, proj_id: int) -> List[PreprocessingJobORM]:
        return db.query(self.model).filter(self.model.project_id == proj_id).all()

    def read_ids_by_proj_id(self, db: Session, proj_id: int) -> List[str]:
        res = db.query(self.model.id).filter(self.model.project_id == proj_id).all()
        if res is None or len(res) == 0:
            return []
        return list(map(lambda r: str(r[0]), res))

    def read_ids_by_proj_id_and_status(
        self, db: Session, proj_id: int, status: BackgroundJobStatus
    ) -> List[str]:
        res = (
            db.query(self.model.id)
            .filter(self.model.project_id == proj_id, self.model.status == str(status))
            .all()
        )
        if res is None or len(res) == 0:
            return []
        return list(map(lambda r: str(r[0]), res))

    def get_status_by_id(self, db: Session, uuid: str) -> BackgroundJobStatus:
        db_str_obj = db.query(self.model.status).filter(self.model.id == uuid).scalar()
        if not db_str_obj:
            raise NoSuchElementError(self.model, id=id)
        return BackgroundJobStatus(db_str_obj)

    def get_number_of_running_or_waiting_payloads(self, db: Session, uuid: str) -> int:
        from app.core.data.orm.preprocessing_job_payload import (
            PreprocessingJobPayloadORM,
        )

        # SELECT COUNT(ppjp)
        #  FROM preprocessingjob ppj
        #  JOIN preprocessingjobpayload ppjp ON ppj.id = ppjp.prepro_job_id
        #  WHERE ppj.status = 'Running' OR ppj.status = 'Waiting'

        query = (
            db.query(func.count(self.model.id))
            .join(
                PreprocessingJobPayloadORM,
                self.model.id == PreprocessingJobPayloadORM.prepro_job_id,
            )
            .filter(
                and_(
                    self.model.id == uuid,
                    or_(
                        self.model.status == BackgroundJobStatus.RUNNING.value,
                        self.model.status == BackgroundJobStatus.WAITING.value,
                    ),
                )
            )
        )

        return query.scalar()

    def create(
        self, db: Session, *, create_dto: PreprocessingJobCreate
    ) -> PreprocessingJobORM:
        # first create the preprocessing job with an empty list of payloads
        dto_obj_data = jsonable_encoder(create_dto, exclude={"payloads"})
        db_obj = self.model(**dto_obj_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        # second set the preprocessing job id for each payload
        create_dtos = [
            PreprocessingJobPayloadCreate(
                **payload.model_dump(), prepro_job_id=db_obj.id
            )
            for payload in create_dto.payloads
        ]

        # third create the payloads
        crud_prepro_job_payload.create_multi(db=db, create_dtos=create_dtos)

        db.refresh(db_obj)

        return db_obj

    def create_multi(
        self, db: Session, *, create_dtos: List[PreprocessingJobCreate]
    ) -> List[PreprocessingJobORM]:
        raise NotImplementedError()

    def update(
        self, db: Session, *, uuid: str, update_dto: PreprocessingJobUpdate
    ) -> Optional[PreprocessingJobORM]:
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

    def remove(self, db: Session, *, uuid: str) -> PreprocessingJobORM:
        db_obj = self.read(db=db, uuid=uuid)
        # delete the ORM after the action created so that we can read its ID
        db.delete(db_obj)
        db.commit()
        return db_obj


crud_prepro_job = CRUDPreprocessingJob(PreprocessingJobORM)
