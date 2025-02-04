from typing import List

from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase, NoSuchElementError
from app.core.data.dto.concept_over_time_analysis import (
    COTACreateIntern,
    COTAUpdateIntern,
)
from app.core.data.orm.concept_over_time_analysis import ConceptOverTimeAnalysisORM


class CRUDConceptOverTimeAnalysis(
    CRUDBase[ConceptOverTimeAnalysisORM, COTACreateIntern, COTAUpdateIntern]
):
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
