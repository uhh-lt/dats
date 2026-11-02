from datetime import UTC, datetime

import pandas as pd
from sqlalchemy import event
from sqlalchemy.orm import Session

from common.job_type_enum import JobType
from common.singleton_meta import SingletonMeta
from core.annotation.annotation_document_crud import crud_adoc
from core.code.code_crud import crud_code
from core.doc.source_document_crud import crud_sdoc
from core.prompt.prompt_crud import crud_prompt
from core.prompt.prompt_dto import PromptVersionRead
from core.prompt.prompt_enum import TaskType
from core.prompt.prompt_service import PromptService
from core.prompt.prompt_version_crud import crud_prompt_version
from core.user.user_crud import crud_user
from core.user.user_dto import UserRead, UserUpdate
from core.user.user_orm import UserORM
from modules.agreement.agreement_dto import AgreementParams
from modules.agreement.agreement_enum import AgreementAnnotationType, AgreementScoring
from modules.agreement.agreement_service import AgreementService
from modules.experiment.experiment_crud import crud_experiment
from modules.experiment.experiment_dto import (
    ExperimentCreate,
    ExperimentDeleted,
    ExperimentRead,
    ExperimentRunCreated,
    ExperimentRunDeleted,
    ExperimentUpdate,
    ExperimentUpdated,
)
from modules.experiment.experiment_enum import ExperimentRunLogFormat
from modules.experiment.experiment_exceptions import (
    ExperimentGoldAnnotationsMissingError,
    ExperimentGoldAnnotatorDeletedError,
    ExperimentInvalidSelectionError,
    ExperimentPromptVersionNotEligibleError,
)
from modules.experiment.experiment_orm import ExperimentORM, ExperimentRunORM
from modules.experiment.experiment_run_crud import crud_experiment_run
from modules.experiment.experiment_run_dto import (
    ExperimentRunCreate,
    ExperimentRunCreateIntern,
    ExperimentRunJobInput,
    ExperimentRunLog,
    ExperimentRunRead,
    ExperimentRunScores,
    ExperimentRunUpdateIntern,
)
from repos.filesystem_repo import FilesystemRepo
from systems.job_system.job_service import JobService
from systems.job_system.job_system_enum import JobStatus

# the agreement of a run is stored for every scoring
_ANNOTATION_TYPES: dict[TaskType, AgreementAnnotationType] = {
    TaskType.ANNOTATION: AgreementAnnotationType.SPAN,
    TaskType.SENTENCE_ANNOTATION: AgreementAnnotationType.SENTENCE,
}

_ACTIVE_RUN_STATUSES = {JobStatus.QUEUED, JobStatus.STARTED}


class ExperimentService(metaclass=SingletonMeta):
    """Experiments compare runs (a prompt version and a model) on fixed documents.

    Each run writes into its own virtual user through the LLM Assistant and is
    evaluated against the gold annotator with the agreement evaluation.
    """

    def __new__(cls, *args, **kwargs):
        cls.fsr: FilesystemRepo = FilesystemRepo()
        cls.js = JobService()
        cls.pts = PromptService()
        cls.ags = AgreementService()
        return super(ExperimentService, cls).__new__(cls)

    # CREATE

    def create_experiment(
        self, *, db: Session, create_dto: ExperimentCreate
    ) -> ExperimentRead:
        self._assert_valid_selection(
            db=db,
            project_id=create_dto.project_id,
            sdoc_ids=create_dto.sdoc_ids,
            code_ids=create_dto.code_ids,
            gold_user_id=create_dto.gold_user_id,
        )
        db_obj = crud_experiment.create(
            db=db,
            create_dto=create_dto.model_copy(
                update={
                    "sdoc_ids": list(dict.fromkeys(create_dto.sdoc_ids)),
                    "code_ids": list(dict.fromkeys(create_dto.code_ids)),
                }
            ),
        )
        return self._read_experiment(db=db, experiment_id=db_obj.id)

    def create_run(
        self, *, db: Session, create_dto: ExperimentRunCreate, user_id: int
    ) -> ExperimentRunCreated:
        """Create a run with its virtual user and start its job.

        The job starts once the transaction is committed, because the worker reads
        the run and writes into its virtual user.
        """
        # 1) check that the experiment has a gold annotator and the prompt version fits
        experiment = crud_experiment.read(db=db, id=create_dto.experiment_id)
        self._gold_user_id(experiment=experiment)
        self._assert_eligible_prompt_version(
            db=db, experiment=experiment, prompt_version_id=create_dto.prompt_version_id
        )

        # 2) create the virtual user of the run (names are unique per project)
        virtual_user = crud_user.create_virtual_user(
            db=db,
            project_id=experiment.project_id,
            name=self._run_user_name(
                experiment_name=experiment.name, run_name=create_dto.name
            ),
        )

        # 3) create the run
        run = crud_experiment_run.create(
            db=db,
            create_dto=ExperimentRunCreateIntern(
                experiment_id=experiment.id,
                name=create_dto.name,
                prompt_version_id=create_dto.prompt_version_id,
                model=create_dto.model,
                sdoc_ids=experiment.sdoc_ids,
                virtual_user_id=virtual_user.id,
                user_id=user_id,
                status=JobStatus.QUEUED,
            ),
        )
        db.expire(experiment, ["runs"])

        # 4) start the job after the commit
        job_input = ExperimentRunJobInput(
            project_id=experiment.project_id, run_id=run.id
        )
        event.listen(
            db,
            "after_commit",
            lambda _session: self.js.start_job(
                job_type=JobType.EXPERIMENT_RUN, payload=job_input
            ),
            once=True,
        )

        return ExperimentRunCreated(
            experiment=self._read_experiment(db=db, experiment_id=experiment.id),
            run=ExperimentRunRead.model_validate(run),
            virtual_user=UserRead.model_validate(virtual_user),
        )

    # READ (the log of a run is read by its export)

    def _read_run_log(self, *, db: Session, run_id: int) -> ExperimentRunLog:
        run = crud_experiment_run.read(db=db, id=run_id)
        experiment = run.experiment
        version = crud_prompt_version.read(db=db, id=run.prompt_version_id)
        user_ids = [
            user_id
            for user_id in (experiment.gold_user_id, run.virtual_user_id, run.user_id)
            if user_id is not None
        ]
        users = {user.id: user for user in crud_user.read_by_ids(db=db, ids=user_ids)}
        return ExperimentRunLog(
            experiment_id=experiment.id,
            experiment_name=experiment.name,
            task_type=experiment.task_type,
            code_ids=experiment.code_ids,
            gold_user_id=experiment.gold_user_id,
            gold_user_name=(
                self._user_name(users[experiment.gold_user_id])
                if experiment.gold_user_id is not None
                else None
            ),
            run_id=run.id,
            run_name=run.name,
            virtual_user_id=run.virtual_user_id,
            virtual_user_name=self._user_name(users[run.virtual_user_id]),
            prompt_id=version.prompt_id,
            prompt_name=version.prompt.name,
            prompt_version=PromptVersionRead.model_validate(version),
            model=run.model,
            sdoc_ids=run.sdoc_ids,
            user_id=run.user_id,
            user_name=(
                self._user_name(users[run.user_id]) if run.user_id is not None else None
            ),
            status=run.status,
            job_id=run.job_id,
            created=run.created,
            started=run.started,
            finished=run.finished,
            scores=[ExperimentRunScores.model_validate(s) for s in run.scores],
            scores_computed=run.scores_computed,
        )

    # UPDATE

    def update_experiment(
        self, *, db: Session, experiment_id: int, update_dto: ExperimentUpdate
    ) -> ExperimentUpdated:
        """Rename an experiment and the virtual users of its runs. Its documents,
        codes, task and gold annotator are fixed when it is created."""
        experiment = crud_experiment.read(db=db, id=experiment_id)

        # 1) rename the virtual users of the runs (names are unique per project)
        virtual_user_ids: list[int] = []
        if update_dto.name is not None and update_dto.name != experiment.name:
            virtual_user_ids = [run.virtual_user_id for run in experiment.runs]
            crud_user.update_multi(
                db=db,
                ids=virtual_user_ids,
                update_dtos=[
                    UserUpdate(
                        first_name=self._run_user_name(
                            experiment_name=update_dto.name, run_name=run.name
                        )
                    )
                    for run in experiment.runs
                ],
            )

        # 2) rename the experiment
        crud_experiment.update(db=db, id=experiment_id, update_dto=update_dto)
        return ExperimentUpdated(
            experiment=self._read_experiment(db=db, experiment_id=experiment_id),
            virtual_users=[
                UserRead.model_validate(user)
                for user in crud_user.read_by_ids(db=db, ids=virtual_user_ids)
            ],
        )

    def refresh_run_scores(self, *, db: Session, run_id: int) -> ExperimentRead:
        """Recompute the stored agreement of a run, e.g. after the gold annotator
        changed annotations. Refused if the gold annotator was deleted."""
        run = crud_experiment_run.read(db=db, id=run_id)
        gold_user_id = self._gold_user_id(experiment=run.experiment)
        self._store_scores(db=db, run=run, gold_user_id=gold_user_id)
        return self._read_experiment(db=db, experiment_id=run.experiment_id)

    def refresh_all_run_scores(
        self, *, db: Session, experiment_id: int
    ) -> ExperimentRead:
        """Recompute the stored agreement of all finished runs of an experiment at
        once, so that all runs are scored against the same state of the gold
        annotator. Refused if the gold annotator was deleted."""
        experiment = crud_experiment.read(db=db, id=experiment_id)
        gold_user_id = self._gold_user_id(experiment=experiment)
        for run in experiment.runs:
            if run.status == JobStatus.FINISHED:
                self._store_scores(db=db, run=run, gold_user_id=gold_user_id)
        return self._read_experiment(db=db, experiment_id=experiment_id)

    # DELETE

    def delete_experiment(
        self, *, db: Session, experiment_id: int
    ) -> ExperimentDeleted:
        """Delete an experiment with all its runs and their virtual users, including
        their annotations."""
        experiment = crud_experiment.read(db=db, id=experiment_id)
        virtual_user_ids = [run.virtual_user_id for run in experiment.runs]
        result = ExperimentDeleted(
            experiment=ExperimentRead.model_validate(experiment),
            virtual_users=[
                UserRead.model_validate(user)
                for user in crud_user.read_by_ids(db=db, ids=virtual_user_ids)
            ],
        )
        for run in experiment.runs:
            self._stop_job(run=run)
        # 1) delete the experiment with its runs (cascade), which release their users
        crud_experiment.delete(db=db, id=experiment_id)
        # 2) delete the virtual users of the runs with all their annotations
        crud_user.delete_multi(db=db, ids=virtual_user_ids)
        return result

    def delete_run(self, *, db: Session, run_id: int) -> ExperimentRunDeleted:
        """Delete a run together with its virtual user and its annotations."""
        run = crud_experiment_run.read(db=db, id=run_id)
        run_dto = ExperimentRunRead.model_validate(run)
        virtual_user = UserRead.model_validate(
            crud_user.read(db=db, id=run.virtual_user_id)
        )
        experiment = run.experiment
        self._stop_job(run=run)
        # 1) delete the run, which releases its virtual user
        crud_experiment_run.delete(db=db, id=run_id)
        # 2) delete the virtual user of the run with all its annotations
        crud_user.delete(db=db, id=virtual_user.id)
        db.expire(experiment, ["runs"])
        return ExperimentRunDeleted(
            experiment=self._read_experiment(db=db, experiment_id=experiment.id),
            run=run_dto,
            virtual_user=virtual_user,
        )

    # JOB

    def store_run_scores(self, *, db: Session, run_id: int) -> ExperimentRunRead:
        """Compute and store the agreement of a run with the gold annotator, called
        when the run's job finished. If the gold annotator was deleted during the
        run, the run keeps no scores."""
        run = crud_experiment_run.read(db=db, id=run_id)
        gold_user_id = run.experiment.gold_user_id
        if gold_user_id is None:
            return ExperimentRunRead.model_validate(run)
        return ExperimentRunRead.model_validate(
            self._store_scores(db=db, run=run, gold_user_id=gold_user_id)
        )

    # EXPORT

    def export_run_log(
        self, *, db: Session, run_id: int, export_format: ExperimentRunLogFormat
    ) -> str:
        """Export the log of a run as JSON or CSV.

        The CSV has one row per stored score (the total and every code, for every
        scoring) with the run's configuration in every row, or one row without
        scores if none are stored. Returns the relative URL of the file.
        """
        log = self._read_run_log(db=db, run_id=run_id)
        fn = f"experiment_{log.experiment_id}_run_{log.run_id}_log"
        match export_format:
            case ExperimentRunLogFormat.JSON:
                export_file = self.fsr.write_json_to_temp_file(
                    json_obj=log.model_dump(mode="json"), fn=fn
                )
            case ExperimentRunLogFormat.CSV:
                code_names = {
                    code.id: code.name
                    for code in crud_code.read_by_ids(db=db, ids=log.code_ids)
                }
                export_file = self.fsr.write_df_to_temp_file(
                    df=self._run_log_to_df(log=log, code_names=code_names), fn=fn
                )
        return self.fsr.get_temp_file_url(export_file.name, relative=True)

    # HELPERS

    def _run_user_name(self, *, experiment_name: str, run_name: str) -> str:
        return f"{experiment_name}-{run_name}"

    def _read_experiment(self, *, db: Session, experiment_id: int) -> ExperimentRead:
        return ExperimentRead.model_validate(
            crud_experiment.read(db=db, id=experiment_id)
        )

    def _assert_valid_selection(
        self,
        *,
        db: Session,
        project_id: int,
        sdoc_ids: list[int],
        code_ids: list[int],
        gold_user_id: int,
    ) -> None:
        """Check that the documents, codes and the gold annotator belong to the
        project, and that the gold annotator annotated every document."""
        # 1) documents and codes of the project
        sdocs = crud_sdoc.read_by_ids(db=db, ids=sdoc_ids)  # raises NoSuchElementError
        foreign_sdoc_ids = [sdoc.id for sdoc in sdocs if sdoc.project_id != project_id]
        if foreign_sdoc_ids:
            raise ExperimentInvalidSelectionError(
                f"the documents {foreign_sdoc_ids} do not belong to project {project_id}"
            )
        codes = crud_code.read_by_ids(db=db, ids=code_ids)  # raises NoSuchElementError
        foreign_code_ids = [code.id for code in codes if code.project_id != project_id]
        if foreign_code_ids:
            raise ExperimentInvalidSelectionError(
                f"the codes {foreign_code_ids} do not belong to project {project_id}"
            )

        # 2) an annotator of the project, human or virtual
        annotator_ids = {
            user.id for user in crud_user.read_by_project(db=db, project_id=project_id)
        }
        if gold_user_id not in annotator_ids:
            raise ExperimentInvalidSelectionError(
                f"the gold annotator {gold_user_id} is no annotator of project "
                f"{project_id}"
            )

        # 3) every document is annotated by the gold annotator ("Annotated by")
        annotated_sdoc_ids = {
            adoc.source_document_id
            for adoc in crud_adoc.read_by_user_and_sdocs(
                db=db, user_id=gold_user_id, sdoc_ids=sdoc_ids
            )
        }
        missing = [sdoc_id for sdoc_id in sdoc_ids if sdoc_id not in annotated_sdoc_ids]
        if missing:
            raise ExperimentGoldAnnotationsMissingError(
                gold_user_id=gold_user_id, sdoc_ids=missing
            )

    def _assert_eligible_prompt_version(
        self, *, db: Session, experiment: ExperimentORM, prompt_version_id: int
    ) -> None:
        """Check that a prompt version is a version of the experiment's task whose
        codes are exactly the experiment's codes, and that its prompt is not archived."""
        # raises PromptMismatchError for other projects and tasks
        snapshot = self.pts.read_snapshot(
            db=db,
            version_id=prompt_version_id,
            project_id=experiment.project_id,
            task_type=TaskType(experiment.task_type),
        )
        version = crud_prompt_version.read(db=db, id=prompt_version_id)
        if crud_prompt.read(db=db, id=version.prompt_id).is_archived:
            raise ExperimentPromptVersionNotEligibleError(
                prompt_version_id=prompt_version_id, cause="its prompt is archived"
            )
        prompt_code_ids = {code.code_id for code in snapshot.codes}
        if prompt_code_ids != set(experiment.code_ids):
            raise ExperimentPromptVersionNotEligibleError(
                prompt_version_id=prompt_version_id,
                cause=(
                    f"its codes {sorted(prompt_code_ids)} differ from the experiment's "
                    f"codes {sorted(experiment.code_ids)}"
                ),
            )

    def _gold_user_id(self, *, experiment: ExperimentORM) -> int:
        """The gold annotator of the experiment; raises if it was deleted."""
        if experiment.gold_user_id is None:
            raise ExperimentGoldAnnotatorDeletedError(experiment_id=experiment.id)
        return experiment.gold_user_id

    def _store_scores(
        self, *, db: Session, run: ExperimentRunORM, gold_user_id: int
    ) -> ExperimentRunORM:
        """Compute and store the agreement between the gold annotator and the run's
        virtual user on the run's documents and the experiment's codes, for every
        scoring."""
        experiment = run.experiment
        scores: list[ExperimentRunScores] = []
        for scoring in AgreementScoring:
            result = self.ags.compute_agreement(
                db=db,
                project_id=experiment.project_id,
                params=AgreementParams(
                    sdoc_ids=run.sdoc_ids,
                    code_ids=experiment.code_ids,
                    reference_user_id=gold_user_id,
                    compared_user_id=run.virtual_user_id,
                    annotation_type=_ANNOTATION_TYPES[TaskType(experiment.task_type)],
                    scoring=scoring,
                ),
            )
            scores.append(
                ExperimentRunScores(
                    scoring=scoring,
                    num_units=result.num_units,
                    total=result.total,
                    code_scores=result.code_scores,
                )
            )
        return crud_experiment_run.update(
            db=db,
            id=run.id,
            update_dto=ExperimentRunUpdateIntern(
                scores=scores, scores_computed=datetime.now(UTC)
            ),
        )

    def _stop_job(self, *, run: ExperimentRunORM) -> None:
        if run.job_id is not None and run.status in _ACTIVE_RUN_STATUSES:
            self.js.stop_job(job_id=run.job_id)

    def _user_name(self, user: UserORM) -> str:
        return f"{user.first_name} {user.last_name}".strip()

    def _run_log_to_df(
        self, *, log: ExperimentRunLog, code_names: dict[int, str]
    ) -> pd.DataFrame:
        run_columns = {
            "experiment_id": log.experiment_id,
            "experiment_name": log.experiment_name,
            "task_type": log.task_type.value,
            "gold_user_id": log.gold_user_id,
            "gold_user": log.gold_user_name,
            "run": log.run_name,
            "virtual_user_id": log.virtual_user_id,
            "virtual_user": log.virtual_user_name,
            "prompt_id": log.prompt_id,
            "prompt_name": log.prompt_name,
            "prompt_version_id": log.prompt_version.id,
            "prompt_version": log.prompt_version.version,
            "model": log.model,
            "user_id": log.user_id,
            "user": log.user_name,
            "status": log.status.value,
            "created": log.created.isoformat(),
            "started": log.started.isoformat() if log.started else None,
            "finished": log.finished.isoformat() if log.finished else None,
            "scores_computed": (
                log.scores_computed.isoformat() if log.scores_computed else None
            ),
            "sdoc_ids": " ".join(str(sdoc_id) for sdoc_id in log.sdoc_ids),
        }
        score_columns = [
            "scoring",
            "code_id",
            "code_name",
            "true_positives",
            "false_positives",
            "false_negatives",
            "precision",
            "recall",
            "f1",
        ]
        rows: list[dict[str, object]] = []
        for scores in log.scores:
            for code_id, score in [(None, scores.total)] + [
                (code_score.code_id, code_score) for code_score in scores.code_scores
            ]:
                rows.append(
                    {
                        **run_columns,
                        "scoring": scores.scoring.value,
                        "code_id": code_id,
                        "code_name": (
                            "all codes" if code_id is None else code_names[code_id]
                        ),
                        "true_positives": score.true_positives,
                        "false_positives": score.false_positives,
                        "false_negatives": score.false_negatives,
                        "precision": score.precision,
                        "recall": score.recall,
                        "f1": score.f1,
                    }
                )
        if not rows:
            rows.append(run_columns)
        return pd.DataFrame(data=rows, columns=[*run_columns.keys(), *score_columns])
