from sqlalchemy.orm import Session

from modules.concept_over_time_analysis.cota_dto import (
    COTACreateIntern,
    COTAUpdateIntern,
)
from modules.concept_over_time_analysis.cota_orm import (
    ConceptOverTimeAnalysisORM,
)
from repos.db.crud_base import CRUDBase


class CRUDConceptOverTimeAnalysis(
    CRUDBase[ConceptOverTimeAnalysisORM, COTACreateIntern, COTAUpdateIntern]
):
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

    def duplicate_by_id(
        self, db: Session, *, cota_id: int
    ) -> ConceptOverTimeAnalysisORM:
        db_obj = self.read(db, id=cota_id)
        return self.create(
            db,
            create_dto=COTACreateIntern(
                project_id=db_obj.project_id,
                name=db_obj.name + " (Copy)",
                concepts=db_obj.concepts,
                timeline_settings=db_obj.timeline_settings,
                training_settings=db_obj.training_settings,
            ),
        )


crud_cota = CRUDConceptOverTimeAnalysis(ConceptOverTimeAnalysisORM)
