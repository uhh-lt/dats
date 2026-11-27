from sqlalchemy.orm import Session

from modules.concept_over_time_analysis.cota_dto import (
    ConceptOverTimeAnalysisCreateIntern,
    ConceptOverTimeAnalysisUpdateIntern,
)
from modules.concept_over_time_analysis.cota_orm import (
    ConceptOverTimeAnalysisORM,
)
from repos.db.project_crud_base import ProjectCRUDBase


class CRUDConceptOverTimeAnalysis(
    ProjectCRUDBase[
        ConceptOverTimeAnalysisORM,
        ConceptOverTimeAnalysisCreateIntern,
        ConceptOverTimeAnalysisUpdateIntern,
    ]
):
    ### READ OPERATIONS ###

    def read_by_project(
        self, db: Session, *, project_id: int
    ) -> list[ConceptOverTimeAnalysisORM]:
        db_objs = (
            db.query(self.model)
            .filter(
                self.model.project_id == project_id,
            )
            .all()
        )
        return db_objs

    ### OTHER OPERATIONS ###

    def duplicate_by_id(
        self, db: Session, *, project_id: int, cota_id: int
    ) -> ConceptOverTimeAnalysisORM:
        db_obj = self.read(db=db, project_id=project_id, id=cota_id)
        return self.create(
            db=db,
            project_id=project_id,
            create_dto=ConceptOverTimeAnalysisCreateIntern(
                name=db_obj.name + " (Copy)",
                concepts=db_obj.concepts,
                timeline_settings=db_obj.timeline_settings,
                training_settings=db_obj.training_settings,
            ),
        )


crud_cota = CRUDConceptOverTimeAnalysis(ConceptOverTimeAnalysisORM)
