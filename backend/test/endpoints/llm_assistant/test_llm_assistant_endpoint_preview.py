import pytest
from fastapi.testclient import TestClient

from modules.llm_assistant.llm_assistant_enum import StrategyType, TaskType
from modules.llm_assistant.llm_assistant_job_dto import (
    AnnotationParams,
    CodeDefinition,
    DefaultStrategyParams,
    FuzzyGroundingStrategyParams,
    LLMAssistantPromptPreview,
    LLMAssistantPromptPreviewRequest,
    LLMAssistantPromptTemplates,
    NERInlineTagStrategyParams,
    SentenceAnnotationParams,
    TaggingParams,
)

from .conftest import LLMAssistantProject, PromptTemplateProject, template_prompts

PREVIEW_URL = "/llm_assistant/preview_prompt"

TARGET_SENTENCES = [
    "The document author is Alice.",
    "The document year is 2024.",
    "The publication date is 2024-01-15.",
    "The document's reviewed status is true.",
    "The document topics are solar and energy.",
]
TARGET_CONTENT = " ".join(TARGET_SENTENCES)


def _sentence_request(
    project: LLMAssistantProject,
    *,
    version_id: int | None = None,
    prompts: list[LLMAssistantPromptTemplates] | None = None,
    code_definitions: list[CodeDefinition] | None = None,
    message_index: int = 0,
) -> LLMAssistantPromptPreviewRequest:
    """Build a sentence-annotation preview of the target document for FACT."""
    return LLMAssistantPromptPreviewRequest(
        project_id=project["project"].id,
        task_type=TaskType.SENTENCE_ANNOTATION,
        specific_task_parameters=SentenceAnnotationParams(
            task_type=TaskType.SENTENCE_ANNOTATION,
            sdoc_ids=[project["target_sdoc"].id],
            code_ids=[project["fact_code"].id],
            code_definitions=code_definitions,
        ),
        strategy_type=StrategyType.SENTENCE_ANNOTATION_DEFAULT,
        specific_strategy_parameters=DefaultStrategyParams(
            strategy_type=StrategyType.SENTENCE_ANNOTATION_DEFAULT
        ),
        prompts=prompts,
        prompt_template_version_id=version_id,
        sdoc_id=project["target_sdoc"].id,
        message_index=message_index,
    )


def _post_preview(client: TestClient, request: LLMAssistantPromptPreviewRequest):
    return client.post(PREVIEW_URL, json=request.model_dump(mode="json"))


# ===========================================================================
# PREVIEW PROMPT (/llm_assistant/preview_prompt) TESTS
# ===========================================================================


# --- A. rendering of stored template versions ---------------------------------------


def test_preview_renders_a_sentence_of_a_stored_version(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """Version 1 (<sentence>) renders the second sentence with the FACT definition."""
    base = prompt_template_project["base"]
    response = _post_preview(
        client,
        _sentence_request(
            base,
            version_id=prompt_template_project["sentence_v1"].id,
            message_index=1,
        ),
    )
    assert response.status_code == 200, response.text
    preview = LLMAssistantPromptPreview.model_validate(response.json())

    assert preview == LLMAssistantPromptPreview(
        sdoc_id=base["target_sdoc"].id,
        language="en",
        message_index=1,
        num_messages=len(TARGET_SENTENCES),
        system_prompt=f"You analyse texts of {base['project'].title}.",
        user_prompt=(
            "Classify the sentence with these codes:\n"
            f"FACT: {base['fact_code'].description}\n"
            "Sentence:\n"
            f"1: {TARGET_SENTENCES[1]}"
        ),
    )


def test_preview_renders_the_whole_document_of_a_document_level_version(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """Version 2 (<document>) renders one message with the numbered sentences."""
    base = prompt_template_project["base"]
    response = _post_preview(
        client,
        _sentence_request(base, version_id=prompt_template_project["sentence_v2"].id),
    )
    assert response.status_code == 200, response.text
    preview = LLMAssistantPromptPreview.model_validate(response.json())

    numbered = "\n".join(
        f"{index}: {sentence}" for index, sentence in enumerate(TARGET_SENTENCES, 1)
    )
    assert preview.num_messages == 1
    assert preview.user_prompt == (
        "Classify the document with these codes:\n"
        f"FACT: {base['fact_code'].description}\n"
        f"Document:\n{numbered}"
    )


def test_preview_renders_a_tagging_version_without_codes(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """Strategies without code definitions only fill the document."""
    base = prompt_template_project["base"]
    request = LLMAssistantPromptPreviewRequest(
        project_id=base["project"].id,
        task_type=TaskType.TAGGING,
        specific_task_parameters=TaggingParams(
            task_type=TaskType.TAGGING,
            sdoc_ids=[base["target_sdoc"].id],
            tag_ids=[base["people_tag"].id],
        ),
        strategy_type=StrategyType.TAGGING_DEFAULT,
        specific_strategy_parameters=DefaultStrategyParams(
            strategy_type=StrategyType.TAGGING_DEFAULT
        ),
        prompt_template_version_id=prompt_template_project["tagging_template"]
        .versions[0]
        .id,
        sdoc_id=base["target_sdoc"].id,
    )
    response = _post_preview(client, request)
    assert response.status_code == 200, response.text
    preview = LLMAssistantPromptPreview.model_validate(response.json())

    assert preview.user_prompt == (
        f"Tag the document with People or Other:\n{TARGET_CONTENT}"
    )


# --- B. code definitions as data -----------------------------------------------------


def test_preview_renders_given_code_definitions_verbatim(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """Experiment definitions replace the project's; placeholders in them stay text."""
    base = prompt_template_project["base"]
    definition = CodeDefinition(
        id=base["fact_code"].id,
        name="STATEMENT",
        description="Quotes a <sentence> or <codes> verbatim.",
    )
    response = _post_preview(
        client,
        _sentence_request(
            base,
            version_id=prompt_template_project["sentence_v1"].id,
            code_definitions=[definition],
        ),
    )
    assert response.status_code == 200, response.text
    preview = LLMAssistantPromptPreview.model_validate(response.json())

    assert preview.user_prompt == (
        "Classify the sentence with these codes:\n"
        "STATEMENT: Quotes a <sentence> or <codes> verbatim.\n"
        "Sentence:\n"
        f"1: {TARGET_SENTENCES[0]}"
    )


def test_preview_renders_inline_tag_definitions_in_code_id_order(
    client: TestClient,
    llm_assistant_project: LLMAssistantProject,
) -> None:
    """Inline tagging lists the upper-case names, then one definition per code, in code_ids order."""
    project = llm_assistant_project
    prompts = template_prompts(
        {"en": "<codes>\n---\n<document>", "de": "<codes> <document>"}
    )
    request = LLMAssistantPromptPreviewRequest(
        project_id=project["project"].id,
        task_type=TaskType.ANNOTATION,
        specific_task_parameters=AnnotationParams(
            task_type=TaskType.ANNOTATION,
            sdoc_ids=[project["target_sdoc"].id],
            code_ids=[project["fact_code"].id, project["person_code"].id],
            code_definitions=[
                CodeDefinition(
                    id=project["person_code"].id, name="Person", description="A name."
                ),
                CodeDefinition(
                    id=project["fact_code"].id, name="Fact", description="A fact."
                ),
            ],
        ),
        strategy_type=StrategyType.NER_INLINE_TAGS,
        specific_strategy_parameters=NERInlineTagStrategyParams(
            strategy_type=StrategyType.NER_INLINE_TAGS
        ),
        prompts=prompts,
        sdoc_id=project["target_sdoc"].id,
    )
    response = _post_preview(client, request)
    assert response.status_code == 200, response.text
    preview = LLMAssistantPromptPreview.model_validate(response.json())

    assert preview.user_prompt == (
        "Allowed codes:\nFACT, PERSON\n\n"
        "Code definitions:\nFACT: A fact.\nPERSON: A name.\n"
        f"---\n{TARGET_CONTENT}"
    )


@pytest.mark.parametrize(
    "definitions,expected_fragment",
    [
        # Every selected code needs a definition.
        pytest.param([], "exactly one definition for each selected code", id="missing"),
        # Definitions of codes that are not selected are rejected.
        pytest.param(
            ["fact", "person"],
            "exactly one definition for each selected code",
            id="unselected-code",
        ),
        # A code must not be defined twice.
        pytest.param(
            ["fact", "fact"],
            "exactly one definition for each selected code",
            id="duplicate-code",
        ),
    ],
)
def test_preview_rejects_definitions_that_do_not_match_the_codes(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
    definitions: list[str],
    expected_fragment: str,
) -> None:
    """Definitions must cover exactly the selected codes (HTTP 400)."""
    base = prompt_template_project["base"]
    codes = {"fact": base["fact_code"], "person": base["person_code"]}
    response = _post_preview(
        client,
        _sentence_request(
            base,
            version_id=prompt_template_project["sentence_v1"].id,
            code_definitions=[
                CodeDefinition(id=codes[key].id, name=f"N{i}", description="D")
                for i, key in enumerate(definitions)
            ],
        ),
    )
    assert response.status_code == 400, response.text
    assert expected_fragment in response.text


def test_preview_rejects_code_names_that_differ_only_in_case(
    client: TestClient,
    llm_assistant_project: LLMAssistantProject,
) -> None:
    """LLM answers are mapped back by name, so names must be unique ignoring case."""
    project = llm_assistant_project
    request = LLMAssistantPromptPreviewRequest(
        project_id=project["project"].id,
        task_type=TaskType.ANNOTATION,
        specific_task_parameters=AnnotationParams(
            task_type=TaskType.ANNOTATION,
            sdoc_ids=[project["target_sdoc"].id],
            code_ids=[project["fact_code"].id, project["person_code"].id],
            code_definitions=[
                CodeDefinition(
                    id=project["person_code"].id, name="Same", description="A"
                ),
                CodeDefinition(
                    id=project["fact_code"].id, name="SAME", description="B"
                ),
            ],
        ),
        strategy_type=StrategyType.NER_INLINE_TAGS,
        specific_strategy_parameters=NERInlineTagStrategyParams(
            strategy_type=StrategyType.NER_INLINE_TAGS
        ),
        prompts=template_prompts(
            {"en": "<codes> <document>", "de": "<codes> <document>"}
        ),
        sdoc_id=project["target_sdoc"].id,
    )
    response = _post_preview(client, request)
    assert response.status_code == 400, response.text
    assert "unique (case-insensitive)" in response.text


def test_preview_rejects_codes_of_another_project(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """Selected codes must belong to the project (HTTP 400)."""
    base = prompt_template_project["base"]
    request = _sentence_request(
        base, version_id=prompt_template_project["sentence_v1"].id
    )
    assert isinstance(request.specific_task_parameters, SentenceAnnotationParams)
    request.specific_task_parameters.code_ids = [base["foreign_code"].id]
    response = _post_preview(client, request)
    assert response.status_code == 400, response.text
    assert "do not belong to project" in response.text


# --- C. chunks and message indices ---------------------------------------------------


def test_preview_switches_between_chunks(
    client: TestClient,
    llm_assistant_project: LLMAssistantProject,
) -> None:
    """28 tokens, chunks of 10 with overlap 2: four chunks, the second starts at token 8."""
    project = llm_assistant_project
    request = LLMAssistantPromptPreviewRequest(
        project_id=project["project"].id,
        task_type=TaskType.ANNOTATION,
        specific_task_parameters=AnnotationParams(
            task_type=TaskType.ANNOTATION,
            sdoc_ids=[project["target_sdoc"].id],
            code_ids=[project["person_code"].id],
        ),
        strategy_type=StrategyType.CONTEXT_ANCHORED_FUZZY_MATCHING,
        specific_strategy_parameters=FuzzyGroundingStrategyParams(
            strategy_type=StrategyType.CONTEXT_ANCHORED_FUZZY_MATCHING,
            chunk_size_tokens=10,
            chunk_overlap_tokens=2,
        ),
        prompts=template_prompts(
            {"en": "Text:\n<chunk>\n<codes>", "de": "<chunk> <codes>"}
        ),
        sdoc_id=project["target_sdoc"].id,
        message_index=1,
    )
    response = _post_preview(client, request)
    assert response.status_code == 200, response.text
    preview = LLMAssistantPromptPreview.model_validate(response.json())

    assert preview.num_messages == 4
    assert preview.user_prompt == (
        "Text:\nis 2024. The publication date is 2024-01-15. The document's reviewed\n"
        "Allowed codes:\nPERSON\n\n"
        f"Code definitions:\nPERSON: {project['person_code'].description}"
    )


def test_preview_rejects_a_message_index_out_of_range(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """The target document has five sentences, so index 5 does not exist."""
    response = _post_preview(
        client,
        _sentence_request(
            prompt_template_project["base"],
            version_id=prompt_template_project["sentence_v1"].id,
            message_index=5,
        ),
    )
    assert response.status_code == 400, response.text
    assert "has 5 message(s)" in response.text


# --- D. invalid prompt sources and documents ----------------------------------------


@pytest.mark.parametrize(
    "template_key",
    [
        # The tagging template cannot render sentence annotation prompts.
        pytest.param("tagging_template", id="other-task"),
        # The template of another project cannot be used.
        pytest.param("foreign_template", id="other-project"),
    ],
)
def test_preview_rejects_versions_of_other_tasks_or_projects(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
    template_key: str,
) -> None:
    """A version is only usable with its own project, task and strategy (HTTP 400)."""
    version_id = prompt_template_project[template_key].versions[0].id
    response = _post_preview(
        client,
        _sentence_request(prompt_template_project["base"], version_id=version_id),
    )
    assert response.status_code == 400, response.text
    assert f"Prompt template version {version_id} cannot be used" in response.text


def test_preview_rejects_invalid_inline_prompts(
    client: TestClient,
    llm_assistant_project: LLMAssistantProject,
) -> None:
    """Unsaved prompts are validated like stored ones."""
    response = _post_preview(
        client,
        _sentence_request(
            llm_assistant_project,
            prompts=template_prompts({"en": "<sentence>", "de": "<sentence>"}),
        ),
    )
    assert response.status_code == 400, response.text
    assert "must contain <codes>" in response.text


@pytest.mark.parametrize(
    "prompt_source",
    [
        # Neither inline prompts nor a version.
        pytest.param({"prompts": None, "prompt_template_version_id": None}, id="none"),
        # Both inline prompts and a version.
        pytest.param({"prompt_template_version_id": 1}, id="both"),
    ],
)
def test_preview_requires_exactly_one_prompt_source(
    client: TestClient,
    llm_assistant_project: LLMAssistantProject,
    prompt_source: dict[str, object],
) -> None:
    """Exactly one of prompts and prompt_template_version_id is set (HTTP 422)."""
    body = _sentence_request(
        llm_assistant_project,
        prompts=template_prompts(
            {"en": "<codes> <sentence>", "de": "<codes> <sentence>"}
        ),
    ).model_dump(mode="json")
    body.update(prompt_source)
    response = client.post(PREVIEW_URL, json=body)
    assert response.status_code == 422, response.text
    assert "Exactly one of prompts and prompt_template_version_id" in response.text


def test_preview_rejects_a_document_of_another_project(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """The previewed document must belong to the request's project (HTTP 400)."""
    base = prompt_template_project["base"]
    request = _sentence_request(
        base, version_id=prompt_template_project["sentence_v1"].id
    )
    request.sdoc_id = base["foreign_sdoc"].id
    response = _post_preview(client, request)
    assert response.status_code == 400, response.text
    assert "does not belong to project" in response.text


def test_preview_rejects_foreign_project(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """Previewing requires membership in the request's project."""
    base = prompt_template_project["base"]
    request = _sentence_request(
        base, version_id=prompt_template_project["sentence_v1"].id
    )
    request.project_id = base["foreign_project"].id
    response = _post_preview(client, request)
    assert response.status_code == 403, response.text
