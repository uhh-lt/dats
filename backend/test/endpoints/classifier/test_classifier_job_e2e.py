import json
import time
from datetime import UTC, datetime
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from config import conf
from modules.classifier.classifier_dto import (
    ClassifierAveraging,
    ClassifierEvaluationParams,
    ClassifierInferenceParams,
    ClassifierJobInput,
    ClassifierModel,
    ClassifierTask,
    ClassifierTrainingParams,
)
from systems.job_system.job_dto import JobStatus

# Smallest configured base models keep training fast on the GPU runner.
TRANSFORMER_BASE = conf.classifier.transformer_models[0].value
EMBEDDING_BASE = conf.classifier.embedding_models[0].value
METRICS_ARTIFACT = (
    Path(__file__).parents[3] / "test-results" / "classifier-metrics.jsonl"
)


@pytest.fixture(scope="session", autouse=True)
def initialize_metrics_artifact():
    """Create an empty JSONL metrics artifact once for the E2E test session."""
    METRICS_ARTIFACT.parent.mkdir(parents=True, exist_ok=True)
    METRICS_ARTIFACT.write_text("", encoding="utf-8")


def _write_metrics_artifact(report_type: str, data: dict):
    """Append one timestamped report record to the classifier JSONL artifact."""
    record = {
        "recorded_at": datetime.now(UTC).isoformat(),
        "report_type": report_type,
        "data": data,
    }
    with METRICS_ARTIFACT.open("a", encoding="utf-8") as artifact:
        artifact.write(json.dumps(record) + "\n")


# ---------------------------------------------------------------------------
# JOB UTILS (start + poll classifier jobs via the endpoint)
# ---------------------------------------------------------------------------

CLASSIFIER_JOB_URL = "/classifier/classifier"


def _wait_for_job(
    client: TestClient, job_id: str, timeout: float = 600.0, poll_interval: float = 10.0
) -> dict:
    """Poll a classifier job until it finishes and return its endpoint response.

    Fail the test with the job's status message when it fails, is stopped or
    canceled, or does not finish before ``timeout``.
    """
    deadline = time.monotonic() + timeout
    while True:
        response = client.get(f"{CLASSIFIER_JOB_URL}/{job_id}")
        assert response.status_code == 200, response.text
        job = response.json()
        status = job["status"]
        if status == JobStatus.FINISHED.value:
            return job
        if status in (
            JobStatus.FAILED.value,
            JobStatus.STOPPED.value,
            JobStatus.CANCELED.value,
        ):
            pytest.fail(
                f"Classifier job {job_id} ended with status '{status}': "
                f"{job.get('status_message')}"
            )
        if time.monotonic() > deadline:
            pytest.fail(
                f"Classifier job {job_id} did not finish within {timeout}s "
                f"(last status: {status})"
            )
        time.sleep(poll_interval)


def _start_job(client: TestClient, payload: ClassifierJobInput) -> dict:
    """Serialize a typed classifier request, start its job, and return the response."""
    response = client.post(
        CLASSIFIER_JOB_URL,
        json=payload.model_dump(mode="json"),
    )
    assert response.status_code == 200, response.text
    return response.json()


# ---------------------------------------------------------------------------
# HELPERS
# ---------------------------------------------------------------------------


def _training_payload(
    project_id: int,
    model_type: ClassifierModel,
    name: str,
    base_name: str,
    class_ids: list[int],
    user_ids: list[int],
    tag_ids: list[int],
) -> ClassifierJobInput:
    """Build the typed, shared two-epoch training request used by all model E2Es."""
    training_params = ClassifierTrainingParams(
        task_type=ClassifierTask.TRAINING,
        classifier_name=name,
        base_name=base_name,
        adapter_name=None,
        freeze_base_model=True,
        class_ids=class_ids,
        user_ids=user_ids,
        tag_ids=tag_ids,
        merge_children_into_parent=False,
        epochs=2,
        batch_size=4,
        early_stopping=False,
        early_stopping_patience=3,
        train_test_split=0.2,
        learning_rate=0.00001,
        weight_decay=0.01,
        dropout=0.1,
        chunk_size=1024,
        precision="bf16-mixed",
        averaging=ClassifierAveraging.MICRO,
    )
    return ClassifierJobInput(
        project_id=project_id,
        task_type=ClassifierTask.TRAINING,
        model_type=model_type,
        task_parameters=training_params,
    )


def _evaluation_payload(
    project_id: int,
    model_type: ClassifierModel,
    classifier_id: int,
    tag_ids: list[int],
    user_ids: list[int],
) -> ClassifierJobInput:
    """Build a typed evaluation request that reuses the classifier's averaging mode."""
    evaluation_params = ClassifierEvaluationParams(
        task_type=ClassifierTask.EVALUATION,
        classifier_id=classifier_id,
        tag_ids=tag_ids,
        user_ids=user_ids,
        averaging=None,
    )
    return ClassifierJobInput(
        project_id=project_id,
        task_type=ClassifierTask.EVALUATION,
        model_type=model_type,
        task_parameters=evaluation_params,
    )


def _inference_payload(
    project_id: int,
    model_type: ClassifierModel,
    classifier_id: int,
    sdoc_ids: list[int],
) -> ClassifierJobInput:
    """Build a typed inference request that preserves existing annotations."""
    inference_params = ClassifierInferenceParams(
        task_type=ClassifierTask.INFERENCE,
        classifier_id=classifier_id,
        sdoc_ids=sdoc_ids,
        delete_existing_work=False,
    )
    return ClassifierJobInput(
        project_id=project_id,
        task_type=ClassifierTask.INFERENCE,
        model_type=model_type,
        task_parameters=inference_params,
    )


def _assert_metrics_in_range(evaluation: dict):
    """Assert that every persisted overall metric is a valid normalized score."""
    for key in ("f1", "precision", "recall", "accuracy"):
        assert 0.0 <= evaluation[key] <= 1.0, f"{key} out of range: {evaluation[key]}"


def _assert_metrics_expected(
    evaluation: dict,
    min_f1: float,
    min_precision: float,
    min_recall: float,
    min_accuracy: float,
    min_class_f1: float = 0.2,
    max_classes_below_f1_floor: int = 0,
):
    """Assert overall and per-class metrics satisfy conservative regression floors.

    ``max_classes_below_f1_floor`` permits explicitly configured tolerance for
    difficult or low-support classes while retaining a class-level quality
    check for the remainder.
    """
    for key, floor in (
        ("f1", min_f1),
        ("precision", min_precision),
        ("recall", min_recall),
        ("accuracy", min_accuracy),
    ):
        assert evaluation[key] >= floor, (
            f"{key} below expected floor: {evaluation[key]:.4f} < {floor}"
        )
    classes_below_floor = [
        m for m in evaluation.get("class_metrics", []) if m["f1"] < min_class_f1
    ]
    assert len(classes_below_floor) <= max_classes_below_f1_floor, (
        f"{len(classes_below_floor)} classes below F1 floor {min_class_f1}; "
        f"allowed {max_classes_below_f1_floor}: "
        + ", ".join(
            f"class {metric['class_id']}={metric['f1']:.4f}"
            for metric in classes_below_floor
        )
    )


# ---------------------------------------------------------------------------
# REPORTING HELPERS (ASCII tables mirroring the frontend plots)
# ---------------------------------------------------------------------------


def _fmt_row(cells: list[str], widths: list[int]) -> str:
    """Format one row of an ASCII table using the supplied column widths."""
    return "| " + " | ".join(c.ljust(w) for c, w in zip(cells, widths)) + " |"


def _fmt_sep(widths: list[int]) -> str:
    """Format the header separator for an ASCII table."""
    return "|-" + "-|-".join("-" * w for w in widths) + "-|"


def _print_table(title: str, headers: list[str], rows: list[list[str]]):
    """Print a width-aligned ASCII table to captured test output."""
    widths = [len(h) for h in headers]
    for row in rows:
        for i, cell in enumerate(row):
            widths[i] = max(widths[i], len(cell))
    print(f"\n{title}")
    print(_fmt_row(headers, widths))
    print(_fmt_sep(widths))
    for row in rows:
        print(_fmt_row(row, widths))


def _report_training(
    classifier: dict,
    id2name: dict[int, str],
    dataset_tag_name: str,
):
    """Report persisted training data, losses, and internal validation results.

    Write the complete training record to the JSONL artifact, print tables to
    captured output, and report each evaluation stored with the classifier.
    Table headings reflect the configured train/validation split and selection
    tag.
    """
    validation_percentage = classifier["train_params"]["train_test_split"] * 100
    training_percentage = 100 - validation_percentage
    _write_metrics_artifact(
        "training",
        {
            "classifier_id": classifier["id"],
            "classifier_name": classifier["name"],
            "model_type": classifier["type"],
            "train_data_stats": classifier["train_data_stats"],
            "train_loss": classifier["train_loss"],
            "train_params": classifier["train_params"],
            "evaluations": classifier["evaluations"],
            "class_names": id2name,
            "dataset_tag": dataset_tag_name,
        },
    )
    print(
        f"\n{'=' * 72}\nTRAIN  {classifier['name']}  (id={classifier['id']})\n{'=' * 72}"
    )

    stats_rows = [
        [id2name.get(s["class_id"], str(s["class_id"])), str(s["num_examples"])]
        for s in classifier["train_data_stats"]
    ]
    _print_table(
        (
            f"Training data ({training_percentage:g}% split of documents tagged "
            f'"{dataset_tag_name}")'
        ),
        ["class", "examples"],
        stats_rows,
    )

    loss_rows = [
        [str(entry["step"]), f"{entry['value']:.4f}"]
        for entry in classifier["train_loss"]
    ]
    _print_table("Training loss (per epoch)", ["epoch", "loss"], loss_rows)

    for evaluation in classifier["evaluations"]:
        _report_evaluation(
            evaluation,
            id2name,
            title="Training validation",
            dataset_scope=(
                f"{validation_percentage:g}% split of documents tagged "
                f'"{dataset_tag_name}"'
            ),
        )


def _report_evaluation(
    evaluation: dict,
    id2name: dict[int, str],
    title: str,
    dataset_scope: str,
):
    """Report evaluation data counts and overall/per-class metrics.

    Append the report to the JSONL artifact before printing its available data,
    overall scores, and per-class scores to captured test output.
    """
    scoped_title = f"{title} ({dataset_scope})"
    _write_metrics_artifact(
        "evaluation",
        {
            "title": scoped_title,
            "evaluation": evaluation,
            "class_names": id2name,
        },
    )
    stats_rows = [
        [id2name.get(s["class_id"], str(s["class_id"])), str(s["num_examples"])]
        for s in evaluation.get("eval_data_stats", [])
    ]
    if stats_rows:
        _print_table(f"{scoped_title} — data", ["class", "examples"], stats_rows)

    overall = [
        [
            f"{evaluation['precision']:.4f}",
            f"{evaluation['recall']:.4f}",
            f"{evaluation['f1']:.4f}",
            f"{evaluation['accuracy']:.4f}",
        ]
    ]
    _print_table(
        f"{scoped_title} — overall",
        ["precision", "recall", "f1", "accuracy"],
        overall,
    )

    metric_rows = [
        [
            id2name.get(m["class_id"], str(m["class_id"])),
            f"{m['precision']:.4f}",
            f"{m['recall']:.4f}",
            f"{m['f1']:.4f}",
            str(m["support"]),
        ]
        for m in evaluation.get("class_metrics", [])
    ]
    if metric_rows:
        _print_table(
            f"{scoped_title} — per class",
            ["class", "precision", "recall", "f1", "support"],
            metric_rows,
        )


def _report_inference(
    output: dict,
    id2name: dict[int, str],
    dataset_tag_name: str,
):
    """Report inference prediction counts and append them to the JSONL artifact."""
    _write_metrics_artifact(
        "inference",
        {
            "output": output,
            "class_names": id2name,
            "dataset_tag": dataset_tag_name,
        },
    )
    rows = [
        [id2name.get(s["class_id"], str(s["class_id"])), str(s["num_examples"])]
        for s in output["result_statistics"]
    ]
    _print_table(
        (
            f'INFER (documents tagged "{dataset_tag_name}") '
            f"— affected docs: {output['total_affected_docs']}"
        ),
        ["class", "predicted"],
        rows,
    )


# ---------------------------------------------------------------------------
# SPAN (CoNLL)
# ---------------------------------------------------------------------------


def test_span_classifier_train_eval_infer(
    client: TestClient, db_session, conll_span_dataset, test_user
):
    """Train, evaluate, and run inference for span classification on CoNLL-2003.

    Use disjoint tag-selected document subsets for training, held-out
    evaluation, and inference; verify persisted metrics against conservative
    quality floors and retain reports even when an assertion later fails.
    """
    project = conll_span_dataset["project"]
    codes = conll_span_dataset["codes"]
    tags = conll_span_dataset["tags"]
    class_ids = [c.id for c in codes.values()]
    id2name = {c.id: name for name, c in codes.items()}

    # TRAIN on the training-data subset
    job = _start_job(
        client,
        _training_payload(
            project.id,
            ClassifierModel.SPAN,
            "span-clf",
            TRANSFORMER_BASE,
            class_ids,
            [test_user.id],
            [tags["train"].id],
        ),
    )
    finished = _wait_for_job(client, job["job_id"])
    output = finished["output"]["task_output"]
    classifier = output["classifier"]
    _report_training(classifier, id2name, tags["train"].name)
    assert classifier["type"] == "span"
    assert len(classifier["evaluations"]) == 1
    _assert_metrics_in_range(classifier["evaluations"][0])
    # Floors leave headroom below the observed two-epoch CoNLL metrics while
    # still detecting a materially degraded training run.
    _assert_metrics_expected(
        classifier["evaluations"][0],
        min_f1=0.65,
        min_precision=0.58,
        min_recall=0.70,
        min_accuracy=0.85,
    )
    classifier_id = classifier["id"]

    # EVALUATE on the held-out evaluation-data subset
    eval_job = _start_job(
        client,
        _evaluation_payload(
            project.id,
            ClassifierModel.SPAN,
            classifier_id,
            [tags["eval"].id],
            [test_user.id],
        ),
    )
    eval_finished = _wait_for_job(client, eval_job["job_id"])
    eval_output = eval_finished["output"]["task_output"]
    _report_evaluation(
        eval_output["evaluation"],
        id2name,
        title="Held-out evaluation",
        dataset_scope=f'documents tagged "{tags["eval"].name}"',
    )
    _assert_metrics_in_range(eval_output["evaluation"])
    _assert_metrics_expected(
        eval_output["evaluation"],
        min_f1=0.65,
        min_precision=0.58,
        min_recall=0.70,
        min_accuracy=0.85,
    )
    # INFER on the held-out test-data subset
    infer_job = _start_job(
        client,
        _inference_payload(
            project.id,
            ClassifierModel.SPAN,
            classifier_id,
            conll_span_dataset["subset2sdoc_ids"]["test"][:5],
        ),
    )
    infer_finished = _wait_for_job(client, infer_job["job_id"])
    infer_output = infer_finished["output"]["task_output"]
    _report_inference(infer_output, id2name, tags["test"].name)
    assert infer_output["total_affected_docs"] >= 0


# ---------------------------------------------------------------------------
# DOCUMENT (20 Newsgroups)
# ---------------------------------------------------------------------------


def test_document_classifier_train_eval_infer(
    client: TestClient, db_session, news20_doc_dataset
):
    """Train, evaluate, and run inference for document classification on 20NG.

    Use disjoint tag-selected document subsets, validate document-level overall
    metrics, and require all but one low-support class to meet the per-class F1
    floor. Reports are persisted before quality assertions run.
    """
    project = news20_doc_dataset["project"]
    tags = news20_doc_dataset["tags"]
    subset_tags = news20_doc_dataset["subset_tags"]
    class_ids = [t.id for t in tags.values()]
    id2name = {t.id: name for name, t in tags.items()}

    # TRAIN on the training-data subset
    job = _start_job(
        client,
        _training_payload(
            project.id,
            ClassifierModel.DOCUMENT,
            "doc-clf",
            TRANSFORMER_BASE,
            class_ids,
            [],
            [subset_tags["train"].id],
        ),
    )
    finished = _wait_for_job(client, job["job_id"])
    output = finished["output"]["task_output"]
    classifier = output["classifier"]
    _report_training(classifier, id2name, subset_tags["train"].name)
    assert classifier["type"] == "document"
    assert len(classifier["evaluations"]) == 1
    _assert_metrics_in_range(classifier["evaluations"][0])
    # Correct document-level runs reach roughly 0.62-0.68 micro-F1. Keep a
    # conservative overall floor and tolerate the single small, difficult
    # talk.religion.misc class falling below the per-class floor.
    _assert_metrics_expected(
        classifier["evaluations"][0],
        min_f1=0.58,
        min_precision=0.58,
        min_recall=0.58,
        min_accuracy=0.58,
        min_class_f1=0.35,
        max_classes_below_f1_floor=1,
    )
    classifier_id = classifier["id"]

    # EVALUATE on the held-out evaluation-data subset
    eval_job = _start_job(
        client,
        _evaluation_payload(
            project.id,
            ClassifierModel.DOCUMENT,
            classifier_id,
            [subset_tags["eval"].id],
            [],
        ),
    )
    eval_finished = _wait_for_job(client, eval_job["job_id"])
    eval_output = eval_finished["output"]["task_output"]
    _report_evaluation(
        eval_output["evaluation"],
        id2name,
        title="Held-out evaluation",
        dataset_scope=f'documents tagged "{subset_tags["eval"].name}"',
    )
    _assert_metrics_in_range(eval_output["evaluation"])
    _assert_metrics_expected(
        eval_output["evaluation"],
        min_f1=0.58,
        min_precision=0.58,
        min_recall=0.58,
        min_accuracy=0.58,
        min_class_f1=0.35,
        max_classes_below_f1_floor=1,
    )
    # INFER on the held-out test-data subset
    infer_job = _start_job(
        client,
        _inference_payload(
            project.id,
            ClassifierModel.DOCUMENT,
            classifier_id,
            news20_doc_dataset["subset2sdoc_ids"]["test"][:5],
        ),
    )
    infer_finished = _wait_for_job(client, infer_job["job_id"])
    infer_output = infer_finished["output"]["task_output"]
    _report_inference(infer_output, id2name, subset_tags["test"].name)
    assert infer_output["total_affected_docs"] >= 0


# ---------------------------------------------------------------------------
# SENTENCE (CSAbstruct)
# ---------------------------------------------------------------------------


def test_sentence_classifier_train_eval_infer(
    client: TestClient, db_session, csabstruct_sent_dataset, test_user
):
    """Train, evaluate, and run inference for sentence classification on CSAbstruct.

    Use disjoint tag-selected document subsets and the selected annotator,
    assert conservative overall and per-class metric floors, and persist each
    report before evaluating its quality.
    """
    project = csabstruct_sent_dataset["project"]
    codes = csabstruct_sent_dataset["codes"]
    tags = csabstruct_sent_dataset["tags"]
    class_ids = [c.id for c in codes.values()]
    id2name = {c.id: name for name, c in codes.items()}

    # TRAIN on the training-data subset
    job = _start_job(
        client,
        _training_payload(
            project.id,
            ClassifierModel.SENTENCE,
            "sent-clf",
            EMBEDDING_BASE,
            class_ids,
            [test_user.id],
            [tags["train"].id],
        ),
    )
    finished = _wait_for_job(client, job["job_id"])
    output = finished["output"]["task_output"]
    classifier = output["classifier"]
    _report_training(classifier, id2name, tags["train"].name)
    assert classifier["type"] == "sentence"
    assert len(classifier["evaluations"]) == 1
    _assert_metrics_in_range(classifier["evaluations"][0])
    # CSAbstruct with gte-modernbert-base reaches ~0.65 micro-f1; 0.45 is a safe floor.
    _assert_metrics_expected(
        classifier["evaluations"][0],
        min_f1=0.45,
        min_precision=0.45,
        min_recall=0.45,
        min_accuracy=0.45,
    )
    classifier_id = classifier["id"]

    # EVALUATE on the held-out evaluation-data subset
    eval_job = _start_job(
        client,
        _evaluation_payload(
            project.id,
            ClassifierModel.SENTENCE,
            classifier_id,
            [tags["eval"].id],
            [test_user.id],
        ),
    )
    eval_finished = _wait_for_job(client, eval_job["job_id"])
    eval_output = eval_finished["output"]["task_output"]
    _report_evaluation(
        eval_output["evaluation"],
        id2name,
        title="Held-out evaluation",
        dataset_scope=f'documents tagged "{tags["eval"].name}"',
    )
    _assert_metrics_in_range(eval_output["evaluation"])
    _assert_metrics_expected(
        eval_output["evaluation"],
        min_f1=0.45,
        min_precision=0.45,
        min_recall=0.45,
        min_accuracy=0.45,
    )
    # INFER on the held-out test-data subset
    infer_job = _start_job(
        client,
        _inference_payload(
            project.id,
            ClassifierModel.SENTENCE,
            classifier_id,
            csabstruct_sent_dataset["subset2sdoc_ids"]["test"][:5],
        ),
    )
    infer_finished = _wait_for_job(client, infer_job["job_id"])
    infer_output = infer_finished["output"]["task_output"]
    _report_inference(infer_output, id2name, tags["test"].name)
    assert infer_output["total_affected_docs"] >= 0


# ---------------------------------------------------------------------------
# ERROR PATHS
# ---------------------------------------------------------------------------


def test_train_job_invalid_base_model(client: TestClient, test_project):
    """A typed training job with an unknown Hugging Face model fails clearly."""
    payload = _training_payload(
        test_project.id,
        ClassifierModel.SPAN,
        "bad-clf",
        "this-model-does-not-exist-xyz",
        [],
        [],
        [],
    )
    job = _start_job(client, payload)
    # The job should fail; _wait_for_job fails the test with the status message.
    # We poll manually here to assert on the failure message instead.
    deadline = time.monotonic() + 120
    while True:
        r = client.get(f"{CLASSIFIER_JOB_URL}/{job['job_id']}")
        j = r.json()
        if j["status"] == "failed":
            assert "does not exist" in (j.get("status_message") or "").lower()
            break
        if j["status"] == "finished":
            pytest.fail("Training with a bogus base model unexpectedly succeeded")
        if time.monotonic() > deadline:
            pytest.fail("Job did not reach failed state in time")
        time.sleep(2)
