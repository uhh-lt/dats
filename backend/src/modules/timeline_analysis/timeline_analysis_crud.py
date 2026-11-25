from sqlalchemy.orm import Session

from modules.timeline_analysis.timeline_analysis_dto import (
    TimelineAnalysisCreateIntern,
    TimelineAnalysisUpdateIntern,
)
from modules.timeline_analysis.timeline_analysis_enum import TimelineAnalysisType
from modules.timeline_analysis.timeline_analysis_orm import TimelineAnalysisORM
from repos.db.project_crud_base import ProjectCRUDBase


class CRUDTimelineAnalysis(
    ProjectCRUDBase[
        TimelineAnalysisORM, TimelineAnalysisCreateIntern, TimelineAnalysisUpdateIntern
    ]
):
    ### READ OPERATIONS ###

    def read_by_project(
        self, db: Session, *, project_id: int
    ) -> list[TimelineAnalysisORM]:
        db_obj = (
            db.query(self.model)
            .filter(
                self.model.project_id == project_id,
            )
            .all()
        )
        return db_obj

    ### OTHER OPERATIONS ###

    def duplicate_by_id(
        self, db: Session, *, project_id: int, timeline_analysis_id: int
    ) -> TimelineAnalysisORM:
        db_obj = self.read(db=db, project_id=project_id, id=timeline_analysis_id)
        return self.create(
            db=db,
            project_id=project_id,
            create_dto=TimelineAnalysisCreateIntern(
                name=db_obj.name + " (Copy)",
                concepts=db_obj.concepts,
                settings=db_obj.settings,
                timeline_analysis_type=TimelineAnalysisType(
                    db_obj.timeline_analysis_type
                ),
            ),
        )


crud_timeline_analysis = CRUDTimelineAnalysis(TimelineAnalysisORM)
