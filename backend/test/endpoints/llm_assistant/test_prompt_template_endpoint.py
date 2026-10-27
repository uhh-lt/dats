import pytest
from fastapi.testclient import TestClient
from pydantic import TypeAdapter

from core.user.user_orm import UserORM
from modules.llm_assistant.llm_assistant_enum import StrategyType, TaskType
from modules.llm_assistant.llm_assistant_job_dto import LLMAssistantPromptTemplates
from modules.llm_assistant.prompt_template_dto import (
    PromptTemplateCreate,
    PromptTemplateRead,
    PromptTemplateUpdate,
    PromptTemplateVersionCreate,
    PromptTemplateVersionRead,
)

from .conftest import (
    FUZZY_TEMPLATE_USER_PROMPTS,
    SENTENCE_TEMPLATE_V1_USER_PROMPTS,
    SENTENCE_TEMPLATE_V2_USER_PROMPTS,
    TAGGING_TEMPLATE_USER_PROMPTS,
    LLMAssistantProject,
    PromptTemplateProject,
    template_prompts,
)

PROMPT_TEMPLATE_URL = "/prompt_template"

# Valid user prompts of a sentence-level code strategy, used to break one rule at a time.
VALID_SENTENCE_USER_PROMPTS = {
    "en": "Codes:\n<codes>\nSentence:\n<sentence>",
    "de": "Codes:\n<codes>\nSatz:\n<sentence>",
}


def _create_dto(
    project: LLMAssistantProject,
    *,
    name: str = "New template",
    task_type: TaskType = TaskType.SENTENCE_ANNOTATION,
    strategy_type: StrategyType = StrategyType.SENTENCE_ANNOTATION_DEFAULT,
    prompts: list[LLMAssistantPromptTemplates] | None = None,
) -> PromptTemplateCreate:
    """Build a valid sentence-annotation template create DTO."""
    return PromptTemplateCreate(
        project_id=project["project"].id,
        name=name,
        task_type=task_type,
        strategy_type=strategy_type,
        prompts=prompts
        if prompts is not None
        else template_prompts(VALID_SENTENCE_USER_PROMPTS),
    )


# ===========================================================================
# CREATE PROMPT TEMPLATE (PUT /prompt_template) TESTS
# ===========================================================================


# --- A. valid templates -----------------------------------------------------------


def test_create_prompt_template_stores_the_prompts_as_version_one(
    client: TestClient,
    llm_assistant_project: LLMAssistantProject,
    test_user: UserORM,
) -> None:
    """A new template has exactly one version (number 1) with the sent prompts."""
    create_dto = _create_dto(llm_assistant_project)
    response = client.put(PROMPT_TEMPLATE_URL, json=create_dto.model_dump(mode="json"))
    assert response.status_code == 200, response.text
    template = PromptTemplateRead.model_validate(response.json())

    assert template.name == "New template"
    assert template.project_id == llm_assistant_project["project"].id
    assert template.task_type == TaskType.SENTENCE_ANNOTATION
    assert template.strategy_type == StrategyType.SENTENCE_ANNOTATION_DEFAULT
    assert [version.version for version in template.versions] == [1]
    assert template.versions[0].prompts == create_dto.prompts
    assert template.versions[0].user_id == test_user.id
    assert template.versions[0].prompt_template_id == template.id


@pytest.mark.parametrize(
    "task_type,strategy_type,user_prompts",
    [
        # Tagging has no code placeholder, only the document tag.
        pytest.param(
            TaskType.TAGGING,
            StrategyType.TAGGING_DEFAULT,
            TAGGING_TEMPLATE_USER_PROMPTS,
            id="tagging",
        ),
        # Metadata extraction has no code placeholder, only the document tag.
        pytest.param(
            TaskType.METADATA_EXTRACTION,
            StrategyType.METADATA_DEFAULT,
            TAGGING_TEMPLATE_USER_PROMPTS,
            id="metadata",
        ),
        # Inline tagging accepts the document tag with the code placeholder.
        pytest.param(
            TaskType.ANNOTATION,
            StrategyType.NER_INLINE_TAGS,
            SENTENCE_TEMPLATE_V2_USER_PROMPTS,
            id="inline-document",
        ),
        # Fuzzy grounding requires the chunk tag with the code placeholder.
        pytest.param(
            TaskType.ANNOTATION,
            StrategyType.CONTEXT_ANCHORED_FUZZY_MATCHING,
            FUZZY_TEMPLATE_USER_PROMPTS,
            id="fuzzy-chunk",
        ),
        # Sentence annotation accepts the sentence tag with the code placeholder.
        pytest.param(
            TaskType.SENTENCE_ANNOTATION,
            StrategyType.SENTENCE_ANNOTATION_DEFAULT,
            SENTENCE_TEMPLATE_V1_USER_PROMPTS,
            id="sentence-sentence",
        ),
    ],
)
def test_create_prompt_template_accepts_every_task_and_strategy(
    client: TestClient,
    llm_assistant_project: LLMAssistantProject,
    task_type: TaskType,
    strategy_type: StrategyType,
    user_prompts: dict[str, str],
) -> None:
    """Templates of every task and strategy can be stored with valid placeholders."""
    create_dto = _create_dto(
        llm_assistant_project,
        task_type=task_type,
        strategy_type=strategy_type,
        prompts=template_prompts(user_prompts),
    )
    response = client.put(PROMPT_TEMPLATE_URL, json=create_dto.model_dump(mode="json"))
    assert response.status_code == 200, response.text
    template = PromptTemplateRead.model_validate(response.json())
    assert (template.task_type, template.strategy_type) == (task_type, strategy_type)


# --- B. invalid templates (HTTP 400 contracts) ---------------------------------------
# Each case breaks exactly one placeholder rule of the sentence-annotation strategy.


def _prompts(
    en_user: str = VALID_SENTENCE_USER_PROMPTS["en"],
    de_user: str = VALID_SENTENCE_USER_PROMPTS["de"],
    en_system: str = "System",
) -> list[LLMAssistantPromptTemplates]:
    return [
        LLMAssistantPromptTemplates(
            language="en", system_prompt=en_system, user_prompt=en_user
        ),
        LLMAssistantPromptTemplates(
            language="de", system_prompt="System", user_prompt=de_user
        ),
    ]


@pytest.mark.parametrize(
    "prompts,expected_fragment",
    [
        # The code placeholder is required by code strategies.
        pytest.param(
            _prompts(en_user="Sentence:\n<sentence>"),
            "must contain <codes>",
            id="missing-codes",
        ),
        # A user prompt without any data tag cannot receive document content.
        pytest.param(
            _prompts(en_user="Codes:\n<codes>"),
            "contains no data tag",
            id="missing-data-tag",
        ),
        # Two data tags would make the splitting of the document ambiguous.
        pytest.param(
            _prompts(en_user="<codes>\n<document>\n<sentence>"),
            "multiple data tags",
            id="multiple-data-tags",
        ),
        # Sentence annotation does not support chunks.
        pytest.param(
            _prompts(en_user="<codes>\n<chunk>", de_user="<codes>\n<chunk>"),
            "<chunk> in the user prompt for language 'en' is not supported",
            id="unsupported-data-tag",
        ),
        # Both languages must split the document the same way.
        pytest.param(
            _prompts(en_user="<codes>\n<document>"),
            "Different data tags",
            id="different-data-tags",
        ),
        # The codes are rendered into the user prompt only.
        pytest.param(
            _prompts(en_system="System <codes>"),
            "system prompt for language 'en' must not contain <codes>",
            id="codes-in-system-prompt",
        ),
        # Every supported language needs a prompt.
        pytest.param(
            _prompts()[:1],
            "No prompts provided for language 'de'",
            id="missing-language",
        ),
        # Unsupported languages would never be used.
        pytest.param(
            _prompts()
            + [
                LLMAssistantPromptTemplates(
                    language="fr", system_prompt="S", user_prompt="<codes> <sentence>"
                )
            ],
            "Language 'fr' is not supported",
            id="unsupported-language",
        ),
        # A language must not be defined twice.
        pytest.param(
            _prompts() + _prompts()[:1],
            "Multiple prompts provided for language 'en'",
            id="duplicate-language",
        ),
    ],
)
def test_create_prompt_template_rejects_invalid_placeholders(
    client: TestClient,
    llm_assistant_project: LLMAssistantProject,
    prompts: list[LLMAssistantPromptTemplates],
    expected_fragment: str,
) -> None:
    """Templates violating a placeholder rule are rejected with HTTP 400."""
    create_dto = _create_dto(llm_assistant_project, prompts=prompts)
    response = client.put(PROMPT_TEMPLATE_URL, json=create_dto.model_dump(mode="json"))
    assert response.status_code == 400, response.text
    assert expected_fragment in response.text


def test_create_prompt_template_rejects_codes_for_strategies_without_codes(
    client: TestClient,
    llm_assistant_project: LLMAssistantProject,
) -> None:
    """Tagging renders no code definitions, so <codes> would reach the LLM verbatim."""
    create_dto = _create_dto(
        llm_assistant_project,
        task_type=TaskType.TAGGING,
        strategy_type=StrategyType.TAGGING_DEFAULT,
        prompts=_prompts(en_user="<codes>\n<document>", de_user="<document>"),
    )
    response = client.put(PROMPT_TEMPLATE_URL, json=create_dto.model_dump(mode="json"))
    assert response.status_code == 400, response.text
    assert "does not support the placeholder <codes>" in response.text


def test_create_prompt_template_rejects_a_strategy_of_another_task(
    client: TestClient,
    llm_assistant_project: LLMAssistantProject,
) -> None:
    """The strategy must be registered for the template's task."""
    create_dto = _create_dto(
        llm_assistant_project,
        task_type=TaskType.TAGGING,
        strategy_type=StrategyType.NER_INLINE_TAGS,
    )
    response = client.put(PROMPT_TEMPLATE_URL, json=create_dto.model_dump(mode="json"))
    assert response.status_code == 400, response.text
    assert "is not supported for task TAGGING" in response.text


def test_create_prompt_template_rejects_a_duplicate_name(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """Template names are unique per project (HTTP 409)."""
    create_dto = _create_dto(
        prompt_template_project["base"], name="Sentence classification"
    )
    response = client.put(PROMPT_TEMPLATE_URL, json=create_dto.model_dump(mode="json"))
    assert response.status_code == 409, response.text


def test_create_prompt_template_rejects_foreign_project(
    client: TestClient,
    llm_assistant_project: LLMAssistantProject,
) -> None:
    """Templates can only be created in projects of the user."""
    create_dto = _create_dto(llm_assistant_project)
    create_dto.project_id = llm_assistant_project["foreign_project"].id
    response = client.put(PROMPT_TEMPLATE_URL, json=create_dto.model_dump(mode="json"))
    assert response.status_code == 403, response.text


# ===========================================================================
# CREATE VERSION (PUT /prompt_template/{id}/version) TESTS
# ===========================================================================


def test_create_version_appends_the_next_version_and_keeps_older_ones(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """Saving creates version 3; versions 1 and 2 keep their ids and prompts."""
    template = prompt_template_project["sentence_template"]
    new_prompts = template_prompts(VALID_SENTENCE_USER_PROMPTS)
    response = client.put(
        f"{PROMPT_TEMPLATE_URL}/{template.id}/version",
        json=PromptTemplateVersionCreate(prompts=new_prompts).model_dump(mode="json"),
    )
    assert response.status_code == 200, response.text
    updated = PromptTemplateRead.model_validate(response.json())

    assert [version.version for version in updated.versions] == [1, 2, 3]
    assert updated.versions[0] == prompt_template_project["sentence_v1"]
    assert updated.versions[1] == prompt_template_project["sentence_v2"]
    assert updated.versions[2].prompts == new_prompts
    assert updated.name == template.name

    version_response = client.get(
        f"{PROMPT_TEMPLATE_URL}/version/{prompt_template_project['sentence_v1'].id}"
    )
    assert version_response.status_code == 200, version_response.text
    assert (
        PromptTemplateVersionRead.model_validate(version_response.json())
        == prompt_template_project["sentence_v1"]
    )


def test_create_version_validates_the_prompts_for_the_template_strategy(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """A version is validated against its template's strategy: tagging rejects <codes>."""
    template = prompt_template_project["tagging_template"]
    response = client.put(
        f"{PROMPT_TEMPLATE_URL}/{template.id}/version",
        json=PromptTemplateVersionCreate(
            prompts=template_prompts(SENTENCE_TEMPLATE_V2_USER_PROMPTS)
        ).model_dump(mode="json"),
    )
    assert response.status_code == 400, response.text
    assert "does not support the placeholder <codes>" in response.text

    template_response = client.get(f"{PROMPT_TEMPLATE_URL}/{template.id}")
    assert template_response.status_code == 200, template_response.text
    assert [
        version.version
        for version in PromptTemplateRead.model_validate(
            template_response.json()
        ).versions
    ] == [1]


@pytest.mark.parametrize(
    "template_key,expected_status",
    [
        # The template of another project must not be extended.
        pytest.param("foreign_template", 403, id="foreign-template"),
        # Authorization hides whether an unknown template exists.
        pytest.param(None, 403, id="unknown-template"),
    ],
)
def test_create_version_rejects_foreign_or_unknown_templates(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
    template_key: str | None,
    expected_status: int,
) -> None:
    """Versions can only be added to existing templates of the user's projects."""
    template_id = (
        prompt_template_project[template_key].id
        if template_key is not None
        else 999_999
    )
    response = client.put(
        f"{PROMPT_TEMPLATE_URL}/{template_id}/version",
        json=PromptTemplateVersionCreate(
            prompts=template_prompts(FUZZY_TEMPLATE_USER_PROMPTS)
        ).model_dump(mode="json"),
    )
    assert response.status_code == expected_status, response.text


# ===========================================================================
# READ (GET /prompt_template/...) TESTS
# ===========================================================================


def test_get_by_project_lists_the_project_templates_by_name(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """Only the project's own templates are listed, ordered by name, with versions."""
    project_id = prompt_template_project["base"]["project"].id
    response = client.get(f"{PROMPT_TEMPLATE_URL}/project/{project_id}")
    assert response.status_code == 200, response.text
    templates = TypeAdapter(list[PromptTemplateRead]).validate_python(response.json())

    assert templates == [
        prompt_template_project["sentence_template"],
        prompt_template_project["tagging_template"],
    ]


def test_get_by_project_rejects_foreign_project(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """Listing requires project membership."""
    project_id = prompt_template_project["base"]["foreign_project"].id
    response = client.get(f"{PROMPT_TEMPLATE_URL}/project/{project_id}")
    assert response.status_code == 403, response.text


@pytest.mark.parametrize(
    "url_suffix",
    [
        # The template itself.
        pytest.param("template", id="template"),
        # One of its versions.
        pytest.param("version", id="version"),
    ],
)
def test_get_rejects_foreign_templates_and_versions(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
    url_suffix: str,
) -> None:
    """Neither a foreign template nor its versions are readable."""
    foreign = prompt_template_project["foreign_template"]
    url = (
        f"{PROMPT_TEMPLATE_URL}/{foreign.id}"
        if url_suffix == "template"
        else f"{PROMPT_TEMPLATE_URL}/version/{foreign.versions[0].id}"
    )
    response = client.get(url)
    assert response.status_code == 403, response.text


# ===========================================================================
# UPDATE (PATCH /prompt_template/{id}) TESTS
# ===========================================================================


def test_update_renames_without_creating_a_version(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """Renaming changes the name only; the two versions stay as they are."""
    template = prompt_template_project["sentence_template"]
    response = client.patch(
        f"{PROMPT_TEMPLATE_URL}/{template.id}",
        json=PromptTemplateUpdate(name="Renamed").model_dump(
            mode="json", exclude_unset=True
        ),
    )
    assert response.status_code == 200, response.text
    updated = PromptTemplateRead.model_validate(response.json())

    assert updated.name == "Renamed"
    assert updated.versions == template.versions


@pytest.mark.parametrize(
    "body",
    [
        # An empty PATCH changes nothing.
        pytest.param({}, id="empty"),
        # The name column is not nullable.
        pytest.param({"name": None}, id="null-name"),
        # The name must not be empty.
        pytest.param({"name": ""}, id="empty-name"),
        # Prompts are immutable and can only change by a new version.
        pytest.param({"prompts": []}, id="prompts"),
    ],
)
def test_update_rejects_invalid_bodies(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
    body: dict[str, object],
) -> None:
    """Empty, null or prompt-changing updates are rejected with HTTP 422."""
    template = prompt_template_project["sentence_template"]
    response = client.patch(f"{PROMPT_TEMPLATE_URL}/{template.id}", json=body)
    assert response.status_code == 422, response.text


# ===========================================================================
# DELETE (DELETE /prompt_template/{id}) TESTS
# ===========================================================================


def test_delete_removes_the_template_with_its_versions(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """Deleting returns the template; afterwards neither it nor its versions are readable."""
    template = prompt_template_project["sentence_template"]
    response = client.delete(f"{PROMPT_TEMPLATE_URL}/{template.id}")
    assert response.status_code == 200, response.text
    assert PromptTemplateRead.model_validate(response.json()) == template

    # authorization reports missing objects as forbidden
    assert client.get(f"{PROMPT_TEMPLATE_URL}/{template.id}").status_code == 403
    version_id = prompt_template_project["sentence_v1"].id
    assert client.get(f"{PROMPT_TEMPLATE_URL}/version/{version_id}").status_code == 403


def test_delete_rejects_foreign_template(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """Templates of other projects cannot be deleted."""
    foreign = prompt_template_project["foreign_template"]
    response = client.delete(f"{PROMPT_TEMPLATE_URL}/{foreign.id}")
    assert response.status_code == 403, response.text
