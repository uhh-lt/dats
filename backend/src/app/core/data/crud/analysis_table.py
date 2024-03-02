from typing import List

from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.analysis_table import AnalysisTableCreate, AnalysisTableUpdate
from app.core.data.orm.analysis_table import AnalysisTableORM
from app.core.data.table_type import TableType


class CRUDAnalysisTable(
    CRUDBase[AnalysisTableORM, AnalysisTableCreate, AnalysisTableUpdate]
):
    def read_by_project_and_user(
        self, db: Session, *, project_id: int, user_id: int
    ) -> List[AnalysisTableORM]:
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
        self, db: Session, *, analysis_table_id: int, user_id: int
    ) -> AnalysisTableORM:
        db_obj = self.read(db, id=analysis_table_id)
        return self.create(
            db,
            create_dto=AnalysisTableCreate(
                project_id=db_obj.project_id,
                user_id=user_id,
                title=db_obj.title + " (Copy)",
                content=db_obj.content,
                table_type=TableType(db_obj.table_type),
            ),
        )


crud_analysis_table = CRUDAnalysisTable(AnalysisTableORM)
