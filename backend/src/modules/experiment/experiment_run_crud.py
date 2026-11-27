from sqlalchemy.orm import Session

from modules.experiment.experiment_orm import ExperimentRunORM
from modules.experiment.experiment_run_dto import (
    ExperimentRunCreateIntern,
    ExperimentRunUpdateIntern,
)
from repos.db.project_crud_base import ProjectCRUDBase
from repos.db.sql_exceptions import NoSuchElementError


class CRUDExperimentRun(
    ProjectCRUDBase[
        ExperimentRunORM, ExperimentRunCreateIntern, ExperimentRunUpdateIntern
    ]
):
    ### READ OPERATIONS ###

    def read_by_experiment(
        self, db: Session, *, project_id: int, experiment_id: int, id: int
    ) -> ExperimentRunORM:
        """
        Read the run of the experiment; a run of another experiment is not found.

        Args:
            project_id: The project of the run.
            experiment_id: The experiment of the run.
            id: The id of the run.

        Returns:
            The run.

        Raises:
            NoSuchElementError: If the experiment has no run with the id.
        """
        db_obj = (
            db.query(self.model)
            .filter(
                self.model.project_id == project_id,
                self.model.experiment_id == experiment_id,
                self.model.id == id,
            )
            .one_or_none()
        )
        if db_obj is None:
            raise NoSuchElementError(
                self.model, project_id=project_id, experiment_id=experiment_id, id=id
            )
        return db_obj


crud_experiment_run = CRUDExperimentRun(ExperimentRunORM)
