import csv
import json
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal, Self, TypedDict

import pytest
from fastapi.testclient import TestClient
from pydantic import Field

from config import conf
from modules.classifier.classifier_dto import (
    ClassifierAveraging,
    ClassifierEvaluationParams,
    ClassifierEvaluationRead,
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
# REQUEST PAYLOADS
# ---------------------------------------------------------------------------


class ClassifierTrainingTestPayload(TypedDict):
    freeze_base_model: bool
    lora_enabled: bool
    classifier_name_suffix: str


classifier_training_params = [
    pytest.param(
        {
            "freeze_base_model": True,
            "lora_enabled": False,
            "classifier_name_suffix": "frozen-base",
        },
        id="train-head-only",
    ),
    pytest.param(
        {
            "freeze_base_model": False,
            "lora_enabled": False,
            "classifier_name_suffix": "full-model",
        },
        id="train-full-model",
    ),
    pytest.param(
        {
            "freeze_base_model": True,
            "lora_enabled": True,
            "classifier_name_suffix": "lora",
        },
        id="train-lora",
    ),
]


def _training_payload(
    project_id: int,
    model_type: ClassifierModel,
    name: str,
    base_name: str,
    class_ids: list[int],
    user_ids: list[int],
    tag_ids: list[int],
    freeze_base_model: bool,
    lora_enabled: bool,
) -> ClassifierJobInput:
    """Build a typed two-epoch request for full, head-only, or LoRA training."""
    training_params = ClassifierTrainingParams(
        task_type=ClassifierTask.TRAINING,
        classifier_name=name,
        base_name=base_name,
        lora_enabled=lora_enabled,
        lora_rank=16,
        lora_alpha=32,
        lora_dropout=0.05,
        freeze_base_model=freeze_base_model,
        class_ids=class_ids,
        user_ids=user_ids,
        tag_ids=tag_ids,
        merge_children_into_parent=False,
        epochs=2,
        batch_size=4,
        early_stopping=False,
        early_stopping_patience=3,
        train_test_split=0.2,
        base_learning_rate=0.00001,
        head_learning_rate=0.0001,
        warmup_fraction=0.1,
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
    merge_children_into_parent: bool = False,
) -> ClassifierJobInput:
    """Build a typed evaluation request with explicit dataset semantics."""
    evaluation_params = ClassifierEvaluationParams(
        task_type=ClassifierTask.EVALUATION,
        classifier_id=classifier_id,
        tag_ids=tag_ids,
        user_ids=user_ids,
        merge_children_into_parent=merge_children_into_parent,
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


# ---------------------------------------------------------------------------
# METRIC ASSERTIONS
# ---------------------------------------------------------------------------


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
# METRIC ARTIFACTS
# ---------------------------------------------------------------------------

METRICS_ARTIFACT_DIR = Path(__file__).parents[3] / "test-results"
METRICS_ARTIFACTS = {
    ClassifierModel.SPAN: METRICS_ARTIFACT_DIR / "span-classification.csv",
    ClassifierModel.DOCUMENT: METRICS_ARTIFACT_DIR / "doc-classification.csv",
    ClassifierModel.SENTENCE: METRICS_ARTIFACT_DIR / "sent-classification.csv",
}


class MetricArtifactRow(ClassifierTrainingParams):
    """One classifier run's training configuration and held-out metrics."""

    task_type: Literal[ClassifierTask.TRAINING] = Field(exclude=True)
    recorded_at: datetime
    accuracy: float
    precision: float
    recall: float
    f1: float
    class_f1_scores: dict[str, float] = Field(exclude=True)

    @classmethod
    def from_run(
        cls,
        training_params: ClassifierTrainingParams,
        evaluation: ClassifierEvaluationRead,
        id2name: dict[int, str],
    ) -> Self:
        """Combine one typed training request and its held-out evaluation."""
        return cls(
            **training_params.model_dump(),
            recorded_at=datetime.now(UTC),
            accuracy=evaluation.accuracy,
            precision=evaluation.precision,
            recall=evaluation.recall,
            f1=evaluation.f1,
            class_f1_scores={
                id2name[metric.class_id]: metric.f1
                for metric in evaluation.class_metrics
            },
        )

    def to_csv_row(self) -> dict[str, str | int | float | bool]:
        """Flatten class F1 scores and serialize this run as one CSV row."""
        serialized_row = self.model_dump(mode="json")
        serialized_row.update(
            {
                f"{class_name}_f1": f1
                for class_name, f1 in sorted(self.class_f1_scores.items())
            }
        )

        csv_row: dict[str, str | int | float | bool] = {}
        for column, value in serialized_row.items():
            if isinstance(value, (dict, list)):
                csv_row[column] = json.dumps(value, sort_keys=True)
            elif value is None:
                csv_row[column] = ""
            else:
                csv_row[column] = value
        return csv_row


@pytest.fixture(scope="session", autouse=True)
def initialize_metrics_artifact():
    """Create one empty classifier metrics CSV per E2E dataset."""
    METRICS_ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    for artifact in METRICS_ARTIFACTS.values():
        artifact.write_text("", encoding="utf-8")


def _write_metrics_artifact(
    model_type: ClassifierModel,
    row: MetricArtifactRow,
) -> None:
    """Append one run, with dataset-specific class F1 columns, to its CSV."""
    artifact = METRICS_ARTIFACTS[model_type]
    csv_row = row.to_csv_row()
    fieldnames = list(csv_row)

    write_header = artifact.stat().st_size == 0
    if not write_header:
        with artifact.open(encoding="utf-8", newline="") as file:
            existing_fieldnames = next(csv.reader(file))
        if existing_fieldnames != fieldnames:
            raise ValueError(
                f"Metrics columns changed between {model_type.value} runs: "
                f"{existing_fieldnames} != {fieldnames}"
            )

    with artifact.open("a", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        if write_header:
            writer.writeheader()
        writer.writerow(csv_row)


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
    """Report persisted training data and epoch losses.

    Table headings reflect the configured training split and selection tag.
    """
    validation_percentage = classifier["train_params"]["train_test_split"] * 100
    training_percentage = 100 - validation_percentage
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


def _report_evaluation(
    evaluation: dict,
    id2name: dict[int, str],
    title: str,
    dataset_scope: str,
):
    """Report evaluation data counts and overall/per-class metrics.

    Print the available data, overall scores, and per-class scores to captured
    test output.
    """
    scoped_title = f"{title} ({dataset_scope})"
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
    """Report inference prediction counts to captured test output."""
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


@pytest.mark.parametrize("payload", classifier_training_params)
def test_span_classifier_train_eval_infer(
    client: TestClient,
    db_session,
    conll_span_dataset,
    test_user,
    payload: ClassifierTrainingTestPayload,
):
    """Train, evaluate, and run inference for span classification on CoNLL-2003.

    Run with head-only training, complete-model training, and LoRA training.
    Train on the training split, validate on its remaining split, evaluate on a
    separate held-out subset, and infer on the test subset. Apply conservative
    quality floors to both evaluations.
    """
    project = conll_span_dataset["project"]
    codes = conll_span_dataset["codes"]
    tags = conll_span_dataset["tags"]
    class_ids = [c.id for c in codes.values()]
    id2name = {c.id: name for name, c in codes.items()}

    # TRAIN on the training split of the training-data subset
    training_request = _training_payload(
        project.id,
        ClassifierModel.SPAN,
        f"span-clf-{payload['classifier_name_suffix']}",
        TRANSFORMER_BASE,
        class_ids,
        [test_user.id],
        [tags["train"].id],
        payload["freeze_base_model"],
        payload["lora_enabled"],
    )
    training_params = training_request.task_parameters
    assert isinstance(training_params, ClassifierTrainingParams)
    train_job = _start_job(client, training_request)
    train_finished = _wait_for_job(client, train_job["job_id"])
    train_output = train_finished["output"]["task_output"]
    classifier = train_output["classifier"]
    _report_training(classifier, id2name, tags["train"].name)
    assert classifier["type"] == "span"
    assert len(classifier["evaluations"]) == 1
    classifier_id = classifier["id"]

    # VALIDATE on the validation split of the training-data subset
    training_validation = classifier["evaluations"][0]
    validation_percentage = classifier["train_params"]["train_test_split"] * 100
    _report_evaluation(
        training_validation,
        id2name,
        title="Training validation",
        dataset_scope=(
            f"{validation_percentage:g}% split of documents tagged "
            f'"{tags["train"].name}"'
        ),
    )
    _assert_metrics_in_range(training_validation)
    _assert_metrics_expected(
        training_validation,
        min_f1=0.65,
        min_precision=0.58,
        min_recall=0.70,
        min_accuracy=0.85,
    )

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
    evaluation = ClassifierEvaluationRead.model_validate(eval_output["evaluation"])
    _write_metrics_artifact(
        ClassifierModel.SPAN,
        MetricArtifactRow.from_run(training_params, evaluation, id2name),
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


@pytest.mark.parametrize("payload", classifier_training_params)
def test_document_classifier_train_eval_infer(
    client: TestClient,
    db_session,
    news20_doc_dataset,
    payload: ClassifierTrainingTestPayload,
):
    """Train, evaluate, and run inference for document classification on 20NG.

    Run with head-only training, complete-model training, and LoRA training.
    Train on the training split, validate on its remaining split, evaluate on a
    separate held-out subset, and infer on the test subset. Require all but one
    low-support class to meet the per-class F1 floor in both evaluations.
    """
    project = news20_doc_dataset["project"]
    tags = news20_doc_dataset["tags"]
    subset_tags = news20_doc_dataset["subset_tags"]
    class_ids = [t.id for t in tags.values()]
    id2name = {t.id: name for name, t in tags.items()}

    # TRAIN on the training split of the training-data subset
    training_request = _training_payload(
        project.id,
        ClassifierModel.DOCUMENT,
        f"doc-clf-{payload['classifier_name_suffix']}",
        TRANSFORMER_BASE,
        class_ids,
        [],
        [subset_tags["train"].id],
        payload["freeze_base_model"],
        payload["lora_enabled"],
    )
    training_params = training_request.task_parameters
    assert isinstance(training_params, ClassifierTrainingParams)
    train_job = _start_job(client, training_request)
    train_finished = _wait_for_job(client, train_job["job_id"])
    train_output = train_finished["output"]["task_output"]
    classifier = train_output["classifier"]
    _report_training(classifier, id2name, subset_tags["train"].name)
    assert classifier["type"] == "document"
    assert len(classifier["evaluations"]) == 1
    classifier_id = classifier["id"]

    # VALIDATE on the validation split of the training-data subset
    training_validation = classifier["evaluations"][0]
    validation_percentage = classifier["train_params"]["train_test_split"] * 100
    _report_evaluation(
        training_validation,
        id2name,
        title="Training validation",
        dataset_scope=(
            f"{validation_percentage:g}% split of documents tagged "
            f'"{subset_tags["train"].name}"'
        ),
    )
    _assert_metrics_in_range(training_validation)
    _assert_metrics_expected(
        training_validation,
        min_f1=0.58,
        min_precision=0.58,
        min_recall=0.58,
        min_accuracy=0.58,
        min_class_f1=0.35,
        max_classes_below_f1_floor=1,
    )

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
    evaluation = ClassifierEvaluationRead.model_validate(eval_output["evaluation"])
    _write_metrics_artifact(
        ClassifierModel.DOCUMENT,
        MetricArtifactRow.from_run(training_params, evaluation, id2name),
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


@pytest.mark.parametrize("payload", classifier_training_params)
def test_sentence_classifier_train_eval_infer(
    client: TestClient,
    db_session,
    csabstruct_sent_dataset,
    test_user,
    payload: ClassifierTrainingTestPayload,
):
    """Train, evaluate, and run inference for sentence classification on CSAbstruct.

    Run with head-only training, complete-model training, and LoRA training.
    Train on the training split, validate on its remaining split, evaluate on a
    separate held-out subset, and infer on the test subset using the selected
    annotator. Apply conservative quality floors to both evaluations.
    """
    project = csabstruct_sent_dataset["project"]
    codes = csabstruct_sent_dataset["codes"]
    tags = csabstruct_sent_dataset["tags"]
    class_ids = [c.id for c in codes.values()]
    id2name = {c.id: name for name, c in codes.items()}

    # TRAIN on the training split of the training-data subset
    training_request = _training_payload(
        project.id,
        ClassifierModel.SENTENCE,
        f"sent-clf-{payload['classifier_name_suffix']}",
        EMBEDDING_BASE,
        class_ids,
        [test_user.id],
        [tags["train"].id],
        payload["freeze_base_model"],
        payload["lora_enabled"],
    )
    training_params = training_request.task_parameters
    assert isinstance(training_params, ClassifierTrainingParams)
    train_job = _start_job(client, training_request)
    train_finished = _wait_for_job(client, train_job["job_id"])
    train_output = train_finished["output"]["task_output"]
    classifier = train_output["classifier"]
    _report_training(classifier, id2name, tags["train"].name)
    assert classifier["type"] == "sentence"
    assert len(classifier["evaluations"]) == 1
    classifier_id = classifier["id"]

    # VALIDATE on the validation split of the training-data subset
    training_validation = classifier["evaluations"][0]
    validation_percentage = classifier["train_params"]["train_test_split"] * 100
    _report_evaluation(
        training_validation,
        id2name,
        title="Training validation",
        dataset_scope=(
            f"{validation_percentage:g}% split of documents tagged "
            f'"{tags["train"].name}"'
        ),
    )
    _assert_metrics_in_range(training_validation)
    _assert_metrics_expected(
        training_validation,
        min_f1=0.45,
        min_precision=0.45,
        min_recall=0.45,
        min_accuracy=0.45,
    )

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
    evaluation = ClassifierEvaluationRead.model_validate(eval_output["evaluation"])
    _write_metrics_artifact(
        ClassifierModel.SENTENCE,
        MetricArtifactRow.from_run(training_params, evaluation, id2name),
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
        True,
        False,
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
