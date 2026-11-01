from sqlalchemy.orm import Session, selectinload
from sqlalchemy.sql.base import ExecutableOption

from modules.experiment.experiment_dto import ExperimentCreate, ExperimentUpdate
from modules.experiment.experiment_orm import ExperimentORM
from repos.db.crud_base import SQLCRUDBase


class CRUDExperiment(SQLCRUDBase[ExperimentORM, ExperimentCreate, ExperimentUpdate]):
    ### READ OPERATIONS ###

    def read_by_project(self, db: Session, *, project_id: int) -> list[ExperimentORM]:
        """
        Read all experiments of a project.

        Args:
            project_id: The ID of the project.

        Returns:
            The experiments of the project, newest first.
        """
        return (
            db.query(self.model)
            .options(*self._load_options())
            .filter(self.model.project_id == project_id)
            .order_by(self.model.created.desc(), self.model.id.desc())
            .all()
        )

    ### LOADING ###

    def _load_options(self) -> list[ExecutableOption]:
        # the Read DTO lists all runs
        return [selectinload(self.model.runs)]


crud_experiment = CRUDExperiment(ExperimentORM)
