from pathlib import Path

import pandas as pd
from loguru import logger
from sqlalchemy.orm import Session

from core.code.code_crud import crud_code
from core.doc.source_document_crud import crud_sdoc
from core.prompt.prompt_crud import crud_prompt
from core.prompt.prompt_version_crud import crud_prompt_version
from core.user.user_crud import crud_user
from modules.eximport.experiments.experiment_export_schema import (
    REFERENCES,
    SCORES,
    ExperimentExportCollection,
    ExperimentExportSchema,
    ExperimentRunCodeScoreForExport,
    ExperimentRunExportSchema,
    ExperimentRunScoresForExport,
)
from modules.eximport.export_exceptions import NoDataToExportError
from modules.experiment.experiment_crud import crud_experiment
from modules.experiment.experiment_orm import ExperimentORM, ExperimentRunORM
from modules.experiment.experiment_run_dto import ExperimentRunScores
from repos.filesystem_repo import FilesystemRepo


def export_all_experiments(
    db: Session,
    fsr: FilesystemRepo,
    project_id: int,
) -> Path:
    """
    Export all experiments of a project with all their runs to a CSV file.

    Args:
        db: Database session
        fsr: Filesystem repository service for file operations
        project_id: ID of the project

    Returns:
        Path to the exported file

    Raises:
        NoDataToExportError: If the project has no experiments
    """
    experiments = crud_experiment.read_by_project(db=db, project_id=project_id)
    if len(experiments) == 0:
        raise NoDataToExportError("No experiments to export.")

    export_data = __generate_export_df_for_experiments(db=db, experiments=experiments)
    return fsr.write_df_to_temp_file(
        df=export_data,
        fn=f"project_{project_id}_all_experiments",
    )


def __generate_export_df_for_experiments(
    db: Session, experiments: list[ExperimentORM]
) -> pd.DataFrame:
    logger.info(f"Exporting {len(experiments)} Experiments ...")

    # in the order of creation, so that the import creates them in the same order
    experiments = sorted(experiments, key=lambda experiment: experiment.id)
    references = _References.read(db=db, experiments=experiments)

    return ExperimentExportCollection(
        experiments=[
            ExperimentExportSchema(
                experiment_name=experiment.name,
                task_type=experiment.task_type,
                sdoc_filenames=references.sdoc_filenames(experiment.sdoc_ids),
                code_names=REFERENCES.dump_json(
                    [references.code_name.get(id) for id in experiment.code_ids]
                ).decode(),
                gold_user_email=references.user_email_or_none(experiment.gold_user_id),
            )
            for experiment in experiments
        ],
        runs=[
            references.run_for_export(experiment=experiment, run=run)
            for experiment in experiments
            for run in experiment.runs
        ],
    ).to_dataframe()


class _References:
    """The project-independent references (filenames, names, emails, ...) of the
    objects the exported experiments and runs reference, read with one query per
    object type."""

    def __init__(
        self,
        *,
        sdoc_filename: dict[int, str],
        code_name: dict[int, str],
        user_email: dict[int, str],
        prompt_version: dict[int, tuple[str, int]],
    ) -> None:
        self.sdoc_filename = sdoc_filename
        self.code_name = code_name
        self.user_email = user_email
        self.prompt_version = prompt_version

    @classmethod
    def read(cls, db: Session, *, experiments: list[ExperimentORM]) -> "_References":
        runs = [run for experiment in experiments for run in experiment.runs]
        sdoc_ids = [id for experiment in experiments for id in experiment.sdoc_ids]
        sdoc_ids.extend(id for run in runs for id in run.sdoc_ids)
        # the scores are scores of the experiment's codes
        code_ids = [id for experiment in experiments for id in experiment.code_ids]
        user_ids = [
            experiment.gold_user_id
            for experiment in experiments
            if experiment.gold_user_id is not None
        ]
        user_ids.extend(run.virtual_user_id for run in runs)
        user_ids.extend(run.user_id for run in runs if run.user_id is not None)

        versions = crud_prompt_version.read_existing_by_ids(
            db=db, ids=[run.prompt_version_id for run in runs]
        )
        prompt_name = {
            id: prompt.name
            for id, prompt in crud_prompt.read_existing_by_ids(
                db=db, ids=[version.prompt_id for version in versions.values()]
            ).items()
        }

        return cls(
            sdoc_filename={
                id: sdoc.filename
                for id, sdoc in crud_sdoc.read_existing_by_ids(
                    db=db, ids=sdoc_ids
                ).items()
            },
            code_name={
                id: code.name
                for id, code in crud_code.read_existing_by_ids(
                    db=db, ids=code_ids
                ).items()
            },
            user_email={
                id: user.email
                for id, user in crud_user.read_existing_by_ids(
                    db=db, ids=user_ids
                ).items()
            },
            prompt_version={
                id: (prompt_name[version.prompt_id], version.version)
                for id, version in versions.items()
            },
        )

    def sdoc_filenames(self, sdoc_ids: list[int]) -> str:
        return REFERENCES.dump_json(
            [self.sdoc_filename.get(id) for id in sdoc_ids]
        ).decode()

    def user_email_or_none(self, user_id: int | None) -> str | None:
        return self.user_email.get(user_id) if user_id is not None else None

    def run_for_export(
        self, *, experiment: ExperimentORM, run: ExperimentRunORM
    ) -> ExperimentRunExportSchema:
        """Replace the ids of a run with their references."""
        prompt_name, prompt_version = self.prompt_version.get(
            run.prompt_version_id, (None, None)
        )
        return ExperimentRunExportSchema(
            experiment_name=experiment.name,
            run_name=run.name,
            prompt_name=prompt_name,
            prompt_version=prompt_version,
            model=run.model,
            sdoc_filenames=self.sdoc_filenames(run.sdoc_ids),
            virtual_user_email=self.user_email_or_none(run.virtual_user_id),
            user_email=self.user_email_or_none(run.user_id),
            status=run.status,
            started=run.started,
            finished=run.finished,
            scores=SCORES.dump_json(
                [
                    self._scores_for_export(ExperimentRunScores.model_validate(scores))
                    for scores in run.scores
                ]
            ).decode(),
            scores_computed=run.scores_computed,
        )

    def _scores_for_export(
        self, scores: ExperimentRunScores
    ) -> ExperimentRunScoresForExport:
        return ExperimentRunScoresForExport(
            scoring=scores.scoring,
            num_units=scores.num_units,
            total=scores.total,
            code_scores=[
                ExperimentRunCodeScoreForExport(
                    code_name=self.code_name.get(code_score.code_id),
                    **code_score.model_dump(exclude={"code_id"}),
                )
                for code_score in scores.code_scores
            ],
        )
