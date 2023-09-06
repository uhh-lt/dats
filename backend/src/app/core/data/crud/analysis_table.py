from typing import List

from app.core.data.crud.crud_base import CRUDBase, NoSuchElementError
from app.core.data.dto.analysis_table import AnalysisTableCreate, AnalysisTableUpdate
from app.core.data.orm.analysis_table import AnalysisTableORM
from sqlalchemy.orm import Session


class CRUDAnalysisTable(
    CRUDBase[AnalysisTableORM, AnalysisTableCreate, AnalysisTableUpdate]
):
    def read_by_project_and_user(
        self, db: Session, *, project_id: int, user_id: int, raise_error: bool = True
    ) -> List[AnalysisTableORM]:
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


crud_analysis_table = CRUDAnalysisTable(AnalysisTableORM)
