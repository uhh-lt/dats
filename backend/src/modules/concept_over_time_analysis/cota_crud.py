from typing import List

from modules.concept_over_time_analysis.cota_dto import (
    COTACreateIntern,
    COTAUpdateIntern,
)
from modules.concept_over_time_analysis.cota_orm import (
    ConceptOverTimeAnalysisORM,
)
from repos.db.crud_base import CRUDBase, NoSuchElementError
from sqlalchemy.orm import Session


class CRUDConceptOverTimeAnalysis(
    CRUDBase[ConceptOverTimeAnalysisORM, COTACreateIntern, COTAUpdateIntern]
):
    def read_by_project(
        self, db: Session, *, project_id: int
    ) -> List[ConceptOverTimeAnalysisORM]:
        db_objs = (
            db.query(self.model)
            .filter(
                self.model.project_id == project_id,
            )
            .all()
        )
        return db_objs

    def read_by_project_and_user(
        self, db: Session, *, project_id: int, user_id: int, raise_error: bool = True
    ) -> List[ConceptOverTimeAnalysisORM]:
        db_obj = (
            db.query(self.model)
            .filter(
                self.model.project_id == project_id,
                self.model.user_id == user_id,
            )
            .all()
        )
        if raise_error and not db_obj:
            raise NoSuchElementError(self.model, project_id=project_id, user_id=user_id)
        return db_obj

    def duplicate_by_id(
        self, db: Session, *, cota_id: int, user_id: int
    ) -> ConceptOverTimeAnalysisORM:
        db_obj = self.read(db, id=cota_id)
        return self.create(
            db,
            create_dto=COTACreateIntern(
                project_id=db_obj.project_id,
                user_id=user_id,
                name=db_obj.name + " (Copy)",
                concepts=db_obj.concepts,
                timeline_settings=db_obj.timeline_settings,
                training_settings=db_obj.training_settings,
            ),
        )


crud_cota = CRUDConceptOverTimeAnalysis(ConceptOverTimeAnalysisORM)


crud_cota = CRUDConceptOverTimeAnalysis(ConceptOverTimeAnalysisORM)

crud_cota = CRUDConceptOverTimeAnalysis(ConceptOverTimeAnalysisORM)
