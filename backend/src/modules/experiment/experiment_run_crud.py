from modules.experiment.experiment_orm import ExperimentRunORM
from modules.experiment.experiment_run_dto import (
    ExperimentRunCreateIntern,
    ExperimentRunUpdateIntern,
)
from repos.db.project_crud_base import ProjectCRUDBase


class CRUDExperimentRun(
    ProjectCRUDBase[
        ExperimentRunORM, ExperimentRunCreateIntern, ExperimentRunUpdateIntern
    ]
):
    pass


crud_experiment_run = CRUDExperimentRun(ExperimentRunORM)
