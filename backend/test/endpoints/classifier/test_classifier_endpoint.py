import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from config import conf
from modules.classifier.classifier_dto import (
    ClassifierAveraging,
    ClassifierDatasetStatisticsRequest,
    ClassifierJobInput,
    ClassifierModel,
    ClassifierRead,
    ClassifierTask,
    ClassifierTrainingParams,
    ClassifierUpdate,
)

# ---------------------------------------------------------------------------
# CLASSIFIER INFO
# ---------------------------------------------------------------------------


def test_get_classifier_info(client: TestClient):
    """Classifier info exposes every frontend setting from server configuration."""
    response = client.get("/classifier/info")
    assert response.status_code == 200, response.text
    data = response.json()
    expected_transformer = [m.value for m in conf.classifier.transformer_models]
    expected_embedding = [m.value for m in conf.classifier.embedding_models]
    assert [m["value"] for m in data["transformer_models"]] == expected_transformer
    assert [m["value"] for m in data["embedding_models"]] == expected_embedding
    assert data["weak_signal_threshold"] == conf.classifier.weak_signal_threshold
    assert data["strong_signal_threshold"] == conf.classifier.strong_signal_threshold
    assert data["training_params"] == conf.classifier.training_params.model_dump(
        mode="json"
    )


# ---------------------------------------------------------------------------
# LIST / RENAME / DELETE
# ---------------------------------------------------------------------------


def test_list_classifiers_empty(client: TestClient, test_project):
    """Listing classifiers of a fresh project returns an empty list."""
    response = client.get(f"/classifier/project/{test_project.id}")
    assert response.status_code == 200, response.text
    assert response.json() == []


def test_list_classifiers(client: TestClient, test_project, persisted_classifier):
    """Listing classifiers returns the persisted classifier with matching id and name."""
    response = client.get(f"/classifier/project/{test_project.id}")
    assert response.status_code == 200, response.text
    classifiers = [ClassifierRead.model_validate(c) for c in response.json()]
    assert len(classifiers) == 1
    assert classifiers[0].id == persisted_classifier["classifier_id"]
    assert classifiers[0].name == "Test Classifier"


def test_rename_classifier(client: TestClient, persisted_classifier):
    """PATCH /classifier/{id} renames the classifier and returns the new name."""
    clf_id = persisted_classifier["classifier_id"]
    request = ClassifierUpdate(name="Renamed")
    response = client.patch(
        f"/classifier/{clf_id}",
        json=request.model_dump(mode="json"),
    )
    assert response.status_code == 200, response.text
    assert response.json()["name"] == "Renamed"


def test_delete_classifier_removes_dir_and_db_row(
    client: TestClient, test_project, persisted_classifier
):
    """DELETE /classifier/{id} removes both the on-disk model directory and the
    classifier's database row (it no longer appears in the project listing)."""
    clf_id = persisted_classifier["classifier_id"]
    model_dir = persisted_classifier["model_dir"]
    assert model_dir.exists()

    response = client.delete(f"/classifier/{clf_id}")
    assert response.status_code == 200, response.text
    assert not model_dir.exists()

    response = client.get(f"/classifier/project/{test_project.id}")
    assert response.status_code == 200, response.text
    assert response.json() == []


# ---------------------------------------------------------------------------
# JOB INPUT VALIDATION
# ---------------------------------------------------------------------------


def test_start_job_invalid_task_type(client: TestClient, test_project):
    """Starting a job with an unknown task_type in task_parameters is rejected with 422."""
    payload = {
        "project_id": test_project.id,
        "task_type": "training",
        "model_type": "span",
        "task_parameters": {"task_type": "bogus"},
    }
    response = client.post("/classifier/classifier", json=payload)
    assert response.status_code == 422, response.text


def test_start_job_missing_params(client: TestClient, test_project):
    """Starting a training job without the required task parameters is rejected with 422."""
    payload = {
        "project_id": test_project.id,
        "task_type": "training",
        "model_type": "span",
        "task_parameters": {"task_type": "training"},
    }
    response = client.post("/classifier/classifier", json=payload)
    assert response.status_code == 422, response.text


def test_start_job_nonexistent_project(client: TestClient):
    """Starting a job for a nonexistent project is rejected with 403 or 404."""
    training_params = ClassifierTrainingParams(
        task_type=ClassifierTask.TRAINING,
        classifier_name="x",
        base_name="x",
        lora_enabled=False,
        lora_rank=16,
        lora_alpha=32,
        lora_dropout=0.05,
        freeze_base_model=True,
        class_ids=[1],
        user_ids=[1],
        tag_ids=[],
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
    request = ClassifierJobInput(
        project_id=999999,
        task_type=ClassifierTask.TRAINING,
        model_type=ClassifierModel.SPAN,
        task_parameters=training_params,
    )
    response = client.post(
        "/classifier/classifier",
        json=request.model_dump(mode="json"),
    )
    assert response.status_code in (403, 404), response.text


def test_training_params_reject_lora_without_frozen_base_model():
    """LoRA training cannot be configured with a trainable base model."""
    with pytest.raises(
        ValidationError,
        match="LoRA requires freeze_base_model to be enabled",
    ):
        ClassifierTrainingParams(
            task_type=ClassifierTask.TRAINING,
            classifier_name="invalid-lora",
            base_name="base-model",
            lora_enabled=True,
            lora_rank=16,
            lora_alpha=32,
            lora_dropout=0.05,
            freeze_base_model=False,
            class_ids=[1],
            user_ids=[1],
            tag_ids=[1],
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


# ---------------------------------------------------------------------------
# DATASET STATISTICS
# ---------------------------------------------------------------------------


def _request_dataset_statistics(
    client: TestClient,
    project_id: int,
    model: ClassifierModel,
    class_ids: list[int],
    base_model_name: str,
    *,
    tag_ids: list[int] | None = None,
    user_ids: list[int] | None = None,
    merge_children_into_parent: bool = False,
):
    """Request statistics for one typed classifier dataset configuration.

    Asserts the request succeeds; tag, annotator, and merge-children selections
    can be supplied as keyword arguments.
    """
    request = ClassifierDatasetStatisticsRequest(
        model=model,
        base_model_name=base_model_name,
        tag_ids=tag_ids or [],
        user_ids=user_ids or [],
        class_ids=class_ids,
        merge_children_into_parent=merge_children_into_parent,
    )
    response = client.post(
        f"/classifier/project/{project_id}/dataset-statistics",
        json=request.model_dump(mode="json"),
    )
    assert response.status_code == 200, response.text
    return response.json()


def _assert_signal_statistics(data: dict):
    signal_percentage = data["signal_percentage"]
    if signal_percentage < conf.classifier.weak_signal_threshold:
        expected_signal_strength = "weak"
    elif signal_percentage <= conf.classifier.strong_signal_threshold:
        expected_signal_strength = "ok"
    else:
        expected_signal_strength = "strong"

    assert data["signal_strength"] == expected_signal_strength
    assert data["weak_signal_threshold"] == conf.classifier.weak_signal_threshold
    assert data["strong_signal_threshold"] == conf.classifier.strong_signal_threshold


def _assert_dataset_statistics(
    data: dict,
    *,
    total_units: int,
    labeled_units: int,
    signal_percentage: float,
    expected_classes: dict[int, tuple[int, int, float]],
):
    assert data["total_units"] == total_units
    assert data["labeled_units"] == labeled_units
    assert data["signal_percentage"] == signal_percentage
    _assert_signal_statistics(data)
    assert data["problematic_sdocs"] == []
    assert data["unannotated_sdocs"] == []

    assert len(data["classes"]) == len(expected_classes)
    classes = {cls["class_id"]: cls for cls in data["classes"]}
    assert set(classes) == set(expected_classes)
    for class_id, (
        num_examples,
        num_units,
        unit_percentage,
    ) in expected_classes.items():
        assert classes[class_id]["num_examples"] == num_examples
        assert classes[class_id]["num_units"] == num_units
        assert classes[class_id]["unit_percentage"] == unit_percentage


def test_dataset_statistics_span(
    client: TestClient, span_statistics_dataset, test_user
):
    """Span statistics over a compact fixture report exact unit counts, a valid
    signal strength, and exactly the requested code ids."""
    base_model = conf.classifier.transformer_models[0].value
    codes = span_statistics_dataset["codes"]
    tags = span_statistics_dataset["tags"]
    data = _request_dataset_statistics(
        client,
        span_statistics_dataset["project"].id,
        ClassifierModel.SPAN,
        [c.id for c in codes.values()],
        base_model,
        tag_ids=[tags["train"].id, tags["eval"].id, tags["test"].id],
        user_ids=[test_user.id],
    )
    _assert_dataset_statistics(
        data,
        total_units=40,
        labeled_units=10,
        signal_percentage=0.25,
        expected_classes={
            codes["PER"].id: (1, 1, 0.025),
            codes["ORG"].id: (1, 2, 0.05),
            codes["LOC"].id: (1, 3, 0.075),
            codes["MISC"].id: (1, 4, 0.1),
        },
    )


def test_dataset_statistics_span_reports_excluded_documents(
    client: TestClient, span_statistics_dataset, test_user
):
    """Span statistics list tagged documents excluded by the selected class filter."""
    base_model = conf.classifier.transformer_models[0].value
    codes = span_statistics_dataset["codes"]
    tags = span_statistics_dataset["tags"]
    data = _request_dataset_statistics(
        client,
        span_statistics_dataset["project"].id,
        ClassifierModel.SPAN,
        [codes["PER"].id],
        base_model,
        tag_ids=[tags["train"].id, tags["eval"].id, tags["test"].id],
        user_ids=[test_user.id],
    )
    assert data["total_units"] == 10
    assert data["labeled_units"] == 1
    assert len(data["unannotated_sdocs"]) == 3


def test_dataset_statistics_document(client: TestClient, document_statistics_dataset):
    """Document statistics over a compact fixture count every imported document
    as labeled and return exactly the requested tag ids."""
    base_model = conf.classifier.transformer_models[0].value
    tags = document_statistics_dataset["tags"]
    subset_tags = document_statistics_dataset["subset_tags"]
    data = _request_dataset_statistics(
        client,
        document_statistics_dataset["project"].id,
        ClassifierModel.DOCUMENT,
        [t.id for t in tags.values()],
        base_model,
        tag_ids=[
            subset_tags["train"].id,
            subset_tags["eval"].id,
            subset_tags["test"].id,
        ],
    )
    _assert_dataset_statistics(
        data,
        total_units=len(tags),
        labeled_units=len(tags),
        signal_percentage=1.0,
        expected_classes={tag.id: (1, 1, 1 / len(tags)) for tag in tags.values()},
    )


def test_dataset_statistics_document_reports_documents_without_selected_class_tags(
    client: TestClient, document_statistics_dataset
):
    """Selecting one class reports the other 19 documents as retained 'O' examples."""
    base_model = conf.classifier.transformer_models[0].value
    tags = document_statistics_dataset["tags"]
    subset_tags = document_statistics_dataset["subset_tags"]
    selected_category, selected_tag = next(iter(tags.items()))
    data = _request_dataset_statistics(
        client,
        document_statistics_dataset["project"].id,
        ClassifierModel.DOCUMENT,
        [selected_tag.id],
        base_model,
        tag_ids=[
            subset_tags["train"].id,
            subset_tags["eval"].id,
            subset_tags["test"].id,
        ],
    )
    assert data["total_units"] == len(tags)
    assert data["labeled_units"] == 1
    assert len(data["unannotated_sdocs"]) == len(tags) - 1
    selected_sdoc_id = document_statistics_dataset["category2sdoc_ids"][
        selected_category
    ][0]
    assert selected_sdoc_id not in data["unannotated_sdocs"]


def test_dataset_statistics_sentence(
    client: TestClient, sentence_statistics_dataset, test_user
):
    """Sentence statistics over a compact fixture report exact unit counts
    and exactly the requested code ids."""
    base_model = conf.classifier.embedding_models[0].value
    codes = sentence_statistics_dataset["codes"]
    tags = sentence_statistics_dataset["tags"]
    data = _request_dataset_statistics(
        client,
        sentence_statistics_dataset["project"].id,
        ClassifierModel.SENTENCE,
        [c.id for c in codes.values()],
        base_model,
        tag_ids=[tags["train"].id, tags["eval"].id, tags["test"].id],
        user_ids=[test_user.id],
    )
    _assert_dataset_statistics(
        data,
        total_units=10,
        labeled_units=10,
        signal_percentage=1.0,
        expected_classes={code.id: (1, 2, 0.2) for code in codes.values()},
    )


def test_dataset_statistics_sentence_reports_excluded_documents(
    client: TestClient, sentence_statistics_dataset, test_user
):
    """Sentence statistics list tagged documents excluded by the selected class filter."""
    base_model = conf.classifier.embedding_models[0].value
    codes = sentence_statistics_dataset["codes"]
    tags = sentence_statistics_dataset["tags"]
    data = _request_dataset_statistics(
        client,
        sentence_statistics_dataset["project"].id,
        ClassifierModel.SENTENCE,
        [codes["background"].id],
        base_model,
        tag_ids=[tags["train"].id, tags["eval"].id, tags["test"].id],
        user_ids=[test_user.id],
    )
    assert data["total_units"] == 2
    assert data["labeled_units"] == 2
    assert len(data["unannotated_sdocs"]) == len(codes) - 1
