from typing import List

from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.timeline_analysis import (
    TimelineAnalysisCreateIntern,
    TimelineAnalysisType,
    TimelineAnalysisUpdateIntern,
)
from app.core.data.orm.timeline_analysis import TimelineAnalysisORM


class CRUDTimelineAnalysis(
    CRUDBase[
        TimelineAnalysisORM, TimelineAnalysisCreateIntern, TimelineAnalysisUpdateIntern
    ]
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

    def duplicate_by_id(
        self, db: Session, *, timeline_analysis_id: int, user_id: int
    ) -> TimelineAnalysisORM:
        db_obj = self.read(db, id=timeline_analysis_id)
        return self.create(
            db,
            create_dto=TimelineAnalysisCreateIntern(
                project_id=db_obj.project_id,
                user_id=user_id,
                name=db_obj.name + " (Copy)",
                concepts=db_obj.concepts,
                settings=db_obj.settings,
                timeline_analysis_type=TimelineAnalysisType(
                    db_obj.timeline_analysis_type
                ),
            ),
        )


crud_timeline_analysis = CRUDTimelineAnalysis(TimelineAnalysisORM)
