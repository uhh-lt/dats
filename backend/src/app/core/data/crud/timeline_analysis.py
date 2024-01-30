from typing import List

import srsly
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.timeline_analysis import (
    TimelineAnalysisCreate,
    TimelineAnalysisRead,
    TimelineAnalysisUpdate,
    TimelineAnalysisUpdateAsInDB,
)
from app.core.data.orm.timeline_analysis import TimelineAnalysisORM


class CRUDTimelineAnalysis(
    CRUDBase[TimelineAnalysisORM, TimelineAnalysisCreate, TimelineAnalysisUpdateAsInDB]
):
    def read_by_project_and_user(
        self, db: Session, *, project_id: int, user_id: int
    ) -> List[TimelineAnalysisORM]:
        db_obj = (
            db.query(self.model)
            .filter(
                self.model.project_id == project_id,
                self.model.user_id == user_id,
            )
            .all()
        )
        return db_obj

    def update(self, db: Session, id: int, update_dto: TimelineAnalysisUpdate):
        # make sure that analysis with id exists
        self.read(db=db, id=id)

        update_dto_as_in_db = TimelineAnalysisUpdateAsInDB(
            **update_dto.model_dump(
                exclude={
                    "concepts",
                    "settings",
                },
                exclude_none=True,
            ),
        )

        if update_dto.concepts is not None:
            concepts_str = srsly.json_dumps(jsonable_encoder(update_dto.concepts))
            update_dto_as_in_db.concepts = concepts_str

        if update_dto.settings is not None:
            timeline_settings_str = srsly.json_dumps(
                jsonable_encoder(update_dto.settings)
            )
            update_dto_as_in_db.settings = timeline_settings_str

        # update the in db
        db_obj = super().update(db=db, id=id, update_dto=update_dto_as_in_db)

        # return the results
        return TimelineAnalysisRead.model_validate(db_obj)


crud_timeline_analysis = CRUDTimelineAnalysis(TimelineAnalysisORM)
