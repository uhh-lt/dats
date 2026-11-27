import pytest
from fastapi.testclient import TestClient
from pydantic import TypeAdapter

from core.prompt.prompt_enum import TaskType

from .conftest import LLMAssistantProject


def _count_url(project_id: int) -> str:
    return f"/projects/{project_id}/llm-assistant/count-existing-annotations"


# ===========================================================================
# COUNT EXISTING ANNOTATIONS
# (/projects/{project_id}/llm-assistant/count-existing-annotations) TESTS
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
        _count_url(llm_assistant_project["project"].id),
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
        _count_url(llm_assistant_project["project"].id),
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
        _count_url(llm_assistant_project["project"].id),
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
    llm_assistant_project: LLMAssistantProject,
    body_update: dict[str, object],
    expected_fragment: str,
) -> None:
    """Wrongly typed source-document and code lists return HTTP 422."""
    body: dict[str, object] = {"sdoc_ids": [], "code_ids": []}
    body.update(body_update)
    response = client.post(
        _count_url(llm_assistant_project["project"].id),
        params={
            "task_type": TaskType.ANNOTATION.value,
            "virtual_user_id": 1,
        },
        json=body,
    )
    assert response.status_code == 422, response.text
    assert expected_fragment in response.text


def test_count_existing_assistant_annotations_rejects_a_non_member(
    client: TestClient,
    llm_assistant_project: LLMAssistantProject,
) -> None:
    """Annotation counts must not reveal data of a project the user is no member
    of (HTTP 403)."""
    response = client.post(
        _count_url(llm_assistant_project["outsider_project"].id),
        params={
            "task_type": TaskType.ANNOTATION.value,
            "virtual_user_id": llm_assistant_project["outsider_run"].id,
        },
        json={
            "sdoc_ids": [llm_assistant_project["outsider_sdoc"].id],
            "code_ids": [llm_assistant_project["outsider_code"].id],
        },
    )
    assert response.status_code == 403, response.text


@pytest.mark.parametrize(
    "annotator_key,sdoc_key,code_key",
    [
        # The virtual user, document and code of the outsider project: its span
        # annotation "Eve" is not counted in the path's project.
        pytest.param(
            "outsider_run", "outsider_sdoc", "outsider_code", id="all-outsider"
        ),
        # The virtual user of the outsider project on the project's own target.
        pytest.param("outsider_run", "target_sdoc", "person_code", id="outsider-user"),
        # The project's own virtual user on a document of the outsider project.
        pytest.param("run_a", "outsider_sdoc", "person_code", id="outsider-document"),
    ],
)
def test_count_existing_assistant_annotations_of_an_outsider_project_counts_zero(
    client: TestClient,
    llm_assistant_project: LLMAssistantProject,
    annotator_key: str,
    sdoc_key: str,
    code_key: str,
) -> None:
    """Ids of an outsider project match nothing in the path's project: the
    requested code is counted with 0."""
    code = llm_assistant_project[code_key]
    response = client.post(
        _count_url(llm_assistant_project["project"].id),
        params={
            "task_type": TaskType.ANNOTATION.value,
            "virtual_user_id": llm_assistant_project[annotator_key].id,
        },
        json={
            "sdoc_ids": [llm_assistant_project[sdoc_key].id],
            "code_ids": [code.id],
        },
    )
    assert response.status_code == 200, response.text
    counts = TypeAdapter(dict[int, int]).validate_python(response.json())

    assert counts == {code.id: 0}
