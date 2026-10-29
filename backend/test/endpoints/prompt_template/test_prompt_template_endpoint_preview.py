import pytest
from fastapi.testclient import TestClient

from core.prompt_template.prompt_template_blocks import OUTPUT_FORMAT_INSTRUCTIONS
from core.prompt_template.prompt_template_dto import (
    PromptCode,
    PromptExample,
    PromptPreview,
    PromptPreviewRequest,
    PromptSettings,
    PromptTemplateSnapshot,
)
from core.prompt_template.prompt_template_enum import (
    DocumentUnit,
    OutputFormat,
    PromptLanguage,
    TaskType,
)

from .conftest import (
    CLAIM_DESCRIPTION,
    EXAMPLE_CONTENT,
    EXAMPLE_SENTENCES,
    PromptTemplateProject,
    prompt_code,
)

PREVIEW_URL = "/prompt_template/preview"
# four tokens per chunk with an overlap of two: the example document (11 tokens)
# becomes five chunks
SMALL_CHUNKS = PromptSettings(chunk_size_tokens=4, chunk_overlap_tokens=2)
EXAMPLE_CHUNKS = [
    "Alice wrote the report.",
    "the report. The report",
    "The report is long.",
    "is long. Bob read",
    "Bob read it.",
]
NUMBERED_SENTENCES = [
    f"{index + 1}: {sentence}" for index, sentence in enumerate(EXAMPLE_SENTENCES)
]


def _inline_prompt(unit: DocumentUnit) -> str:
    return f"Codes: <code_names>\n\n<output-format:inline>\n\nText:\n<document:{unit.value}>"


def _draft(
    task_type: TaskType,
    prompt: str,
    *,
    codes: list[PromptCode] | None = None,
    examples: list[PromptExample] | None = None,
    settings: PromptSettings | None = None,
    language: PromptLanguage = PromptLanguage.EN,
) -> PromptTemplateSnapshot:
    return PromptTemplateSnapshot(
        task_type=task_type,
        language=language,
        prompt=prompt,
        settings=settings or PromptSettings(),
        codes=codes or [],
        examples=examples or [],
    )


def _request(
    project: PromptTemplateProject,
    *,
    draft: PromptTemplateSnapshot | None = None,
    version_id: int | None = None,
    sdoc_id: int | None = None,
    message_index: int = 0,
) -> PromptPreviewRequest:
    return PromptPreviewRequest(
        project_id=project["project"].id,
        draft=draft,
        prompt_template_version_id=version_id,
        sdoc_id=sdoc_id,
        message_index=message_index,
    )


def _post_preview(client: TestClient, request: PromptPreviewRequest):
    return client.post(PREVIEW_URL, json=request.model_dump(mode="json"))


def _preview(client: TestClient, request: PromptPreviewRequest) -> PromptPreview:
    response = _post_preview(client, request)
    assert response.status_code == 200, response.text
    return PromptPreview.model_validate(response.json())


def _blocks(preview: PromptPreview) -> dict[str, str]:
    return {block.placeholder: block.text for block in preview.blocks}


# ===========================================================================
# PREVIEW (POST /prompt_template/preview) TESTS
# ===========================================================================


# --- A. prompts without a document --------------------------------------------------


def test_preview_of_a_draft_without_document_keeps_the_document_block(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """The blocks are filled, ``<document:whole>`` stays; there are no messages."""
    project = prompt_template_project
    draft = _draft(
        TaskType.SENTENCE_ANNOTATION,
        "Codes:\n<codes>\n\n<output-format:sentences>\n\n<document:whole>",
        codes=[prompt_code(project["claim_code"])],
    )
    preview = _preview(client, _request(project, draft=draft))

    instructions = OUTPUT_FORMAT_INSTRUCTIONS[OutputFormat.SENTENCES][PromptLanguage.EN]
    assert preview.sdoc_id is None
    assert preview.message_index == 0
    assert preview.num_messages == 0
    assert preview.prompt == (
        f"Codes:\nClaim: {CLAIM_DESCRIPTION}\n\n{instructions}\n\n<document:whole>"
    )
    assert _blocks(preview) == {
        "<output-format:sentences>": instructions,
        "<codes>": f"Claim: {CLAIM_DESCRIPTION}",
    }
    assert not preview.is_fewshot
    assert preview.unknown_placeholders == []


def test_preview_collapses_the_blank_lines_of_empty_blocks(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """An empty ``<examples>`` block leaves no gap of blank lines."""
    project = prompt_template_project
    draft = _draft(
        TaskType.ANNOTATION,
        "Codes: <code_names>\n\n<examples>\n\nText:\n<document:whole>\n"
        "<output-format:inline>",
        codes=[prompt_code(project["claim_code"])],
    )
    preview = _preview(client, _request(project, draft=draft))
    assert preview.prompt.startswith("Codes: CLAIM\n\nText:\n<document:whole>\n")
    assert "\n\n\n" not in preview.prompt
    assert _blocks(preview)["<examples>"] == ""
    assert not preview.is_fewshot


def test_preview_lists_unknown_placeholders(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """Placeholder-like tags no block fills are listed once and kept verbatim."""
    project = prompt_template_project
    draft = _draft(
        TaskType.ANNOTATION,
        "<code> <codes>\n<output-format:inline>\n<sentence> <code>\n<document:whole>",
        codes=[prompt_code(project["claim_code"])],
    )
    preview = _preview(client, _request(project, draft=draft))
    assert preview.unknown_placeholders == ["<code>", "<sentence>"]
    assert preview.prompt.startswith(f"<code> CLAIM: {CLAIM_DESCRIPTION}\n")
    assert "\n<sentence> <code>\n<document:whole>" in preview.prompt


# --- B. documents and messages ------------------------------------------------------


@pytest.mark.parametrize(
    "unit,settings,message_index,expected_num_messages,expected_text",
    [
        # The whole document is one message.
        pytest.param(
            DocumentUnit.WHOLE, PromptSettings(), 0, 1, EXAMPLE_CONTENT, id="whole"
        ),
        # Every sentence is one message.
        pytest.param(
            DocumentUnit.SENTENCES,
            PromptSettings(),
            1,
            3,
            EXAMPLE_SENTENCES[1],
            id="sentences",
        ),
        # The last sentence is the last message.
        pytest.param(
            DocumentUnit.SENTENCES,
            PromptSettings(),
            2,
            3,
            EXAMPLE_SENTENCES[2],
            id="sentences-last",
        ),
        # A document shorter than one chunk is one message.
        pytest.param(
            DocumentUnit.CHUNKS, PromptSettings(), 0, 1, EXAMPLE_CONTENT, id="chunks"
        ),
        # Small chunks overlap by two tokens.
        pytest.param(
            DocumentUnit.CHUNKS, SMALL_CHUNKS, 1, 5, EXAMPLE_CHUNKS[1], id="chunk-1"
        ),
        # The last chunk ends with the document.
        pytest.param(
            DocumentUnit.CHUNKS, SMALL_CHUNKS, 4, 5, EXAMPLE_CHUNKS[4], id="chunk-4"
        ),
    ],
)
def test_preview_splits_the_document_by_its_unit(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
    unit: DocumentUnit,
    settings: PromptSettings,
    message_index: int,
    expected_num_messages: int,
    expected_text: str,
) -> None:
    """The document block is replaced with the text of the requested message."""
    project = prompt_template_project
    draft = _draft(
        TaskType.ANNOTATION,
        _inline_prompt(unit),
        codes=[prompt_code(project["claim_code"])],
        settings=settings,
    )
    preview = _preview(
        client,
        _request(
            project,
            draft=draft,
            sdoc_id=project["sdoc"].id,
            message_index=message_index,
        ),
    )
    instructions = OUTPUT_FORMAT_INSTRUCTIONS[OutputFormat.INLINE][PromptLanguage.EN]
    assert preview.sdoc_id == project["sdoc"].id
    assert preview.message_index == message_index
    assert preview.num_messages == expected_num_messages
    assert preview.prompt == (
        f"Codes: CLAIM\n\n{instructions}\n\nText:\n{expected_text}"
    )


@pytest.mark.parametrize(
    "unit,settings,message_index,expected_num_messages,expected_text",
    [
        # The whole document shows every sentence with its number.
        pytest.param(
            DocumentUnit.WHOLE,
            PromptSettings(),
            0,
            1,
            "\n".join(NUMBERED_SENTENCES),
            id="whole",
        ),
        # A sentence message keeps the global number of its sentence.
        pytest.param(
            DocumentUnit.SENTENCES,
            PromptSettings(),
            2,
            3,
            NUMBERED_SENTENCES[2],
            id="sentences",
        ),
        # A chunk shows the whole sentences that start within it.
        pytest.param(
            DocumentUnit.CHUNKS,
            SMALL_CHUNKS,
            1,
            5,
            NUMBERED_SENTENCES[1],
            id="chunks",
        ),
    ],
)
def test_preview_numbers_the_sentences_globally(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
    unit: DocumentUnit,
    settings: PromptSettings,
    message_index: int,
    expected_num_messages: int,
    expected_text: str,
) -> None:
    """The sentence format shows ``n: sentence`` lines with document-wide numbers."""
    project = prompt_template_project
    draft = _draft(
        TaskType.SENTENCE_ANNOTATION,
        f"<code_names>\n<output-format:sentences>\nDocument:\n<document:{unit.value}>",
        codes=[prompt_code(project["claim_code"])],
        settings=settings,
    )
    preview = _preview(
        client,
        _request(
            project,
            draft=draft,
            sdoc_id=project["sdoc"].id,
            message_index=message_index,
        ),
    )
    assert preview.num_messages == expected_num_messages
    assert preview.prompt.endswith(f"\nDocument:\n{expected_text}")


def test_preview_renders_a_stored_version(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """Version 2 of ``Span tagging`` splits by sentences and shows its example."""
    project = prompt_template_project
    version = project["span_template"].versions[1]
    preview = _preview(
        client,
        _request(
            project,
            version_id=version.id,
            sdoc_id=project["sdoc"].id,
            message_index=2,
        ),
    )
    assert preview.num_messages == 3
    assert preview.is_fewshot
    assert preview.prompt.startswith(
        f"Tag these codes: PERSON, CLAIM\n"
        f"PERSON: {project['person_code'].description}\nCLAIM: {CLAIM_DESCRIPTION}"
    )
    assert preview.prompt.endswith(f"\n\nText:\n{EXAMPLE_SENTENCES[2]}")


# --- C. few-shot examples -----------------------------------------------------------
# Examples only show spans of the selected codes; an example without such spans is
# dropped, and a prompt without rendered examples is zero-shot.


def test_preview_inline_examples_tag_all_selected_spans(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """Every selected span of an example is tagged in its output."""
    project = prompt_template_project
    draft = _draft(
        TaskType.ANNOTATION,
        "<codes>\n<output-format:inline>\n<examples>\n<document:whole>",
        codes=[prompt_code(project["person_code"]), prompt_code(project["claim_code"])],
        examples=[project["alice_example"], project["bob_example"]],
    )
    preview = _preview(client, _request(project, draft=draft))

    assert preview.is_fewshot
    assert _blocks(preview)["<examples>"] == (
        "Examples:\n"
        "Input:\nAlice wrote the report.\n"
        "Output:\n<PERSON>Alice</PERSON> wrote <CLAIM>the report</CLAIM>.\n\n"
        "Input:\nBob read it.\n"
        "Output:\n<PERSON>Bob</PERSON> read it."
    )


def test_preview_inline_examples_skip_spans_of_unselected_codes(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """With Claim only, PERSON spans are not tagged and the Bob example is dropped."""
    project = prompt_template_project
    draft = _draft(
        TaskType.ANNOTATION,
        "<codes>\n<output-format:inline>\n<examples>\n<document:whole>",
        codes=[prompt_code(project["claim_code"])],
        examples=[project["alice_example"], project["bob_example"]],
    )
    preview = _preview(client, _request(project, draft=draft))

    assert preview.is_fewshot
    assert _blocks(preview)["<examples>"] == (
        "Examples:\n"
        "Input:\nAlice wrote the report.\n"
        "Output:\nAlice wrote <CLAIM>the report</CLAIM>."
    )


def test_preview_without_examples_of_selected_codes_is_zero_shot(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """The Bob example has no Claim span, so nothing is shown and the run is zero-shot."""
    project = prompt_template_project
    draft = _draft(
        TaskType.ANNOTATION,
        "<codes>\n<output-format:inline>\n<examples>\n<document:whole>",
        codes=[prompt_code(project["claim_code"])],
        examples=[project["bob_example"]],
    )
    preview = _preview(client, _request(project, draft=draft))

    assert not preview.is_fewshot
    assert _blocks(preview)["<examples>"] == ""


@pytest.mark.parametrize(
    "language,expected_examples",
    [
        # English labels.
        pytest.param(
            PromptLanguage.EN,
            "Examples:\n\n"
            "Example text:\nAlice wrote the report.\n\n"
            "Expected passages:\n"
            "Category: PERSON\nExact quote: Alice\n"
            "Context before: \nContext after:  wrot\n\n"
            "Category: CLAIM\nExact quote: the report\n"
            "Context before: rote \nContext after: .",
            id="en",
        ),
        # German labels.
        pytest.param(
            PromptLanguage.DE,
            "Beispiele:\n\n"
            "Beispieltext:\nAlice wrote the report.\n\n"
            "Erwartete Passagen:\n"
            "Kategorie: PERSON\nExaktes Zitat: Alice\n"
            "Kontext davor: \nKontext danach:  wrot\n\n"
            "Kategorie: CLAIM\nExaktes Zitat: the report\n"
            "Kontext davor: rote \nKontext danach: .",
            id="de",
        ),
    ],
)
def test_preview_context_examples_show_quotes_with_context(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
    language: PromptLanguage,
    expected_examples: str,
) -> None:
    """Each selected span becomes a passage with five characters of context."""
    project = prompt_template_project
    draft = _draft(
        TaskType.ANNOTATION,
        "<codes>\n<output-format:context>\n<examples>\n<document:chunks>",
        codes=[prompt_code(project["person_code"]), prompt_code(project["claim_code"])],
        examples=[project["alice_example"]],
        settings=PromptSettings(context_before_chars=5, context_after_chars=5),
        language=language,
    )
    preview = _preview(client, _request(project, draft=draft))

    assert preview.is_fewshot
    assert _blocks(preview)["<examples>"] == expected_examples
    assert _blocks(preview)["<output-format:context>"] == OUTPUT_FORMAT_INSTRUCTIONS[
        OutputFormat.CONTEXT
    ][language].format(context_before_chars=5, context_after_chars=5)


def test_preview_sentence_examples_are_grouped_by_code(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """Sentence examples are listed under the name of their code."""
    project = prompt_template_project
    draft = _draft(
        TaskType.SENTENCE_ANNOTATION,
        "<codes>\n<output-format:sentences>\n<examples>\n<document:whole>",
        codes=[prompt_code(project["claim_code"])],
        examples=[project["sentence_example"]],
    )
    preview = _preview(client, _request(project, draft=draft))

    assert preview.is_fewshot
    assert _blocks(preview)["<examples>"] == (
        "Examples of sentences for each category:\n"
        f"Claim:\n- {EXAMPLE_SENTENCES[1]} {EXAMPLE_SENTENCES[2]}"
    )


# --- D. invalid requests ------------------------------------------------------------


def test_preview_rejects_a_message_index_out_of_range(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """The example document has three sentence messages, so index 3 is HTTP 400."""
    project = prompt_template_project
    draft = _draft(
        TaskType.ANNOTATION,
        _inline_prompt(DocumentUnit.SENTENCES),
        codes=[prompt_code(project["claim_code"])],
    )
    response = _post_preview(
        client,
        _request(project, draft=draft, sdoc_id=project["sdoc"].id, message_index=3),
    )
    assert response.status_code == 400, response.text
    assert "Message 3 does not exist" in response.text
    assert "has 3 message(s)" in response.text


def test_preview_rejects_a_document_of_another_project(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """Only documents of the request's project can be rendered (HTTP 400)."""
    project = prompt_template_project
    draft = _draft(
        TaskType.ANNOTATION,
        _inline_prompt(DocumentUnit.WHOLE),
        codes=[prompt_code(project["claim_code"])],
    )
    response = _post_preview(
        client, _request(project, draft=draft, sdoc_id=project["foreign_sdoc"].id)
    )
    assert response.status_code == 400, response.text
    assert "does not belong to project" in response.text


def test_preview_rejects_a_version_of_another_project(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """A version of the unauthorized project cannot be rendered (HTTP 400)."""
    project = prompt_template_project
    version_id = project["foreign_template"].versions[0].id
    response = _post_preview(client, _request(project, version_id=version_id))
    assert response.status_code == 400, response.text
    assert f"Prompt version {version_id} cannot be used" in response.text


def test_preview_rejects_an_invalid_draft(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """Drafts are validated like saved templates (HTTP 400)."""
    project = prompt_template_project
    draft = _draft(TaskType.ANNOTATION, "<codes>\n<output-format:inline>")
    response = _post_preview(client, _request(project, draft=draft))
    assert response.status_code == 400, response.text
    assert "must contain exactly one document block" in response.text


def test_preview_rejects_foreign_project(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """Previewing requires membership in the request's project."""
    project = prompt_template_project
    request = _request(
        project, version_id=project["foreign_template"].versions[0].id
    ).model_copy(update={"project_id": project["foreign_project"].id})
    response = _post_preview(client, request)
    assert response.status_code == 403, response.text


@pytest.mark.parametrize(
    "has_version,has_draft",
    [
        # Both prompt sources are contradictory.
        pytest.param(True, True, id="both"),
        # One prompt source is required.
        pytest.param(False, False, id="neither"),
    ],
)
def test_preview_requires_exactly_one_prompt_source(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
    has_version: bool,
    has_draft: bool,
) -> None:
    """Exactly one of version id and draft must be set (HTTP 422)."""
    project = prompt_template_project
    draft = _draft(
        TaskType.ANNOTATION,
        _inline_prompt(DocumentUnit.WHOLE),
        codes=[prompt_code(project["claim_code"])],
    )
    body = {
        "project_id": project["project"].id,
        "prompt_template_version_id": (
            project["span_template"].versions[0].id if has_version else None
        ),
        "draft": draft.model_dump(mode="json") if has_draft else None,
    }
    response = client.post(PREVIEW_URL, json=body)
    assert response.status_code == 422, response.text
    assert "Exactly one of prompt_template_version_id and draft" in response.text


def test_preview_rejects_a_negative_message_index(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """Message indices start at 0 (HTTP 422)."""
    project = prompt_template_project
    body = {
        "project_id": project["project"].id,
        "prompt_template_version_id": project["span_template"].versions[0].id,
        "message_index": -1,
    }
    response = client.post(PREVIEW_URL, json=body)
    assert response.status_code == 422, response.text
    assert "message_index" in response.text
