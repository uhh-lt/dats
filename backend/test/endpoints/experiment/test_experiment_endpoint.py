import json
import time
from pathlib import Path

import pandas as pd
import pytest
from fastapi.testclient import TestClient
from pydantic import TypeAdapter

from core.prompt.prompt_enum import TaskType
from modules.agreement.agreement_dto import AgreementScore
from modules.agreement.agreement_enum import AgreementScoring
from modules.experiment.experiment_dto import ExperimentCreate, ExperimentRead
from modules.experiment.experiment_enum import ExperimentRunLogFormat
from modules.experiment.experiment_run_dto import (
    ExperimentRunCreate,
    ExperimentRunLog,
    ExperimentRunRead,
)
from repos.filesystem_repo import FilesystemRepo
from systems.job_system.job_system_enum import JobStatus

from .conftest import INVALID_MODEL, ExperimentProject

# (TP, FP, FN) of the run of ExperimentB, see the fixture docstring
RUN_TOTAL_COUNTS = (1, 1, 2)
RUN_CLAIM_COUNTS = (1, 0, 1)
RUN_EVIDENCE_COUNTS = (0, 1, 1)


def _create_dto(p: ExperimentProject, **changes: object) -> ExperimentCreate:
    """ExperimentC: span annotation on documents A and B with Claim and Evidence,
    gold annotator `gold_user`."""
    dto = ExperimentCreate(
        name="ExperimentC",
        project_id=p["project"].id,
        task_type=TaskType.ANNOTATION,
        sdoc_ids=[p["sdoc_a"].id, p["sdoc_b"].id],
        code_ids=[p["code_claim"].id, p["code_evidence"].id],
        gold_user_id=p["gold_user"].id,
    )
    return dto.model_copy(update=changes)


def _get_experiment(client: TestClient, experiment_id: int) -> ExperimentRead:
    response = client.get(f"/experiment/{experiment_id}")
    assert response.status_code == 200, response.text
    return ExperimentRead.model_validate(response.json())


def _counts(score: AgreementScore) -> tuple[int, int, int]:
    return (score.true_positives, score.false_positives, score.false_negatives)


def _wait_for_run(
    client: TestClient,
    experiment_id: int,
    run_id: int,
    *,
    timeout: float = 300.0,
) -> ExperimentRunRead:
    """Poll the experiment until the run is finished or failed."""
    deadline = time.monotonic() + timeout
    while True:
        experiment = _get_experiment(client, experiment_id)
        run = next(run for run in experiment.runs if run.id == run_id)
        if run.status in {JobStatus.FINISHED, JobStatus.FAILED}:
            return run
        if time.monotonic() > deadline:
            pytest.fail(f"Run {run_id} did not end within {timeout}s ({run.status})")
        time.sleep(1)


# ===========================================================================
# CREATE EXPERIMENT (PUT /experiment) TESTS
# ===========================================================================


def test_create_experiment_stores_documents_codes_task_and_gold_annotator(
    client: TestClient, experiment_project: ExperimentProject
) -> None:
    """A new experiment stores the document ids, codes, task and gold annotator."""
    p = experiment_project
    dto = _create_dto(p)
    response = client.put("/experiment", json=dto.model_dump(mode="json"))
    assert response.status_code == 200, response.text
    experiment = ExperimentRead.model_validate(response.json())

    assert experiment.name == "ExperimentC"
    assert experiment.project_id == p["project"].id
    assert experiment.task_type == TaskType.ANNOTATION
    assert experiment.sdoc_ids == dto.sdoc_ids
    assert experiment.code_ids == dto.code_ids
    assert experiment.gold_user_id == p["gold_user"].id
    assert experiment.runs == []
    assert _get_experiment(client, experiment.id) == experiment


@pytest.mark.parametrize(
    "gold_key,sdoc_keys",
    [
        # A member who annotated only document C is a valid gold annotator for C.
        pytest.param("other_member", ["sdoc_c"], id="other-member"),
        # A virtual user is a valid gold annotator for the documents it annotated.
        pytest.param("run_user", ["sdoc_a"], id="virtual-user"),
    ],
)
def test_create_experiment_accepts_any_annotator_of_the_project_as_gold(
    client: TestClient,
    experiment_project: ExperimentProject,
    gold_key: str,
    sdoc_keys: list[str],
) -> None:
    """Humans and virtual users of the project can be the gold annotator."""
    p = experiment_project
    dto = _create_dto(
        p,
        gold_user_id=p[gold_key].id,  # type: ignore[literal-required]
        sdoc_ids=[p[key].id for key in sdoc_keys],  # type: ignore[literal-required]
    )
    response = client.put("/experiment", json=dto.model_dump(mode="json"))
    assert response.status_code == 200, response.text
    assert (
        ExperimentRead.model_validate(response.json()).gold_user_id == dto.gold_user_id
    )


@pytest.mark.parametrize(
    "gold_key,sdoc_keys,missing_key",
    [
        # The gold annotator did not annotate document C.
        pytest.param("gold_user", ["sdoc_a", "sdoc_c"], "sdoc_c", id="gold-user"),
        # The other member annotated only document C.
        pytest.param("other_member", ["sdoc_a", "sdoc_c"], "sdoc_a", id="member"),
        # The virtual user annotated only document A.
        pytest.param("run_user", ["sdoc_a", "sdoc_b"], "sdoc_b", id="virtual-user"),
    ],
)
def test_create_experiment_requires_every_document_annotated_by_the_gold_annotator(
    client: TestClient,
    experiment_project: ExperimentProject,
    gold_key: str,
    sdoc_keys: list[str],
    missing_key: str,
) -> None:
    """Documents the gold annotator did not annotate ("Annotated by") are rejected."""
    p = experiment_project
    dto = _create_dto(
        p,
        gold_user_id=p[gold_key].id,  # type: ignore[literal-required]
        sdoc_ids=[p[key].id for key in sdoc_keys],  # type: ignore[literal-required]
    )
    response = client.put("/experiment", json=dto.model_dump(mode="json"))
    assert response.status_code == 400, response.text
    assert f"did not annotate the documents [{p[missing_key].id}]" in response.text  # type: ignore[literal-required]


@pytest.mark.parametrize(
    "field,key,message",
    [
        # A document of another project.
        pytest.param("sdoc_ids", "foreign_sdoc", "do not belong", id="foreign-sdoc"),
        # A code of another project.
        pytest.param("code_ids", "foreign_code", "do not belong", id="foreign-code"),
        # A user who is no annotator of the project.
        pytest.param("gold_user_id", "outsider", "no annotator", id="outsider-gold"),
    ],
)
def test_create_experiment_rejects_objects_of_other_projects(
    client: TestClient,
    experiment_project: ExperimentProject,
    field: str,
    key: str,
    message: str,
) -> None:
    """Documents, codes and gold annotator must belong to the experiment's project."""
    p = experiment_project
    object_id = p[key].id  # type: ignore[literal-required]
    value = object_id if field == "gold_user_id" else [object_id]
    dto = _create_dto(p, **{field: value})
    response = client.put("/experiment", json=dto.model_dump(mode="json"))
    assert response.status_code == 400, response.text
    assert message in response.text


@pytest.mark.parametrize(
    "changes",
    [
        # Tagging is no annotation task.
        pytest.param({"task_type": TaskType.TAGGING.value}, id="tagging-task"),
        # An experiment needs documents.
        pytest.param({"sdoc_ids": []}, id="no-documents"),
        # An experiment needs codes.
        pytest.param({"code_ids": []}, id="no-codes"),
        # An experiment needs a name.
        pytest.param({"name": ""}, id="empty-name"),
    ],
)
def test_create_experiment_rejects_malformed_payloads(
    client: TestClient, experiment_project: ExperimentProject, changes: dict
) -> None:
    """Malformed payloads fail validation with HTTP 422."""
    payload = _create_dto(experiment_project).model_dump(mode="json") | changes
    response = client.put("/experiment", json=payload)
    assert response.status_code == 422, response.text


def test_create_experiment_rejects_a_duplicate_name(
    client: TestClient, experiment_project: ExperimentProject
) -> None:
    """Experiment names are unique per project."""
    dto = _create_dto(experiment_project, name="ExperimentA")
    response = client.put("/experiment", json=dto.model_dump(mode="json"))
    assert response.status_code == 409, response.text


def test_create_experiment_rejects_a_foreign_project(
    client: TestClient, experiment_project: ExperimentProject
) -> None:
    """Experiments can only be created in the user's projects."""
    p = experiment_project
    dto = _create_dto(
        p,
        project_id=p["other_project"].id,
        sdoc_ids=[p["foreign_sdoc"].id],
        code_ids=[p["foreign_code"].id],
        gold_user_id=p["outsider"].id,
    )
    response = client.put("/experiment", json=dto.model_dump(mode="json"))
    assert response.status_code == 403, response.text


# ===========================================================================
# CREATE RUN (PUT /experiment/run) TESTS
# ===========================================================================


def test_create_run_writes_into_a_new_virtual_user_and_fails_with_an_invalid_model(
    client: TestClient, experiment_project: ExperimentProject
) -> None:
    """A run creates the virtual user ExperimentA-Zero-shot, stores the experiment's
    documents and runs the LLM Assistant job, which fails with an invalid model
    before it calls an LLM; the failed run stores no scores."""
    p = experiment_project
    experiment = p["experiment"]
    dto = ExperimentRunCreate(
        experiment_id=experiment.id,
        name="Zero-shot",
        prompt_version_id=p["span_prompt"].versions[0].id,
        model=INVALID_MODEL,
    )
    response = client.put("/experiment/run", json=dto.model_dump(mode="json"))
    assert response.status_code == 200, response.text
    result = ExperimentRead.model_validate(response.json())

    assert len(result.runs) == 1
    run = result.runs[0]
    assert run.name == "Zero-shot"
    assert run.prompt_version_id == dto.prompt_version_id
    assert run.model == INVALID_MODEL
    assert run.sdoc_ids == experiment.sdoc_ids
    assert run.user_id == p["gold_user"].id
    users_response = client.get(f"/user/{p['project'].id}/user")
    assert users_response.status_code == 200, users_response.text
    virtual_user = next(
        user for user in users_response.json() if user["id"] == run.virtual_user_id
    )
    assert virtual_user["first_name"] == "ExperimentA-Zero-shot"
    assert virtual_user["is_virtual"]

    ended = _wait_for_run(client, experiment.id, run.id)
    assert ended.status == JobStatus.FAILED
    assert ended.job_id is not None
    assert ended.started is not None
    assert ended.finished is not None
    assert ended.scores == []
    assert ended.scores_computed is None


@pytest.mark.parametrize(
    "experiment_key,run_name",
    [
        # ExperimentB already has the run Baseline.
        pytest.param("experiment_with_run", "Baseline", id="run-name-taken"),
        # The virtual user ExperimentA-Manual exists (`manual_user`).
        pytest.param("experiment", "Manual", id="virtual-user-name-taken"),
    ],
)
def test_create_run_rejects_a_taken_name(
    client: TestClient,
    experiment_project: ExperimentProject,
    experiment_key: str,
    run_name: str,
) -> None:
    """Run names are unique per experiment and the run's virtual user name
    <experiment>-<run> is unique per project; no run is created."""
    p = experiment_project
    experiment = p[experiment_key]  # type: ignore[literal-required]
    run_ids = [run.id for run in _get_experiment(client, experiment.id).runs]

    dto = ExperimentRunCreate(
        experiment_id=experiment.id,
        name=run_name,
        prompt_version_id=p["span_prompt"].versions[0].id,
        model=INVALID_MODEL,
    )
    response = client.put("/experiment/run", json=dto.model_dump(mode="json"))
    assert response.status_code == 409, response.text
    assert [run.id for run in _get_experiment(client, experiment.id).runs] == run_ids


@pytest.mark.parametrize(
    "prompt_key,version_index,message",
    [
        # Version 2 selects only Claim, the experiment Claim and Evidence.
        pytest.param("span_prompt", 1, "differ from the experiment", id="other-codes"),
        # Archived prompts are not offered.
        pytest.param("archived_prompt", 0, "archived", id="archived"),
        # A sentence annotation prompt cannot run in a span annotation experiment.
        pytest.param("sentence_prompt", 0, "for task ANNOTATION", id="other-task"),
    ],
)
def test_create_run_rejects_ineligible_prompt_versions(
    client: TestClient,
    experiment_project: ExperimentProject,
    prompt_key: str,
    version_index: int,
    message: str,
) -> None:
    """Only versions of the experiment's task whose codes equal the experiment's
    codes, of prompts that are not archived, can run; no run is created."""
    p = experiment_project
    prompt = p[prompt_key]  # type: ignore[literal-required]
    dto = ExperimentRunCreate(
        experiment_id=p["experiment"].id,
        name="Ineligible",
        prompt_version_id=prompt.versions[version_index].id,
        model=INVALID_MODEL,
    )
    response = client.put("/experiment/run", json=dto.model_dump(mode="json"))
    assert response.status_code == 400, response.text
    assert message in response.text
    assert _get_experiment(client, p["experiment"].id).runs == []


def test_create_run_rejects_nonexistent_prompt_versions_and_foreign_experiments(
    client: TestClient, experiment_project: ExperimentProject
) -> None:
    """An unknown prompt version is 404, an experiment of another project 403."""
    p = experiment_project
    unknown_version = ExperimentRunCreate(
        experiment_id=p["experiment"].id,
        name="Unknown",
        prompt_version_id=999999,
        model="m",
    )
    response = client.put(
        "/experiment/run", json=unknown_version.model_dump(mode="json")
    )
    assert response.status_code == 404, response.text

    foreign = ExperimentRunCreate(
        experiment_id=p["foreign_experiment"].id,
        name="Foreign",
        prompt_version_id=p["span_prompt"].versions[0].id,
        model="m",
    )
    response = client.put("/experiment/run", json=foreign.model_dump(mode="json"))
    assert response.status_code == 403, response.text


@pytest.mark.llm
def test_create_run_stores_the_agreement_when_the_run_finished(
    client: TestClient, experiment_project: ExperimentProject
) -> None:
    """A run with a real LLM finishes and stores its agreement for every scoring,
    with the scores per code in the order of the experiment's codes."""
    p = experiment_project
    experiment = p["experiment"]
    dto = ExperimentRunCreate(
        experiment_id=experiment.id,
        name="Default model",
        prompt_version_id=p["span_prompt"].versions[0].id,
        model="default",
    )
    response = client.put("/experiment/run", json=dto.model_dump(mode="json"))
    assert response.status_code == 200, response.text
    run = ExperimentRead.model_validate(response.json()).runs[0]

    ended = _wait_for_run(client, experiment.id, run.id)
    assert ended.status == JobStatus.FINISHED
    assert ended.scores_computed is not None
    assert [scores.scoring for scores in ended.scores] == list(AgreementScoring)
    for scores in ended.scores:
        assert [s.code_id for s in scores.code_scores] == experiment.code_ids


# ===========================================================================
# GET EXPERIMENT (/experiment/{experiment_id}, /experiment/project/{id}) TESTS
# ===========================================================================


def test_get_by_project_lists_all_experiments_with_their_runs_newest_first(
    client: TestClient, experiment_project: ExperimentProject
) -> None:
    """Both experiments were created in one transaction, so the newer id comes first."""
    p = experiment_project
    response = client.get(f"/experiment/project/{p['project'].id}")
    assert response.status_code == 200, response.text
    experiments = TypeAdapter(list[ExperimentRead]).validate_python(response.json())

    assert [e.name for e in experiments] == ["ExperimentB", "ExperimentA"]
    assert [run.id for run in experiments[0].runs] == [p["run"].id]
    assert experiments[1].runs == []


def test_get_experiment_rejects_foreign_and_unknown_experiments(
    client: TestClient, experiment_project: ExperimentProject
) -> None:
    """Experiments and experiment lists of other projects and unknown experiments
    are forbidden."""
    p = experiment_project
    response = client.get(f"/experiment/{p['foreign_experiment'].id}")
    assert response.status_code == 403, response.text
    response = client.get(f"/experiment/project/{p['other_project'].id}")
    assert response.status_code == 403, response.text
    response = client.get("/experiment/999999")
    assert response.status_code == 403, response.text


# ===========================================================================
# UPDATE EXPERIMENT (PATCH /experiment/{experiment_id}) TESTS
# ===========================================================================


@pytest.mark.parametrize(
    "experiment_key",
    [
        # Without runs.
        pytest.param("experiment", id="no-runs"),
        # The name can always change, also with runs.
        pytest.param("experiment_with_run", id="with-runs"),
    ],
)
def test_update_experiment_renames_with_and_without_runs(
    client: TestClient, experiment_project: ExperimentProject, experiment_key: str
) -> None:
    """Renaming keeps everything else."""
    experiment = experiment_project[experiment_key]  # type: ignore[literal-required]
    response = client.patch(f"/experiment/{experiment.id}", json={"name": "Stage 2"})
    assert response.status_code == 200, response.text
    result = ExperimentRead.model_validate(response.json())
    assert result.name == "Stage 2"
    assert result.sdoc_ids == experiment.sdoc_ids
    assert result.code_ids == experiment.code_ids


def test_update_experiment_renames_the_virtual_users_of_its_runs(
    client: TestClient, experiment_project: ExperimentProject
) -> None:
    """Renaming ExperimentB to Stage 2 renames its run user to Stage 2-Baseline."""
    p = experiment_project
    run_user_id = p["run_user"].id
    response = client.patch(
        f"/experiment/{p['experiment_with_run'].id}", json={"name": "Stage 2"}
    )
    assert response.status_code == 200, response.text
    response = client.get(f"/user/by_id/{run_user_id}")
    assert response.status_code == 200, response.text
    assert response.json()["first_name"] == "Stage 2-Baseline"


def test_update_experiment_rejects_a_name_whose_run_user_name_is_taken(
    client: TestClient, experiment_project: ExperimentProject
) -> None:
    """The virtual user Stage 3-Baseline exists, so ExperimentB cannot be renamed
    to Stage 3; neither the experiment nor its run user changes."""
    p = experiment_project
    experiment = p["experiment_with_run"]
    run_user_id = p["run_user"].id
    response = client.patch(f"/experiment/{experiment.id}", json={"name": "Stage 3"})
    assert response.status_code == 409, response.text
    assert _get_experiment(client, experiment.id).name == "ExperimentB"
    response = client.get(f"/user/by_id/{run_user_id}")
    assert response.status_code == 200, response.text
    assert response.json()["first_name"] == "ExperimentB-Baseline"


@pytest.mark.parametrize(
    "field",
    [
        # Every setting but the name, changed to another valid value.
        pytest.param("sdoc_ids", id="documents"),
        pytest.param("code_ids", id="codes"),
        pytest.param("task_type", id="task"),
        pytest.param("gold_user_id", id="gold-annotator"),
    ],
)
def test_update_experiment_rejects_every_field_but_the_name(
    client: TestClient, experiment_project: ExperimentProject, field: str
) -> None:
    """Documents, codes, task and gold annotator are fixed when an experiment is
    created, also without runs: the update rejects them with 422."""
    p = experiment_project
    values = {
        "sdoc_ids": [p["sdoc_a"].id],
        "code_ids": [p["code_claim"].id],
        "task_type": TaskType.SENTENCE_ANNOTATION.value,
        "gold_user_id": p["run_user"].id,
    }
    experiment = p["experiment"]
    response = client.patch(
        f"/experiment/{experiment.id}", json={"name": "Renamed", field: values[field]}
    )
    assert response.status_code == 422, response.text
    unchanged = _get_experiment(client, experiment.id)
    assert unchanged.name == experiment.name
    assert unchanged.sdoc_ids == experiment.sdoc_ids
    assert unchanged.code_ids == experiment.code_ids
    assert unchanged.task_type == experiment.task_type
    assert unchanged.gold_user_id == experiment.gold_user_id


def test_update_experiment_rejects_empty_and_foreign_updates(
    client: TestClient, experiment_project: ExperimentProject
) -> None:
    """An empty update is 422, an experiment of another project 403."""
    p = experiment_project
    response = client.patch(f"/experiment/{p['experiment'].id}", json={})
    assert response.status_code == 422, response.text
    response = client.patch(
        f"/experiment/{p['foreign_experiment'].id}", json={"name": "x"}
    )
    assert response.status_code == 403, response.text


# ===========================================================================
# REFRESH RUN SCORES (PATCH /experiment/run/{run_id}/scores) TESTS
# ===========================================================================


def test_refresh_run_scores_stores_the_agreement_with_the_gold_annotator(
    client: TestClient, experiment_project: ExperimentProject
) -> None:
    """The agreement of the run is stored for every scoring with its time; the
    counts are those of the fixture docstring."""
    p = experiment_project
    run = p["run"]
    response = client.patch(f"/experiment/run/{run.id}/scores")
    assert response.status_code == 200, response.text
    result = ExperimentRead.model_validate(response.json())
    stored = next(r for r in result.runs if r.id == run.id)

    assert stored.scores_computed is not None
    assert stored.status == JobStatus.FINISHED
    assert [scores.scoring for scores in stored.scores] == list(AgreementScoring)
    for scores in stored.scores:
        assert scores.num_units == 4
        assert _counts(scores.total) == RUN_TOTAL_COUNTS
        assert [(s.code_id, _counts(s)) for s in scores.code_scores] == [
            (p["code_claim"].id, RUN_CLAIM_COUNTS),
            (p["code_evidence"].id, RUN_EVIDENCE_COUNTS),
        ]
        assert scores.total.precision == pytest.approx(0.5)
        assert scores.total.recall == pytest.approx(1 / 3)
        assert scores.total.f1 == pytest.approx(0.4)

    # the run log holds the stored scores as well
    path = _export(client, run.id, ExperimentRunLogFormat.JSON.value)
    log = ExperimentRunLog.model_validate(json.loads(path.read_text()))
    assert log.scores == stored.scores
    assert log.scores_computed == stored.scores_computed


def test_refresh_run_scores_rejects_unknown_runs(
    client: TestClient, experiment_project: ExperimentProject
) -> None:
    """An unknown run is forbidden, like every object the user cannot see."""
    response = client.patch("/experiment/run/999999/scores")
    assert response.status_code == 403, response.text


# ===========================================================================
# DELETE EXPERIMENT (DELETE /experiment/{experiment_id}) TESTS
# ===========================================================================


def test_delete_experiment_deletes_its_runs_virtual_users_and_their_annotations(
    client: TestClient, experiment_project: ExperimentProject
) -> None:
    """The run's virtual user and its annotations are gone, the gold annotations stay."""
    p = experiment_project
    experiment_id = p["experiment_with_run"].id
    run_user_id = p["run_user"].id
    run_anna_id = p["run_anna"].id
    response = client.delete(f"/experiment/{experiment_id}")
    assert response.status_code == 200, response.text
    assert ExperimentRead.model_validate(response.json()).id == experiment_id

    assert client.get(f"/experiment/{experiment_id}").status_code == 403
    assert client.get(f"/user/by_id/{run_user_id}").status_code == 404
    assert client.get(f"/span/{run_anna_id}").status_code == 403
    gold_response = client.get(f"/span/{p['gold_anna'].id}")
    assert gold_response.status_code == 200, gold_response.text
    assert _get_experiment(client, p["experiment"].id).runs == []


def test_delete_experiment_rejects_foreign_experiments(
    client: TestClient, experiment_project: ExperimentProject
) -> None:
    """Experiments of other projects cannot be deleted."""
    p = experiment_project
    response = client.delete(f"/experiment/{p['foreign_experiment'].id}")
    assert response.status_code == 403, response.text


# ===========================================================================
# DELETE RUN (DELETE /experiment/run/{run_id}) TESTS
# ===========================================================================


def test_delete_run_deletes_its_virtual_user_and_annotations(
    client: TestClient, experiment_project: ExperimentProject
) -> None:
    """The experiment stays without the run; the run's virtual user and its
    annotations are gone, the gold annotations stay."""
    p = experiment_project
    experiment_id = p["experiment_with_run"].id
    run_user_id = p["run_user"].id
    run_met_id = p["run_met"].id
    response = client.delete(f"/experiment/run/{p['run'].id}")
    assert response.status_code == 200, response.text
    result = ExperimentRead.model_validate(response.json())

    assert result.id == experiment_id
    assert result.runs == []
    assert client.get(f"/user/by_id/{run_user_id}").status_code == 404
    assert client.get(f"/span/{run_met_id}").status_code == 403
    assert client.get(f"/span/{p['gold_bob'].id}").status_code == 200
    assert _get_experiment(client, result.id).runs == []


def test_delete_run_rejects_unknown_runs(
    client: TestClient, experiment_project: ExperimentProject
) -> None:
    """An unknown run is forbidden, like every object the user cannot see."""
    response = client.delete("/experiment/run/999999")
    assert response.status_code == 403, response.text


# ===========================================================================
# EXPORT RUN LOG (/experiment/run/{run_id}/export_log) TESTS
# ===========================================================================


def _export(client: TestClient, run_id: int, export_format: str) -> Path:
    response = client.post(
        f"/experiment/run/{run_id}/export_log",
        params={"export_format": export_format},
    )
    assert response.status_code == 200, response.text
    filename = Path(response.json()).name
    assert filename.endswith(f".{export_format}")
    return FilesystemRepo().get_dst_path_for_temp_file(filename)


def test_export_run_log_as_json_is_self_contained(
    client: TestClient, experiment_project: ExperimentProject
) -> None:
    """The log names the experiment, users, prompt and holds the full version."""
    p = experiment_project
    run = p["run"]
    path = _export(client, run.id, ExperimentRunLogFormat.JSON.value)
    log = ExperimentRunLog.model_validate(json.loads(path.read_text()))

    version = p["span_prompt"].versions[0]
    assert log.experiment_name == "ExperimentB"
    assert log.task_type == TaskType.ANNOTATION
    assert log.code_ids == [p["code_claim"].id, p["code_evidence"].id]
    assert log.gold_user_name == "Test User"
    assert log.run_name == "Baseline"
    assert log.virtual_user_id == p["run_user"].id
    assert log.virtual_user_name == "ExperimentB-Baseline"
    assert log.prompt_id == p["span_prompt"].id
    assert log.prompt_name == "Claim and Evidence"
    assert log.prompt_version == version
    assert log.model == INVALID_MODEL
    assert log.sdoc_ids == [p["sdoc_a"].id, p["sdoc_b"].id]
    assert log.user_name == "Test User"
    assert log.status == JobStatus.FINISHED
    assert log.scores == []


def test_export_run_log_as_csv_has_a_row_per_scoring_and_code(
    client: TestClient, experiment_project: ExperimentProject
) -> None:
    """After a refresh, the CSV has the total and one row per code for each scoring;
    before, one row without scores."""
    p = experiment_project
    run = p["run"]
    before = pd.read_csv(_export(client, run.id, ExperimentRunLogFormat.CSV.value))
    assert len(before) == 1
    assert bool(before["scoring"].isna().all())
    assert before["virtual_user"].tolist() == ["ExperimentB-Baseline"]

    response = client.patch(f"/experiment/run/{run.id}/scores")
    assert response.status_code == 200, response.text
    after = pd.read_csv(_export(client, run.id, ExperimentRunLogFormat.CSV.value))
    assert list(zip(after["scoring"], after["code_name"])) == [
        (scoring.value, code_name)
        for scoring in AgreementScoring
        for code_name in ["all codes", "Claim", "Evidence"]
    ]
    assert (
        list(
            zip(
                after["true_positives"],
                after["false_positives"],
                after["false_negatives"],
            )
        )
        == [RUN_TOTAL_COUNTS, RUN_CLAIM_COUNTS, RUN_EVIDENCE_COUNTS] * 2
    )
    assert set(after["prompt_name"]) == {"Claim and Evidence"}


def test_export_run_log_rejects_unknown_formats_and_runs(
    client: TestClient, experiment_project: ExperimentProject
) -> None:
    """An unknown format is 422, an unknown run 403."""
    run = experiment_project["run"]
    response = client.post(
        f"/experiment/run/{run.id}/export_log", params={"export_format": "xml"}
    )
    assert response.status_code == 422, response.text
    response = client.post(
        "/experiment/run/999999/export_log", params={"export_format": "json"}
    )
    assert response.status_code == 403, response.text
