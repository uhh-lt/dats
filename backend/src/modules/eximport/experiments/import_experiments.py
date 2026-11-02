from collections.abc import Hashable, Sequence
from itertools import takewhile
from typing import NamedTuple, TypeVar

import pandas as pd
from loguru import logger
from sqlalchemy.orm import Session

from core.code.code_crud import crud_code
from core.doc.source_document_crud import crud_sdoc
from core.prompt.prompt_crud import crud_prompt
from core.prompt.prompt_dto import PromptVersionRead
from core.prompt.prompt_enum import TaskType
from core.user.user_crud import crud_user
from modules.agreement.agreement_dto import AgreementCodeScore
from modules.eximport.experiments.experiment_export_schema import (
    REFERENCES,
    SCORES,
    ExperimentExportCollection,
    ExperimentExportSchema,
    ExperimentRunExportSchema,
)
from modules.eximport.import_exceptions import ImportExperimentsError
from modules.eximport.prompts.import_prompts import imported_prompt_names
from modules.experiment.experiment_crud import crud_experiment
from modules.experiment.experiment_dto import ExperimentCreate
from modules.experiment.experiment_orm import ExperimentORM
from modules.experiment.experiment_run_crud import crud_experiment_run
from modules.experiment.experiment_run_dto import (
    ExperimentRunCreateIntern,
    ExperimentRunScores,
    ExperimentRunUpdateIntern,
)
from systems.job_system.job_system_enum import JobStatus

# the job of a run that was queued or running when it was exported does not exist
# in the target project, so it never finishes there
_ACTIVE_RUN_STATUSES = {JobStatus.QUEUED, JobStatus.STARTED}

_Reference = TypeVar("_Reference", bound=Hashable)


class _PromptVersion(NamedTuple):
    """What decides whether a prompt version fits an experiment."""

    id: int
    task_type: TaskType
    code_ids: frozenset[int]


class _ImportedRun(NamedTuple):
    """A run remapped to the target project: the row to create and the state of
    its job and its stored scores to set."""

    create_dto: ExperimentRunCreateIntern
    update_dto: ExperimentRunUpdateIntern


def import_experiments_to_proj(
    db: Session,
    df: pd.DataFrame,
    project_id: int,
) -> list[int]:
    """
    Import experiments with all their runs from a DataFrame into a project.

    The references are remapped to the project: documents by filename, codes by
    name, the gold annotator (a member or a virtual user of the project) by email,
    the prompt version of a run by prompt name and version number, its virtual user
    (a virtual user of the project) by email and the user who started it by email.
    The users, codes, documents, annotations and prompts must be imported first.

    The prompt import imports a prompt that diverged from the project's prompt of
    the same name as "<name> (imported)" (or "(imported 2)", ...). So the prompt
    version of a run is the version of that number of the prompt of one of these
    names that fits the experiment like every run's version does: of its task and
    with exactly its codes. If several fit, the run is skipped with a warning.

    - An experiment whose documents, codes or gold annotator cannot be resolved is
      skipped with all its runs, with a warning.
    - A run whose prompt version, documents, virtual user or scored codes cannot be
      resolved, or whose virtual user belongs to another run, is skipped with a
      warning. A user who started a run that cannot be resolved is dropped.
    - An experiment is merged into the experiment of the same name if both have
      the same task, documents, codes and gold annotator: the runs it lacks are
      added, and its runs stay as they are. An experiment of the same name with
      another configuration is skipped with a warning. So importing the same data
      twice changes nothing the second time.
    - Runs keep their model, status, times and stored scores, so they need not be
      run again. A run that was queued or running when it was exported is imported
      as failed: its job does not exist in the project.

    Args:
        db: Database session
        df: DataFrame with one row per experiment and one per run
        project_id: ID of the project to import the experiments into

    Returns:
        IDs of the created or changed experiments

    Raises:
        ImportExperimentsError: If the data has an invalid format
    """
    # 1) validate the input data
    try:
        collection = ExperimentExportCollection.from_dataframe(df)
    except ValueError as e:
        logger.error(f"Failed to load experiment import data: {e}")
        raise ImportExperimentsError(
            errors=[f"Invalid data format for experiments: {e}"]
        )
    runs_by_experiment: dict[str, list[ExperimentRunExportSchema]] = {}
    for run_row in collection.runs:
        runs_by_experiment.setdefault(run_row.experiment_name, []).append(run_row)
    logger.info(f"Importing {len(collection.experiments)} experiments...")

    # 2) resolve the references of the experiments and runs in the project
    remapper = _Remapper.read(db=db, project_id=project_id, collection=collection)

    # 3) merge every experiment into the project
    existing_by_name = {
        experiment.name: experiment
        for experiment in crud_experiment.read_by_project(db=db, project_id=project_id)
    }
    used_virtual_user_ids = {
        run.virtual_user_id
        for experiment in existing_by_name.values()
        for run in experiment.runs
    }
    changed_ids: list[int] = []
    for row in collection.experiments:
        changed_id = _merge_experiment(
            db=db,
            project_id=project_id,
            row=row,
            run_rows=runs_by_experiment.get(row.experiment_name, []),
            remapper=remapper,
            existing_by_name=existing_by_name,
            used_virtual_user_ids=used_virtual_user_ids,
        )
        if changed_id is not None:
            changed_ids.append(changed_id)
    exported_names = {row.experiment_name for row in collection.experiments}
    for name in runs_by_experiment.keys() - exported_names:
        remapper.skipped.append(f"the runs of experiment '{name}' (no experiment row)")

    remapper.log_skipped(project_id=project_id)
    logger.info(
        f"Imported experiments into project {project_id}: "
        f"{len(changed_ids)} created or changed."
    )
    return changed_ids


def _merge_experiment(
    db: Session,
    *,
    project_id: int,
    row: ExperimentExportSchema,
    run_rows: list[ExperimentRunExportSchema],
    remapper: "_Remapper",
    existing_by_name: dict[str, ExperimentORM],
    used_virtual_user_ids: set[int],
) -> int | None:
    """Merge an imported experiment and its runs into the project (see
    `import_experiments_to_proj`). Returns the ID of the created or changed
    experiment, None if nothing changed."""
    create_dto = remapper.experiment(row, project_id=project_id)
    if create_dto is None:
        return None

    # 1) the experiment of the same name, or a new one
    experiment = existing_by_name.get(row.experiment_name)
    changed = experiment is None
    if experiment is None:
        experiment = crud_experiment.create(db=db, create_dto=create_dto)
        existing_by_name[experiment.name] = experiment
    elif (
        experiment.task_type,
        experiment.sdoc_ids,
        experiment.code_ids,
        experiment.gold_user_id,
    ) != (
        create_dto.task_type,
        create_dto.sdoc_ids,
        create_dto.code_ids,
        create_dto.gold_user_id,
    ):
        remapper.skipped.append(
            f"experiment '{row.experiment_name}' with its runs (the project has an "
            "experiment of that name with another task, documents, codes or gold "
            "annotator)"
        )
        return None

    # 2) the runs the experiment lacks
    run_names = {run.name for run in experiment.runs}
    runs: list[_ImportedRun] = []
    for run_row in run_rows:
        if run_row.run_name in run_names:
            continue
        run = remapper.run(run_row, experiment=experiment)
        if run is None:
            continue
        if run.create_dto.virtual_user_id in used_virtual_user_ids:
            remapper.skipped.append(
                f"run '{run_row.run_name}' of experiment '{row.experiment_name}' (its "
                f"virtual user {run_row.virtual_user_email} belongs to another run)"
            )
            continue
        run_names.add(run_row.run_name)
        used_virtual_user_ids.add(run.create_dto.virtual_user_id)
        runs.append(run)
    if not runs:
        return experiment.id if changed else None

    db_objs = crud_experiment_run.create_multi(
        db=db, create_dtos=[run.create_dto for run in runs]
    )
    crud_experiment_run.update_multi(
        db=db,
        ids=[db_obj.id for db_obj in db_objs],
        update_dtos=[run.update_dto for run in runs],
    )
    db.expire(experiment, ["runs"])
    return experiment.id


class _Remapper:
    """Resolves the references of the exported experiments and runs in the target
    project, with one query per object type, and collects what is skipped because
    it cannot be resolved."""

    def __init__(
        self,
        *,
        sdoc_id: dict[str, int],
        code_id: dict[str, int],
        annotator_id: dict[str, int],
        virtual_user_id: dict[str, int],
        user_id: dict[str, int],
        prompt_version: dict[tuple[str, int], _PromptVersion],
    ) -> None:
        self._sdoc_id = sdoc_id
        self._code_id = code_id
        self._annotator_id = annotator_id
        self._virtual_user_id = virtual_user_id
        self._user_id = user_id
        self._prompt_names = {name for name, _ in prompt_version}
        self._prompt_version = prompt_version
        self.skipped: list[str] = []
        self.dropped: set[str] = set()

    @classmethod
    def read(
        cls,
        db: Session,
        *,
        project_id: int,
        collection: ExperimentExportCollection,
    ) -> "_Remapper":
        filenames: list[str | None] = []
        code_names: list[str | None] = []
        for row in collection.experiments:
            filenames.extend(REFERENCES.validate_json(row.sdoc_filenames))
            code_names.extend(REFERENCES.validate_json(row.code_names))
        for run_row in collection.runs:
            filenames.extend(REFERENCES.validate_json(run_row.sdoc_filenames))
            code_names.extend(
                code_score.code_name
                for scores in SCORES.validate_json(run_row.scores)
                for code_score in scores.code_scores
            )
        emails = [run_row.user_email for run_row in collection.runs]

        sdoc_id: dict[str, int] = {}
        for filename in _unique(filenames):
            sdoc = crud_sdoc.read_by_filename(
                db=db, project_id=project_id, filename=filename, only_finished=False
            )
            if sdoc is not None:
                sdoc_id[filename] = sdoc.id

        # the members and the virtual users of the project
        annotators = crud_user.read_by_project(db=db, project_id=project_id)

        return cls(
            sdoc_id=sdoc_id,
            code_id={
                code.name: code.id
                for code in crud_code.read_by_names(
                    db=db, project_id=project_id, names=_unique(code_names)
                )
            },
            annotator_id={user.email: user.id for user in annotators},
            virtual_user_id={
                user.email: user.id
                for user in annotators
                if user.project_id == project_id
            },
            user_id={
                user.email: user.id
                for user in crud_user.read_by_emails(db=db, emails=_unique(emails))
            },
            prompt_version={
                (prompt.name, version.version): _PromptVersion(
                    id=version.id,
                    task_type=TaskType(prompt.task_type),
                    code_ids=frozenset(
                        code.code_id
                        for code in PromptVersionRead.model_validate(version).codes
                    ),
                )
                for prompt in crud_prompt.read_by_project(db=db, project_id=project_id)
                for version in prompt.versions
            },
        )

    def experiment(
        self, row: ExperimentExportSchema, *, project_id: int
    ) -> ExperimentCreate | None:
        """The experiment of a row in the project, None (skipped with a warning) if
        a reference cannot be resolved."""
        missing: list[str] = []
        sdoc_ids = self._resolve_all(
            self._sdoc_id,
            REFERENCES.validate_json(row.sdoc_filenames),
            "document",
            missing,
        )
        code_ids = self._resolve_all(
            self._code_id, REFERENCES.validate_json(row.code_names), "code", missing
        )
        # an experiment needs a gold annotator, so one without cannot be imported
        gold_user_id = self._resolve(
            self._annotator_id, row.gold_user_email, "gold annotator", missing
        )
        if missing or gold_user_id is None:
            self._skip(f"experiment '{row.experiment_name}' with its runs", missing)
            return None
        return ExperimentCreate(
            name=row.experiment_name,
            project_id=project_id,
            task_type=row.task_type,
            sdoc_ids=sdoc_ids,
            code_ids=code_ids,
            gold_user_id=gold_user_id,
        )

    def run(
        self, row: ExperimentRunExportSchema, *, experiment: ExperimentORM
    ) -> _ImportedRun | None:
        """The run of a row in the project, None (skipped with a warning) if a
        reference cannot be resolved."""
        missing: list[str] = []

        # 1) the prompt version
        prompt_version_id = self._prompt_version_id(
            row, experiment=experiment, missing=missing
        )

        # 2) the documents, the virtual user and the codes of the stored scores
        sdoc_ids = self._resolve_all(
            self._sdoc_id,
            REFERENCES.validate_json(row.sdoc_filenames),
            "document",
            missing,
        )
        virtual_user_id = self._resolve(
            self._virtual_user_id, row.virtual_user_email, "virtual user", missing
        )
        exported_scores = SCORES.validate_json(row.scores)
        score_code_ids = [
            self._resolve_all(
                self._code_id,
                [code_score.code_name for code_score in scores.code_scores],
                "code",
                missing,
            )
            for scores in exported_scores
        ]
        if missing or prompt_version_id is None or virtual_user_id is None:
            self._skip(
                f"run '{row.run_name}' of experiment '{row.experiment_name}'", missing
            )
            return None

        # 3) the user who started the run is dropped if they do not exist
        user_id: int | None = None
        if row.user_email is not None:
            user_id = self._user_id.get(row.user_email)
            if user_id is None:
                self.dropped.add(f"user {row.user_email}")

        return _ImportedRun(
            create_dto=ExperimentRunCreateIntern(
                experiment_id=experiment.id,
                name=row.run_name,
                prompt_version_id=prompt_version_id,
                model=row.model,
                sdoc_ids=sdoc_ids,
                virtual_user_id=virtual_user_id,
                user_id=user_id,
                status=(
                    JobStatus.FAILED
                    if row.status in _ACTIVE_RUN_STATUSES
                    else row.status
                ),
            ),
            update_dto=ExperimentRunUpdateIntern(
                started=row.started,
                finished=row.finished,
                scores=[
                    ExperimentRunScores(
                        scoring=scores.scoring,
                        num_units=scores.num_units,
                        total=scores.total,
                        code_scores=[
                            AgreementCodeScore(
                                code_id=code_id,
                                **code_score.model_dump(exclude={"code_name"}),
                            )
                            for code_id, code_score in zip(code_ids, scores.code_scores)
                        ],
                    )
                    for scores, code_ids in zip(exported_scores, score_code_ids)
                ],
                scores_computed=row.scores_computed,
            ),
        )

    def _prompt_version_id(
        self,
        row: ExperimentRunExportSchema,
        *,
        experiment: ExperimentORM,
        missing: list[str],
    ) -> int | None:
        """The version of the run's number of the prompt of the run's name, or of a
        prompt the prompt import imported it as because it diverged, that fits the
        experiment (see `import_experiments_to_proj`)."""
        if row.prompt_name is None or row.prompt_version is None:
            missing.append("deleted prompt version")
            return None
        candidates = [
            version.id
            for name in takewhile(
                lambda name: name in self._prompt_names,
                imported_prompt_names(row.prompt_name),
            )
            if (version := self._prompt_version.get((name, row.prompt_version)))
            is not None
            and version.task_type == experiment.task_type
            and version.code_ids == set(experiment.code_ids)
        ]
        if len(candidates) == 1:
            return candidates[0]
        missing.append(
            f"version {row.prompt_version} of prompt {row.prompt_name}"
            if not candidates
            else f"a unique version {row.prompt_version} of prompt "
            f"{row.prompt_name} (several prompts of that name fit)"
        )
        return None

    def _resolve(
        self,
        ids: dict[_Reference, int],
        reference: _Reference | None,
        kind: str,
        missing: list[str],
    ) -> int | None:
        """The id of a reference; a reference that cannot be resolved is added to
        `missing`."""
        if reference is None:
            missing.append(f"deleted {kind}")
            return None
        id = ids.get(reference)
        if id is None:
            missing.append(f"{kind} {reference}")
        return id

    def _resolve_all(
        self,
        ids: dict[str, int],
        references: list[str | None],
        kind: str,
        missing: list[str],
    ) -> list[int]:
        return [
            id
            for reference in references
            if (id := self._resolve(ids, reference, kind, missing)) is not None
        ]

    def _skip(self, what: str, missing: list[str]) -> None:
        self.skipped.append(f"{what} (missing {', '.join(dict.fromkeys(missing))})")

    def log_skipped(self, *, project_id: int) -> None:
        if self.skipped:
            logger.warning(
                f"Skipped experiments and runs that cannot be imported into project "
                f"{project_id}: {'; '.join(self.skipped)}"
            )
        if self.dropped:
            logger.warning(
                "Dropped references of imported runs that do not exist in "
                f"project {project_id}: {', '.join(sorted(self.dropped))}"
            )


def _unique(values: Sequence[str | None]) -> list[str]:
    return list(dict.fromkeys(value for value in values if value is not None))
