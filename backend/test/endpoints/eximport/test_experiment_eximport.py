import zipfile
from pathlib import Path

import pandas as pd
import pytest
from sqlalchemy.orm import Session

from core.code.code_crud import crud_code
from core.doc.source_document_crud import crud_sdoc
from core.project.project_service import ProjectService
from core.prompt.prompt_dto import PromptRead
from core.prompt.prompt_enum import TaskType
from core.prompt.prompt_service import PromptService
from core.user.user_crud import crud_user
from core.user.user_orm import UserORM
from modules.eximport.experiments.experiment_export_schema import (
    REFERENCES,
    SCORES,
)
from modules.eximport.export_enum import ExportJobType
from modules.eximport.export_job_dto import ExportJobInput
from modules.eximport.export_service import ExportService
from modules.eximport.import_csv_utils import read_import_csv
from modules.eximport.import_enum import ImportJobType
from modules.eximport.import_exceptions import ImportExperimentsError
from modules.eximport.import_job_dto import ImportJobInput
from modules.eximport.import_service import ImportService
from modules.experiment.experiment_crud import crud_experiment
from modules.experiment.experiment_dto import ExperimentRead
from repos.filesystem_repo import FilesystemRepo
from systems.job_system.job_system_enum import JobStatus

from .conftest import (
    FINISHED,
    SCORES_COMPUTED,
    STARTED,
    ExperimentEximportProjects,
    run1_scores,
)

# ===========================================================================
# EXPORT / IMPORT OF EXPERIMENTS (modules/eximport) TESTS
# ===========================================================================
# The export and import endpoints run as background jobs, so these tests call the
# handlers of the export jobs (ALL_DATA, ALL_EXPERIMENTS) and the import jobs
# (PROJECT, EXPERIMENTS) directly.

PROMPT = "Claim and Evidence"
IMPORTED_PROMPT = "Claim and Evidence (imported)"


def _export(db: Session, project_id: int, export_job_type: ExportJobType) -> Path:
    """Run an export job of a project and return the exported file."""
    output = ExportService().handle_export_job(
        db=db,
        payload=ExportJobInput(
            project_id=project_id,
            export_job_type=export_job_type,
            specific_export_job_parameters=None,
        ),
    )
    assert output.results_url is not None
    return FilesystemRepo().get_dst_path_for_temp_file(Path(output.results_url).name)


def _export_experiments(db: Session, project_id: int) -> pd.DataFrame:
    """Run the export job of all experiments of a project and read the exported
    CSV as the import does."""
    return read_import_csv(_export(db, project_id, ExportJobType.ALL_EXPERIMENTS))


def _run_import_job(
    db: Session,
    file_name: str,
    project_id: int,
    user_id: int,
    import_job_type: ImportJobType,
) -> None:
    ImportService().handle_import_job(
        db=db,
        payload=ImportJobInput(
            project_id=project_id,
            import_job_type=import_job_type,
            user_id=user_id,
            file_name=file_name,
        ),
    )
    db.commit()


def _import_experiments(
    db: Session, df: pd.DataFrame, project_id: int, user_id: int
) -> None:
    """Write the data to a CSV file and run the experiment import job on it."""
    path = FilesystemRepo().write_df_to_temp_file(
        df=df, fn=f"project_{project_id}_experiment_import"
    )
    _run_import_job(db, path.name, project_id, user_id, ImportJobType.EXPERIMENTS)


def _experiments(db: Session, project_id: int) -> dict[str, ExperimentRead]:
    db.expire_all()
    return {
        experiment.name: ExperimentRead.model_validate(experiment)
        for experiment in crud_experiment.read_by_project(db=db, project_id=project_id)
    }


def _export_and_delete_experiments(db: Session, project_id: int) -> pd.DataFrame:
    """Export the experiments of a project and delete them (with their runs, but not
    the virtual users of the runs), so that the import creates them again."""
    df = _export_experiments(db, project_id)
    crud_experiment.delete_multi(
        db=db, ids=[e.id for e in _experiments(db, project_id).values()]
    )
    db.commit()
    return df


def _experiment_row(df: pd.DataFrame, experiment_name: str) -> pd.Series:
    return (df["experiment_name"] == experiment_name) & df["run_name"].isna()


def _run_row(df: pd.DataFrame, run_name: str) -> pd.Series:
    return df["run_name"] == run_name


# --- A. export -----------------------------------------------------------------------


def test_project_export_contains_experiments_and_runs_by_reference(
    db_session: Session,
    experiment_eximport_projects: ExperimentEximportProjects,
    test_user: UserORM,
    tmp_path: Path,
) -> None:
    """The full project export contains the experiments CSV with one row per
    experiment and one per run. They reference documents by filename, codes by
    name, users by email and prompt versions by prompt name and version number,
    and the stored scores reference their codes by name."""
    projects = experiment_eximport_projects
    project_id = projects["project"].id

    zip_path = _export(db_session, project_id, ExportJobType.ALL_DATA)
    with zipfile.ZipFile(zip_path) as zip_file:
        csv_path = zip_file.extract(
            f"project_{project_id}_all_experiments.csv", path=tmp_path
        )
    df = read_import_csv(csv_path).astype(object).where(lambda f: f.notna(), None)

    experiments = df[df["run_name"].isna()].set_index("experiment_name")
    assert experiments.loc["Stage1", "task_type"] == TaskType.ANNOTATION
    assert REFERENCES.validate_json(experiments.loc["Stage1", "sdoc_filenames"]) == [
        "doc_a.txt",
        "doc_b.txt",
    ]
    assert REFERENCES.validate_json(experiments.loc["Stage1", "code_names"]) == [
        "Claim",
        "Evidence",
    ]
    assert experiments.loc["Stage1", "gold_user_email"] == test_user.email
    assert experiments.loc["Stage2", "task_type"] == TaskType.SENTENCE_ANNOTATION
    assert experiments.loc["Stage2", "gold_user_email"] == projects["group_user"].email

    runs = df[df["run_name"].notna()].set_index("run_name")
    assert runs["experiment_name"].tolist() == ["Stage1", "Stage1"]
    assert runs.loc["Run1", ["prompt_name", "prompt_version", "model"]].tolist() == [
        PROMPT,
        1,
        "model-a",
    ]
    assert runs.loc["Run2", ["prompt_name", "prompt_version", "model"]].tolist() == [
        PROMPT,
        2,
        "model-b",
    ]
    assert runs.loc["Run1", "virtual_user_email"] == projects["run1_user"].email
    assert runs.loc["Run1", "user_email"] == test_user.email
    assert runs.loc["Run1", "status"] == JobStatus.FINISHED
    assert REFERENCES.validate_json(runs.loc["Run1", "sdoc_filenames"]) == [
        "doc_a.txt",
        "doc_b.txt",
    ]
    scores = SCORES.validate_json(runs.loc["Run1", "scores"])
    assert [[code_score.code_name for code_score in s.code_scores] for s in scores] == [
        ["Claim", "Evidence"]
    ] * 2
    assert SCORES.validate_json(runs.loc["Run2", "scores"]) == []


# --- B. full project import -----------------------------------------------------------
# The source project is exported, deleted (with its virtual users) and imported into
# the target project, as when a backup is restored.


def _restore_into_target(
    db: Session, projects: ExperimentEximportProjects, user_id: int
) -> None:
    zip_path = _export(db, projects["project"].id, ExportJobType.ALL_DATA)
    ProjectService().delete_project(db=db, project_id=projects["project"].id)
    db.commit()
    _run_import_job(
        db, zip_path.name, projects["target_project"].id, user_id, ImportJobType.PROJECT
    )


def test_project_import_restores_experiments_and_runs(
    db_session: Session,
    experiment_eximport_projects: ExperimentEximportProjects,
    test_user: UserORM,
) -> None:
    """The full project import restores the experiments with their task,
    documents, codes and gold annotator (a member or a virtual user), and their
    runs with model, documents, virtual user, the user who started them, status,
    times and stored scores, all remapped to the target project."""
    projects = experiment_eximport_projects
    target_id = projects["target_project"].id
    emails = {
        name: projects[name].email for name in ("group_user", "run1_user", "run2_user")
    }

    _restore_into_target(db_session, projects, test_user.id)

    experiments = _experiments(db_session, target_id)
    assert set(experiments) == {"Stage1", "Stage2"}
    sdoc_ids = {
        filename: crud_sdoc.read_by_filename(
            db=db_session, project_id=target_id, filename=filename, only_finished=False
        )
        for filename in ("doc_a.txt", "doc_b.txt")
    }
    claim, evidence = [
        crud_code.read_by_name_and_project(
            db=db_session, code_name=name, project_id=target_id
        )
        for name in ("Claim", "Evidence")
    ]
    assert claim is not None and evidence is not None
    users = {
        name: crud_user.read_by_email(db=db_session, email=email)
        for name, email in emails.items()
    }
    assert {user.project_id for user in users.values()} == {target_id}
    doc_a, doc_b = [sdoc.id for sdoc in sdoc_ids.values() if sdoc is not None]

    stage1, stage2 = experiments["Stage1"], experiments["Stage2"]
    assert (
        stage1.task_type,
        stage1.sdoc_ids,
        stage1.code_ids,
        stage1.gold_user_id,
    ) == (
        TaskType.ANNOTATION,
        [doc_a, doc_b],
        [claim.id, evidence.id],
        test_user.id,
    )
    assert (
        stage2.task_type,
        stage2.sdoc_ids,
        stage2.code_ids,
        stage2.gold_user_id,
    ) == (
        TaskType.SENTENCE_ANNOTATION,
        [doc_a],
        [claim.id],
        users["group_user"].id,
    )
    assert stage2.runs == []

    run1, run2 = stage1.runs
    assert [
        (run.name, run.model, run.sdoc_ids, run.virtual_user_id, run.user_id)
        for run in (run1, run2)
    ] == [
        ("Run1", "model-a", [doc_a, doc_b], users["run1_user"].id, test_user.id),
        ("Run2", "model-b", [doc_a, doc_b], users["run2_user"].id, test_user.id),
    ]
    assert [(run.status, run.started, run.finished) for run in (run1, run2)] == [
        (JobStatus.FINISHED, STARTED, FINISHED),
        (JobStatus.FAILED, STARTED, FINISHED),
    ]
    assert run1.scores == run1_scores(claim, evidence)
    assert run1.scores_computed == SCORES_COMPUTED
    assert (run2.scores, run2.scores_computed) == ([], None)


def test_project_import_resolves_run_prompt_versions_in_the_diverged_prompt(
    db_session: Session,
    experiment_eximport_projects: ExperimentEximportProjects,
    test_user: UserORM,
) -> None:
    """The target has another prompt named like the runs' prompt, so the prompt
    import imports the runs' prompt as "Claim and Evidence (imported)". Of the
    prompts of these names, only its versions 1 and 2 select the experiment's
    codes, so the runs use them, not the target's prompt of the same name."""
    projects = experiment_eximport_projects
    target_id = projects["target_project"].id

    _restore_into_target(db_session, projects, test_user.id)

    prompts: dict[str, PromptRead] = {
        prompt.name: prompt
        for prompt in PromptService().read_prompts_by_project(
            db=db_session, project_id=target_id
        )
    }
    assert [v.id for v in prompts[PROMPT].versions] == [
        v.id for v in projects["target_prompt"].versions
    ]
    run1, run2 = _experiments(db_session, target_id)["Stage1"].runs
    assert [run1.prompt_version_id, run2.prompt_version_id] == [
        v.id for v in prompts[IMPORTED_PROMPT].versions
    ]


# --- C. experiments import ------------------------------------------------------------


def test_import_into_the_exported_project_changes_nothing(
    db_session: Session,
    experiment_eximport_projects: ExperimentEximportProjects,
    test_user: UserORM,
) -> None:
    """Importing a project's experiments into the project itself resolves every
    reference to the same objects, so every experiment and run stays as it is."""
    project_id = experiment_eximport_projects["project"].id
    experiments_before = _experiments(db_session, project_id)

    _import_experiments(
        db_session,
        _export_experiments(db_session, project_id),
        project_id,
        test_user.id,
    )

    assert _experiments(db_session, project_id) == experiments_before


def test_import_twice_changes_nothing_the_second_time(
    db_session: Session,
    experiment_eximport_projects: ExperimentEximportProjects,
    test_user: UserORM,
) -> None:
    """Deleted experiments are restored by the first import (with the virtual
    users their runs had), and the second import of the same data neither
    duplicates nor changes them."""
    projects = experiment_eximport_projects
    project_id = projects["project"].id
    df = _export_and_delete_experiments(db_session, project_id)

    _import_experiments(db_session, df, project_id, test_user.id)
    experiments_after_first = _experiments(db_session, project_id)
    _import_experiments(db_session, df, project_id, test_user.id)

    assert _experiments(db_session, project_id) == experiments_after_first
    assert {
        name: [(run.name, run.virtual_user_id) for run in experiment.runs]
        for name, experiment in experiments_after_first.items()
    } == {
        "Stage1": [
            ("Run1", projects["run1_user"].id),
            ("Run2", projects["run2_user"].id),
        ],
        "Stage2": [],
    }


def test_import_restores_experiment_whose_gold_annotator_was_deleted(
    db_session: Session,
    experiment_eximport_projects_without_gold: ExperimentEximportProjects,
    test_user: UserORM,
) -> None:
    """An experiment whose gold annotator was deleted is exported without a gold
    annotator email and imported without a gold annotator, not skipped; a second
    import of the same data changes nothing."""
    project_id = experiment_eximport_projects_without_gold["project"].id
    df = _export_and_delete_experiments(db_session, project_id)
    assert df.loc[_experiment_row(df, "Stage2"), "gold_user_email"].isna().all()

    _import_experiments(db_session, df, project_id, test_user.id)
    experiments = _experiments(db_session, project_id)
    _import_experiments(db_session, df, project_id, test_user.id)

    assert set(experiments) == {"Stage1", "Stage2"}
    assert experiments["Stage2"].gold_user_id is None
    assert _experiments(db_session, project_id) == experiments


@pytest.mark.parametrize(
    "column,value,expected_warning",
    [
        # a document that does not exist in the project
        pytest.param(
            "sdoc_filenames",
            '["doc_a.txt", "missing.txt"]',
            "document missing.txt",
            id="document",
        ),
        # a document that was deleted before the export
        pytest.param(
            "sdoc_filenames", '["doc_a.txt", null]', "deleted document", id="deleted"
        ),
        # a code that does not exist in the project
        pytest.param("code_names", '["Claim", "Unknown"]', "code Unknown", id="code"),
        # a gold annotator who is no user of the project
        pytest.param(
            "gold_user_email",
            "nobody@dats.org",
            "gold annotator nobody@dats.org",
            id="gold-annotator",
        ),
    ],
)
def test_import_skips_experiment_whose_references_cannot_be_resolved(
    db_session: Session,
    experiment_eximport_projects: ExperimentEximportProjects,
    test_user: UserORM,
    logged_warnings: list[str],
    column: str,
    value: str,
    expected_warning: str,
) -> None:
    """An experiment with a reference that cannot be resolved is skipped with its
    runs and a warning naming the reference, instead of being imported half; the
    other experiments are imported."""
    project_id = experiment_eximport_projects["project"].id
    df = _export_and_delete_experiments(db_session, project_id)
    df.loc[_experiment_row(df, "Stage1"), column] = value

    _import_experiments(db_session, df, project_id, test_user.id)

    assert set(_experiments(db_session, project_id)) == {"Stage2"}
    assert any(
        "experiment 'Stage1' with its runs" in message and expected_warning in message
        for message in logged_warnings
    ), logged_warnings


@pytest.mark.parametrize(
    "column,value,expected_warning",
    [
        # a version number the prompt does not have
        pytest.param(
            "prompt_version", 9, "version 9 of prompt Claim and Evidence", id="version"
        ),
        # a prompt version that was deleted before the export
        pytest.param("prompt_name", None, "deleted prompt", id="deleted-prompt"),
        # a virtual user that does not exist
        pytest.param(
            "virtual_user_email",
            "unknown@virtual.dats",
            "virtual user unknown@virtual.dats",
            id="virtual-user",
        ),
        # a project member is no virtual user
        pytest.param(
            "virtual_user_email",
            "testuser@dats.org",
            "virtual user testuser@dats.org",
            id="member-as-virtual-user",
        ),
        # a document that does not exist in the project
        pytest.param(
            "sdoc_filenames",
            '["doc_a.txt", "missing.txt"]',
            "document missing.txt",
            id="document",
        ),
    ],
)
def test_import_skips_run_whose_references_cannot_be_resolved(
    db_session: Session,
    experiment_eximport_projects: ExperimentEximportProjects,
    test_user: UserORM,
    logged_warnings: list[str],
    column: str,
    value: str | int | None,
    expected_warning: str,
) -> None:
    """A run with a reference that cannot be resolved is skipped with a warning
    naming the reference; its experiment and the other runs are imported."""
    project_id = experiment_eximport_projects["project"].id
    df = _export_and_delete_experiments(db_session, project_id)
    df.loc[_run_row(df, "Run1"), column] = value

    _import_experiments(db_session, df, project_id, test_user.id)

    stage1 = _experiments(db_session, project_id)["Stage1"]
    assert [run.name for run in stage1.runs] == ["Run2"]
    assert any(
        "run 'Run1' of experiment 'Stage1'" in message and expected_warning in message
        for message in logged_warnings
    ), logged_warnings


def test_import_skips_run_whose_scored_code_cannot_be_resolved(
    db_session: Session,
    experiment_eximport_projects: ExperimentEximportProjects,
    test_user: UserORM,
    logged_warnings: list[str],
) -> None:
    """A run whose stored scores name a code that does not exist in the project is
    skipped, so that no scores of unknown codes are imported."""
    project_id = experiment_eximport_projects["project"].id
    df = _export_and_delete_experiments(db_session, project_id)
    run1 = _run_row(df, "Run1")
    df.loc[run1, "scores"] = df.loc[run1, "scores"].str.replace(
        '"Evidence"', '"Unknown"'
    )

    _import_experiments(db_session, df, project_id, test_user.id)

    stage1 = _experiments(db_session, project_id)["Stage1"]
    assert [run.name for run in stage1.runs] == ["Run2"]
    assert any(
        "run 'Run1' of experiment 'Stage1'" in message and "code Unknown" in message
        for message in logged_warnings
    ), logged_warnings


def test_import_skips_experiment_that_differs_from_the_one_of_the_same_name(
    db_session: Session,
    experiment_eximport_projects: ExperimentEximportProjects,
    test_user: UserORM,
    logged_warnings: list[str],
) -> None:
    """An experiment whose codes differ from the project's experiment of the same
    name is skipped with a warning; the project's experiment stays as it is."""
    project_id = experiment_eximport_projects["project"].id
    experiments_before = _experiments(db_session, project_id)
    df = _export_experiments(db_session, project_id)
    df.loc[_experiment_row(df, "Stage1"), "code_names"] = '["Claim"]'

    _import_experiments(db_session, df, project_id, test_user.id)

    assert _experiments(db_session, project_id) == experiments_before
    assert any(
        "experiment 'Stage1' with its runs" in message
        and "an experiment of that name" in message
        for message in logged_warnings
    ), logged_warnings


def test_import_skips_run_whose_virtual_user_belongs_to_another_run(
    db_session: Session,
    experiment_eximport_projects: ExperimentEximportProjects,
    test_user: UserORM,
    logged_warnings: list[str],
) -> None:
    """A new run whose virtual user already belongs to a run (e.g. Run2 renamed to
    Run3 after the export) is skipped: deleting one of the runs would delete the
    annotations of the other."""
    project_id = experiment_eximport_projects["project"].id
    experiments_before = _experiments(db_session, project_id)
    df = _export_experiments(db_session, project_id)
    df.loc[_run_row(df, "Run2"), "run_name"] = "Run3"

    _import_experiments(db_session, df, project_id, test_user.id)

    assert _experiments(db_session, project_id) == experiments_before
    assert any(
        "run 'Run3' of experiment 'Stage1'" in message
        and "belongs to another run" in message
        for message in logged_warnings
    ), logged_warnings


def test_import_drops_an_unknown_user_who_started_a_run(
    db_session: Session,
    experiment_eximport_projects: ExperimentEximportProjects,
    test_user: UserORM,
) -> None:
    """A user who started a run and does not exist (e.g. in another instance) is
    dropped instead of skipping the run, like the author of a prompt version."""
    project_id = experiment_eximport_projects["project"].id
    df = _export_and_delete_experiments(db_session, project_id)
    df.loc[_run_row(df, "Run1"), "user_email"] = "unknown@dats.org"

    _import_experiments(db_session, df, project_id, test_user.id)

    run1, run2 = _experiments(db_session, project_id)["Stage1"].runs
    assert (run1.user_id, run2.user_id) == (None, test_user.id)


@pytest.mark.parametrize(
    "exported_status",
    [
        # the run was queued when the project was exported
        pytest.param(JobStatus.QUEUED, id="queued"),
        # the run was running when the project was exported
        pytest.param(JobStatus.STARTED, id="started"),
    ],
)
def test_import_marks_runs_that_were_active_at_the_export_as_failed(
    db_session: Session,
    experiment_eximport_projects: ExperimentEximportProjects,
    test_user: UserORM,
    exported_status: JobStatus,
) -> None:
    """The job of a run that was queued or running at the export does not exist in
    the project, so the run is imported as failed instead of active forever."""
    project_id = experiment_eximport_projects["project"].id
    df = _export_and_delete_experiments(db_session, project_id)
    df.loc[_run_row(df, "Run1"), "status"] = exported_status.value

    _import_experiments(db_session, df, project_id, test_user.id)

    run1, _ = _experiments(db_session, project_id)["Stage1"].runs
    assert run1.status == JobStatus.FAILED


# --- D. invalid input ----------------------------------------------------------------


def test_import_without_scores_column_fails_and_changes_nothing(
    db_session: Session,
    experiment_eximport_projects: ExperimentEximportProjects,
    test_user: UserORM,
) -> None:
    """A CSV file without the ``scores`` column fails the import with
    ``ImportExperimentsError`` before any experiment is created."""
    project_id = experiment_eximport_projects["project"].id
    df = _export_and_delete_experiments(db_session, project_id).drop(columns="scores")

    with pytest.raises(ImportExperimentsError, match="scores"):
        _import_experiments(db_session, df, project_id, test_user.id)

    db_session.rollback()
    assert _experiments(db_session, project_id) == {}
