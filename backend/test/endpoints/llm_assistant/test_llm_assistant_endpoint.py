import pytest
from fastapi.testclient import TestClient
from pydantic import TypeAdapter

from core.prompt_template.prompt_template_enum import TaskType

from .conftest import LLMAssistantProject

COUNT_ANNOTATIONS_URL = "/llm_assistant/count_existing_assistant_annotations"


# ===========================================================================
# COUNT EXISTING ANNOTATIONS (/llm_assistant/count_existing_assistant_annotations) TESTS
# ===========================================================================


@pytest.mark.parametrize(
    "task_type,annotator_key,code_key",
    [
        # One span annotation of run A exists for PERSON.
        pytest.param(TaskType.ANNOTATION, "run_a", "person_code", id="span-run-a"),
        # One span annotation of run B exists for PERSON.
        pytest.param(TaskType.ANNOTATION, "run_b", "person_code", id="span-run-b"),
        # One sentence annotation of run A exists for FACT.
        pytest.param(
            TaskType.SENTENCE_ANNOTATION, "run_a", "fact_code", id="sentence-run-a"
        ),
        # One sentence annotation of run B exists for FACT.
        pytest.param(
            TaskType.SENTENCE_ANNOTATION, "run_b", "fact_code", id="sentence-run-b"
        ),
    ],
)
def test_count_existing_assistant_annotations_separates_task_and_virtual_user(
    client: TestClient,
    llm_assistant_project: LLMAssistantProject,
    task_type: TaskType,
    annotator_key: str,
    code_key: str,
) -> None:
    """Counts include only the selected task's virtual user and documents."""
    code = llm_assistant_project[code_key]
    annotator = llm_assistant_project[annotator_key]
    response = client.post(
        COUNT_ANNOTATIONS_URL,
        params={
            "task_type": task_type.value,
            "virtual_user_id": annotator.id,
        },
        json={
            "sdoc_ids": [llm_assistant_project["target_sdoc"].id],
            "code_ids": [code.id],
        },
    )
    assert response.status_code == 200, response.text
    counts = TypeAdapter(dict[int, int]).validate_python(response.json())

    assert counts == {code.id: 1}


@pytest.mark.parametrize(
    "task_type",
    [
        # Tagging does not create assistant annotations.
        pytest.param(TaskType.TAGGING, id="tagging"),
        # Metadata extraction does not create assistant annotations.
        pytest.param(TaskType.METADATA_EXTRACTION, id="metadata-extraction"),
    ],
)
def test_count_existing_assistant_annotations_returns_empty_for_other_tasks(
    client: TestClient,
    llm_assistant_project: LLMAssistantProject,
    task_type: TaskType,
) -> None:
    """Non-annotation task types return an empty count mapping."""
    response = client.post(
        COUNT_ANNOTATIONS_URL,
        params={
            "task_type": task_type.value,
            "virtual_user_id": llm_assistant_project["run_a"].id,
        },
        json={
            "sdoc_ids": [llm_assistant_project["target_sdoc"].id],
            "code_ids": [llm_assistant_project["person_code"].id],
        },
    )
    assert response.status_code == 200, response.text
    assert response.json() == {}


def test_count_existing_assistant_annotations_includes_explicit_zero_counts(
    client: TestClient,
    llm_assistant_project: LLMAssistantProject,
) -> None:
    """Every requested code is returned even when it has no matching annotations."""
    response = client.post(
        COUNT_ANNOTATIONS_URL,
        params={
            "task_type": TaskType.ANNOTATION.value,
            "virtual_user_id": llm_assistant_project["run_a"].id,
        },
        json={
            "sdoc_ids": [
                llm_assistant_project["target_sdoc"].id,
                llm_assistant_project["no_match_sdoc"].id,
            ],
            "code_ids": [
                llm_assistant_project["person_code"].id,
                llm_assistant_project["fact_code"].id,
            ],
        },
    )
    assert response.status_code == 200, response.text
    counts = TypeAdapter(dict[int, int]).validate_python(response.json())

    assert counts == {
        llm_assistant_project["person_code"].id: 1,
        llm_assistant_project["fact_code"].id: 0,
    }


@pytest.mark.parametrize(
    "body_update,expected_fragment",
    [
        # Source-document IDs must be a list of integers.
        pytest.param(
            {"sdoc_ids": "not-a-list"},
            "sdoc_ids",
            id="invalid-source-document-ids",
        ),
        # Code IDs must be a list of integers.
        pytest.param(
            {"code_ids": ["not-an-integer"]},
            "code_ids",
            id="invalid-code-ids",
        ),
    ],
)
def test_count_existing_assistant_annotations_rejects_malformed_id_lists(
    client: TestClient,
    body_update: dict[str, object],
    expected_fragment: str,
) -> None:
    """Wrongly typed source-document and code lists return HTTP 422."""
    body: dict[str, object] = {"sdoc_ids": [], "code_ids": []}
    body.update(body_update)
    response = client.post(
        COUNT_ANNOTATIONS_URL,
        params={
            "task_type": TaskType.ANNOTATION.value,
            "virtual_user_id": 1,
        },
        json=body,
    )
    assert response.status_code == 422, response.text
    assert expected_fragment in response.text


def test_count_existing_assistant_annotations_rejects_foreign_objects(
    client: TestClient,
    llm_assistant_project: LLMAssistantProject,
) -> None:
    """Annotation counts must not reveal data belonging to another project."""
    response = client.post(
        COUNT_ANNOTATIONS_URL,
        params={
            "task_type": TaskType.ANNOTATION.value,
            "virtual_user_id": llm_assistant_project["foreign_run"].id,
        },
        json={
            "sdoc_ids": [llm_assistant_project["foreign_sdoc"].id],
            "code_ids": [llm_assistant_project["foreign_code"].id],
        },
    )
    assert response.status_code == 403, response.text


def test_count_existing_assistant_annotations_rejects_foreign_virtual_user(
    client: TestClient,
    llm_assistant_project: LLMAssistantProject,
) -> None:
    """The counted virtual user must belong to one of the user's projects."""
    response = client.post(
        COUNT_ANNOTATIONS_URL,
        params={
            "task_type": TaskType.ANNOTATION.value,
            "virtual_user_id": llm_assistant_project["foreign_run"].id,
        },
        json={
            "sdoc_ids": [llm_assistant_project["target_sdoc"].id],
            "code_ids": [llm_assistant_project["person_code"].id],
        },
    )
    assert response.status_code == 403, response.text
