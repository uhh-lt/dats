from modules.experiment.experiment_orm import ExperimentRunORM
from modules.experiment.experiment_run_dto import (
    ExperimentRunCreateIntern,
    ExperimentRunUpdateIntern,
)
from repos.db.crud_base import SQLCRUDBase


class CRUDExperimentRun(
    SQLCRUDBase[ExperimentRunORM, ExperimentRunCreateIntern, ExperimentRunUpdateIntern]
):
    pass


crud_experiment_run = CRUDExperimentRun(ExperimentRunORM)
