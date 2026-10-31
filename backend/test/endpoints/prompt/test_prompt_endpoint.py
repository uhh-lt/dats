import pytest
from fastapi.testclient import TestClient
from pydantic import TypeAdapter

from common.meta_type_enum import MetaType
from core.prompt.prompt_blocks import OUTPUT_FORMAT_INSTRUCTIONS
from core.prompt.prompt_defaults import DEFAULT_PROMPTS
from core.prompt.prompt_dto import (
    PromptCode,
    PromptContent,
    PromptCreate,
    PromptExample,
    PromptExamplesCreate,
    PromptExampleSpan,
    PromptMetadataField,
    PromptPreview,
    PromptPreviewRequest,
    PromptRead,
    PromptSettings,
    PromptSnapshot,
    PromptTag,
    PromptTaskInfo,
    PromptUpdate,
    PromptVersionCreate,
    PromptVersionRead,
    SentencePromptExample,
    SpanPromptExample,
)
from core.prompt.prompt_enum import (
    DocumentUnit,
    OutputFormat,
    PromptBlock,
    PromptExampleKind,
    PromptLanguage,
    TaskType,
)
from core.prompt.prompt_specs import OUTPUT_FORMAT_SPECS
from core.user.user_crud import SYSTEM_USER_ID
from core.user.user_orm import UserORM

from .conftest import (
    CLAIM_DESCRIPTION,
    EXAMPLE_CONTENT,
    EXAMPLE_SENTENCES,
    SPAN_V1_PROMPT,
    SPAN_V2_PROMPT,
    PromptProject,
    prompt_code,
)

PROMPT_URL = "/prompt"
PromptList = TypeAdapter(list[PromptRead])
PromptExampleList = TypeAdapter(list[PromptExample])

# name of every default prompt -> (output format, language)
DEFAULT_PROMPT_FORMATS: dict[str, tuple[OutputFormat, PromptLanguage]] = {
    "default-document-tagging-de": (OutputFormat.TAGS, PromptLanguage.DE),
    "default-document-tagging-en": (OutputFormat.TAGS, PromptLanguage.EN),
    "default-metadata-extraction-de": (OutputFormat.METADATA, PromptLanguage.DE),
    "default-metadata-extraction-en": (OutputFormat.METADATA, PromptLanguage.EN),
    "default-sentence-annotation-de": (OutputFormat.SENTENCES, PromptLanguage.DE),
    "default-sentence-annotation-en": (OutputFormat.SENTENCES, PromptLanguage.EN),
    "default-span-annotation-context-anchored-extraction-de": (
        OutputFormat.CONTEXT,
        PromptLanguage.DE,
    ),
    "default-span-annotation-context-anchored-extraction-en": (
        OutputFormat.CONTEXT,
        PromptLanguage.EN,
    ),
    "default-span-annotation-inline-tagging-de": (
        OutputFormat.INLINE,
        PromptLanguage.DE,
    ),
    "default-span-annotation-inline-tagging-en": (
        OutputFormat.INLINE,
        PromptLanguage.EN,
    ),
}

TAGGING_PROMPT = "Tags:\n<tags>\n\n<output-format:tags>\n\n<document:whole>"
METADATA_PROMPT = (
    "Fields:\n<metadata_fields>\n\n<output-format:metadata>\n\n<document:whole>"
)
SENTENCE_PROMPT = "Codes:\n<codes>\n\n<output-format:sentences>\n\n<document:whole>"
CONTEXT_PROMPT = "Codes:\n<codes>\n\n<output-format:context>\n\n<document:chunks>"

PREVIEW_URL = "/prompt/preview"
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


def _put_prompt(client: TestClient, create_dto: PromptCreate):
    return client.put(PROMPT_URL, json=create_dto.model_dump(mode="json"))


# ===========================================================================
# DEFAULT PROMPTS (project creation) TESTS
# ===========================================================================


def test_new_projects_get_one_default_prompt_per_output_format_and_language(
    client: TestClient,
    prompt_project: PromptProject,
) -> None:
    """Every default has version 1 by the system user with the default prompt.

    The defaults select nothing (a new project has no codes, tags or fields).
    """
    response = client.get(f"{PROMPT_URL}/project/{prompt_project['project'].id}")
    assert response.status_code == 200, response.text
    defaults = [
        prompt
        for prompt in PromptList.validate_python(response.json())
        if prompt.name.startswith("default-")
    ]

    assert [prompt.name for prompt in defaults] == list(DEFAULT_PROMPT_FORMATS)
    for prompt in defaults:
        output_format, language = DEFAULT_PROMPT_FORMATS[prompt.name]
        assert prompt.task_type == OUTPUT_FORMAT_SPECS[output_format].task_type
        assert prompt.language == language
        assert not prompt.is_archived
        assert [version.version for version in prompt.versions] == [1]
        version = prompt.versions[0]
        assert version.user_id == SYSTEM_USER_ID
        assert version.text == DEFAULT_PROMPTS[output_format][language]
        assert version.settings == PromptSettings()
        assert version.codes == []
        assert version.examples == []
        assert version.tags == []
        assert version.metadata_fields == []


# ===========================================================================
# TASK INFO (GET /prompt/task_info) TESTS
# ===========================================================================


@pytest.mark.parametrize(
    "task_type,expected_units,expected_formats,expected_blocks,expected_required,expected_kind",
    [
        # Tagging describes the whole document with the selected tags.
        pytest.param(
            TaskType.TAGGING,
            [DocumentUnit.WHOLE],
            [OutputFormat.TAGS],
            [PromptBlock.TAGS],
            [PromptBlock.TAGS],
            None,
            id="tagging",
        ),
        # Metadata extraction reads the whole document for the selected fields.
        pytest.param(
            TaskType.METADATA_EXTRACTION,
            [DocumentUnit.WHOLE],
            [OutputFormat.METADATA],
            [PromptBlock.METADATA_FIELDS],
            [PromptBlock.METADATA_FIELDS],
            None,
            id="metadata",
        ),
        # Sentence annotation splits documents any way and shows sentence examples.
        pytest.param(
            TaskType.SENTENCE_ANNOTATION,
            list(DocumentUnit),
            [OutputFormat.SENTENCES],
            [PromptBlock.CODES, PromptBlock.CODE_NAMES, PromptBlock.EXAMPLES],
            [PromptBlock.CODES, PromptBlock.CODE_NAMES],
            PromptExampleKind.SENTENCE,
            id="sentence-annotation",
        ),
        # Span annotation offers inline tags (default) and quotes with context.
        pytest.param(
            TaskType.ANNOTATION,
            list(DocumentUnit),
            [OutputFormat.INLINE, OutputFormat.CONTEXT],
            [PromptBlock.CODES, PromptBlock.CODE_NAMES, PromptBlock.EXAMPLES],
            [PromptBlock.CODES, PromptBlock.CODE_NAMES],
            PromptExampleKind.SPAN,
            id="span-annotation",
        ),
    ],
)
def test_get_task_info_describes_the_blocks_of_a_task(
    client: TestClient,
    task_type: TaskType,
    expected_units: list[DocumentUnit],
    expected_formats: list[OutputFormat],
    expected_blocks: list[PromptBlock],
    expected_required: list[PromptBlock],
    expected_kind: PromptExampleKind | None,
) -> None:
    """Units, formats, blocks and example kind follow the task; all are described."""
    response = client.get(
        f"{PROMPT_URL}/task_info", params={"task_type": task_type.value}
    )
    assert response.status_code == 200, response.text
    info = PromptTaskInfo.model_validate(response.json())

    assert info.task_type == task_type
    assert [(unit.unit, unit.placeholder) for unit in info.document_units] == [
        (unit, f"<document:{unit.value}>") for unit in expected_units
    ]
    assert [
        (output_format.output_format, output_format.placeholder)
        for output_format in info.output_formats
    ] == [
        (output_format, f"<output-format:{output_format.value}>")
        for output_format in expected_formats
    ]
    assert [
        output_format.default_document_unit for output_format in info.output_formats
    ] == [
        OUTPUT_FORMAT_SPECS[output_format].default_document_unit
        for output_format in expected_formats
    ]
    assert [block.block for block in info.blocks] == expected_blocks
    assert info.required_blocks == expected_required
    assert info.example_kind == expected_kind
    assert all(unit.description for unit in info.document_units)
    assert all(
        output_format.name and output_format.description
        for output_format in info.output_formats
    )
    assert all(block.description for block in info.blocks)


def test_get_task_info_rejects_an_unknown_task(client: TestClient) -> None:
    """An unknown task type is rejected by request validation (HTTP 422)."""
    response = client.get(f"{PROMPT_URL}/task_info", params={"task_type": "UNKNOWN"})
    assert response.status_code == 422, response.text


# ===========================================================================
# DEFAULT PROMPT (GET /prompt/default) TESTS
# ===========================================================================


@pytest.mark.parametrize(
    "output_format,language",
    [
        pytest.param(output_format, language, id=f"{output_format.value}-{language}")
        # Every output format has a default prompt in every language.
        for output_format in OutputFormat
        for language in PromptLanguage
    ],
)
def test_get_default_returns_the_default_prompt_without_selections(
    client: TestClient,
    output_format: OutputFormat,
    language: PromptLanguage,
) -> None:
    """The default prompt contains the format's blocks and selects nothing."""
    response = client.get(
        f"{PROMPT_URL}/default",
        params={"output_format": output_format.value, "language": language.value},
    )
    assert response.status_code == 200, response.text
    default = PromptContent.model_validate(response.json())

    assert default == PromptContent(text=DEFAULT_PROMPTS[output_format][language])
    assert f"<output-format:{output_format.value}>" in default.text
    unit = OUTPUT_FORMAT_SPECS[output_format].default_document_unit
    assert f"<document:{unit.value}>" in default.text


@pytest.mark.parametrize(
    "params",
    [
        # The output format must be one of the declared formats.
        pytest.param({"output_format": "unknown", "language": "en"}, id="format"),
        # The language must be one of the declared languages.
        pytest.param({"output_format": "inline", "language": "fr"}, id="language"),
        # Both parameters are required.
        pytest.param({"output_format": "inline"}, id="missing-language"),
    ],
)
def test_get_default_rejects_invalid_parameters(
    client: TestClient, params: dict[str, str]
) -> None:
    """Unknown or missing parameters return HTTP 422."""
    response = client.get(f"{PROMPT_URL}/default", params=params)
    assert response.status_code == 422, response.text


# ===========================================================================
# CREATE PROMPT (PUT /prompt) TESTS
# ===========================================================================


# --- A. valid prompts -----------------------------------------------------------


def test_create_prompt_stores_the_content_as_version_one(
    client: TestClient,
    prompt_project: PromptProject,
    test_user: UserORM,
) -> None:
    """A new prompt has exactly one version (number 1) with the whole content."""
    project = prompt_project
    create_dto = PromptCreate(
        project_id=project["project"].id,
        name="New prompt",
        task_type=TaskType.ANNOTATION,
        language=PromptLanguage.DE,
        text=SPAN_V2_PROMPT,
        settings=PromptSettings(chunk_size_tokens=100, chunk_overlap_tokens=10),
        codes=[prompt_code(project["claim_code"])],
        examples=[project["alice_example"]],
    )
    response = _put_prompt(client, create_dto)
    assert response.status_code == 200, response.text
    prompt = PromptRead.model_validate(response.json())

    assert prompt.name == "New prompt"
    assert prompt.project_id == project["project"].id
    assert prompt.task_type == TaskType.ANNOTATION
    assert prompt.language == PromptLanguage.DE
    assert not prompt.is_archived
    assert [version.version for version in prompt.versions] == [1]
    version = prompt.versions[0]
    assert version.text == SPAN_V2_PROMPT
    assert version.settings == create_dto.settings
    assert version.codes == create_dto.codes
    assert version.examples == [project["alice_example"]]
    assert version.tags == []
    assert version.metadata_fields == []
    assert version.user_id == test_user.id
    assert version.prompt_id == prompt.id


@pytest.mark.parametrize(
    "task_type,text,selection",
    [
        # Tagging needs <tags> and the whole document.
        pytest.param(TaskType.TAGGING, TAGGING_PROMPT, "tag", id="tagging"),
        # Metadata extraction needs <metadata_fields> and the whole document.
        pytest.param(
            TaskType.METADATA_EXTRACTION, METADATA_PROMPT, "field", id="metadata"
        ),
        # Sentence annotation may split the document into chunks.
        pytest.param(
            TaskType.SENTENCE_ANNOTATION,
            SENTENCE_PROMPT.replace("<document:whole>", "<document:chunks>"),
            "code",
            id="sentence-annotation-chunks",
        ),
        # Span annotation with quotes and context.
        pytest.param(TaskType.ANNOTATION, CONTEXT_PROMPT, "code", id="context"),
        # <code_names> alone satisfies the required code block.
        pytest.param(TaskType.ANNOTATION, SPAN_V1_PROMPT, "code", id="code-names"),
        # Prompts may be saved before they select anything.
        pytest.param(TaskType.TAGGING, TAGGING_PROMPT, "none", id="no-selection"),
    ],
)
def test_create_prompt_accepts_every_task(
    client: TestClient,
    prompt_project: PromptProject,
    task_type: TaskType,
    text: str,
    selection: str,
) -> None:
    """Prompts of every task can be stored with valid blocks and selections."""
    project = prompt_project
    field = project["author_field"]
    create_dto = PromptCreate(
        project_id=project["project"].id,
        name="New prompt",
        task_type=task_type,
        language=PromptLanguage.EN,
        text=text,
        codes=[prompt_code(project["claim_code"])] if selection == "code" else [],
        tags=(
            [PromptTag(tag_id=project["report_tag"].id, name="Report", description="")]
            if selection == "tag"
            else []
        ),
        metadata_fields=(
            [
                PromptMetadataField(
                    project_metadata_id=field.id,
                    key=field.key,
                    description=field.description,
                    metatype=MetaType(field.metatype),
                )
            ]
            if selection == "field"
            else []
        ),
    )
    response = _put_prompt(client, create_dto)
    assert response.status_code == 200, response.text
    prompt = PromptRead.model_validate(response.json())
    assert prompt.task_type == task_type
    version = prompt.versions[0]
    assert (version.codes, version.tags, version.metadata_fields) == (
        create_dto.codes,
        create_dto.tags,
        create_dto.metadata_fields,
    )


# --- B. invalid prompts (HTTP 400 contracts) ---------------------------------------
# Each case breaks exactly one block or selection rule of its task.


def _selection(project: PromptProject, key: str) -> dict[str, object]:
    """The selections of an invalid-prompt case, by key."""
    alice = project["alice_example"]
    match key:
        case "span-example":
            return {"examples": [alice]}
        case "sentence-example":
            return {"examples": [project["sentence_example"]]}
        case "foreign-code":
            return {"codes": [prompt_code(project["foreign_code"])]}
        case "foreign-tag":
            tag = project["foreign_tag"]
            return {"tags": [PromptTag(tag_id=tag.id, name=tag.name, description="")]}
        case "foreign-example":
            foreign_span = alice.spans[0].model_copy(
                update={"code_id": project["foreign_code"].id}
            )
            return {"examples": [alice.model_copy(update={"spans": [foreign_span]})]}
        case _:
            return {}


@pytest.mark.parametrize(
    "task_type,text,selection,expected_fragment",
    [
        # Every prompt needs a document block.
        pytest.param(
            TaskType.ANNOTATION,
            "<codes>\n<output-format:inline>",
            "none",
            "must contain exactly one document block",
            id="missing-document",
        ),
        # Only one document block decides how documents are split.
        pytest.param(
            TaskType.ANNOTATION,
            "<codes>\n<output-format:inline>\n<document:whole>\n<document:sentences>",
            "none",
            "must contain exactly one document block",
            id="duplicate-document",
        ),
        # The document block needs a unit.
        pytest.param(
            TaskType.ANNOTATION,
            "<codes>\n<output-format:inline>\n<document>",
            "none",
            "<document:> is not supported for this task",
            id="document-without-unit",
        ),
        # Tags describe the whole document, so tagging cannot split it.
        pytest.param(
            TaskType.TAGGING,
            "<tags>\n<output-format:tags>\n<document:sentences>",
            "none",
            "<document:sentences> is not supported for this task",
            id="tagging-sentences",
        ),
        # Every prompt needs an output format block.
        pytest.param(
            TaskType.ANNOTATION,
            "<codes>\n<document:whole>",
            "none",
            "must contain exactly one output format block",
            id="missing-output-format",
        ),
        # Only one output format block decides the answer format.
        pytest.param(
            TaskType.ANNOTATION,
            "<codes>\n<output-format:inline>\n<output-format:context>\n"
            "<document:whole>",
            "none",
            "must contain exactly one output format block",
            id="duplicate-output-format",
        ),
        # The output format must belong to the task.
        pytest.param(
            TaskType.ANNOTATION,
            "<codes>\n<output-format:tags>\n<document:whole>",
            "none",
            "<output-format:tags> is not supported for this task",
            id="output-format-of-another-task",
        ),
        # Span annotation needs <codes> or <code_names>.
        pytest.param(
            TaskType.ANNOTATION,
            "<examples>\n<output-format:inline>\n<document:whole>",
            "none",
            "must contain <codes> or <code_names>",
            id="missing-codes",
        ),
        # Tagging needs <tags>.
        pytest.param(
            TaskType.TAGGING,
            "<output-format:tags>\n<document:whole>",
            "none",
            "must contain <tags>",
            id="missing-tags",
        ),
        # Tags only exist in tagging.
        pytest.param(
            TaskType.ANNOTATION,
            "<codes>\n<tags>\n<output-format:inline>\n<document:whole>",
            "none",
            "<tags> is not supported for this task",
            id="tags-in-span-annotation",
        ),
        # Examples only exist in annotation tasks.
        pytest.param(
            TaskType.METADATA_EXTRACTION,
            "<metadata_fields>\n<examples>\n<output-format:metadata>\n<document:whole>",
            "none",
            "<examples> is not supported for this task",
            id="examples-block-in-metadata",
        ),
        # Examples must be shown somewhere in the prompt.
        pytest.param(
            TaskType.ANNOTATION,
            SPAN_V1_PROMPT,
            "span-example",
            "Add <examples> to the prompt",
            id="examples-without-block",
        ),
        # Span annotation takes span examples only.
        pytest.param(
            TaskType.ANNOTATION,
            SPAN_V2_PROMPT,
            "sentence-example",
            "only supports examples of kind SPAN",
            id="sentence-example-in-span-annotation",
        ),
        # Sentence annotation takes sentence examples only.
        pytest.param(
            TaskType.SENTENCE_ANNOTATION,
            SENTENCE_PROMPT + "\n<examples>",
            "span-example",
            "only supports examples of kind SENTENCE",
            id="span-example-in-sentence-annotation",
        ),
        # Tagging has no few-shot examples.
        pytest.param(
            TaskType.TAGGING,
            TAGGING_PROMPT,
            "span-example",
            "does not support few-shot examples",
            id="examples-in-tagging",
        ),
        # Codes must belong to the prompt's project.
        pytest.param(
            TaskType.ANNOTATION,
            SPAN_V1_PROMPT,
            "foreign-code",
            "which do not belong to project",
            id="foreign-code",
        ),
        # Tags must belong to the prompt's project.
        pytest.param(
            TaskType.TAGGING,
            TAGGING_PROMPT,
            "foreign-tag",
            "which do not belong to project",
            id="foreign-tag",
        ),
        # The spans of examples must show codes of the prompt's project.
        pytest.param(
            TaskType.ANNOTATION,
            SPAN_V2_PROMPT,
            "foreign-example",
            "which do not belong to project",
            id="foreign-example-code",
        ),
    ],
)
def test_create_prompt_rejects_invalid_blocks_and_selections(
    client: TestClient,
    prompt_project: PromptProject,
    task_type: TaskType,
    text: str,
    selection: str,
    expected_fragment: str,
) -> None:
    """Block and selection rule violations return HTTP 400 with the broken rule."""
    project = prompt_project
    create_dto = PromptCreate.model_validate(
        {
            "project_id": project["project"].id,
            "name": "New prompt",
            "task_type": task_type,
            "language": PromptLanguage.EN,
            "text": text,
            **_selection(project, selection),
        }
    )
    response = _put_prompt(client, create_dto)
    assert response.status_code == 400, response.text
    assert expected_fragment in response.text


def test_create_prompt_rejects_a_duplicate_name(
    client: TestClient,
    prompt_project: PromptProject,
) -> None:
    """Prompt names are unique per project (HTTP 409)."""
    response = _put_prompt(
        client,
        PromptCreate(
            project_id=prompt_project["project"].id,
            name="Span tagging",
            task_type=TaskType.ANNOTATION,
            language=PromptLanguage.EN,
            text=SPAN_V1_PROMPT,
        ),
    )
    assert response.status_code == 409, response.text


def test_create_prompt_rejects_foreign_project(
    client: TestClient,
    prompt_project: PromptProject,
) -> None:
    """Creating requires membership in the prompt's project."""
    response = _put_prompt(
        client,
        PromptCreate(
            project_id=prompt_project["foreign_project"].id,
            name="New prompt",
            task_type=TaskType.ANNOTATION,
            language=PromptLanguage.EN,
            text=SPAN_V1_PROMPT,
        ),
    )
    assert response.status_code == 403, response.text


@pytest.mark.parametrize(
    "field",
    [
        # A prompt is written in one language.
        pytest.param("language", id="language"),
        # A prompt is made for one task.
        pytest.param("task_type", id="task-type"),
        # A prompt has a text.
        pytest.param("text", id="text"),
    ],
)
def test_create_prompt_requires_language_task_and_text(
    client: TestClient,
    prompt_project: PromptProject,
    field: str,
) -> None:
    """Missing required fields return HTTP 422."""
    body = PromptCreate(
        project_id=prompt_project["project"].id,
        name="New prompt",
        task_type=TaskType.ANNOTATION,
        language=PromptLanguage.EN,
        text=SPAN_V1_PROMPT,
    ).model_dump(mode="json")
    del body[field]
    response = client.put(PROMPT_URL, json=body)
    assert response.status_code == 422, response.text
    assert field in response.text


def test_create_prompt_rejects_a_chunk_overlap_not_below_the_size(
    client: TestClient,
    prompt_project: PromptProject,
) -> None:
    """The chunk overlap must be smaller than the chunk size (HTTP 422)."""
    body = PromptCreate(
        project_id=prompt_project["project"].id,
        name="New prompt",
        task_type=TaskType.ANNOTATION,
        language=PromptLanguage.EN,
        text=CONTEXT_PROMPT,
    ).model_dump(mode="json")
    body["settings"] = {"chunk_size_tokens": 10, "chunk_overlap_tokens": 10}
    response = client.put(PROMPT_URL, json=body)
    assert response.status_code == 422, response.text
    assert "The chunk overlap must be smaller than the chunk size" in response.text


# ===========================================================================
# CREATE VERSION (PUT /prompt/{id}/version) TESTS
# ===========================================================================


def test_create_version_appends_the_next_version_and_keeps_older_ones(
    client: TestClient,
    prompt_project: PromptProject,
    test_user: UserORM,
) -> None:
    """Saving creates version 3; versions 1 and 2 stay unchanged."""
    project = prompt_project
    prompt = project["span_prompt"]
    new_version = PromptVersionCreate(
        text=CONTEXT_PROMPT, codes=[prompt_code(project["claim_code"])]
    )
    response = client.put(
        f"{PROMPT_URL}/{prompt.id}/version",
        json=new_version.model_dump(mode="json"),
    )
    assert response.status_code == 200, response.text
    updated = PromptRead.model_validate(response.json())

    assert [version.version for version in updated.versions] == [1, 2, 3]
    assert updated.versions[:2] == prompt.versions
    assert [version.text for version in updated.versions] == [
        SPAN_V1_PROMPT,
        SPAN_V2_PROMPT,
        CONTEXT_PROMPT,
    ]
    assert updated.versions[2].codes == new_version.codes
    assert updated.versions[2].user_id == test_user.id


def test_create_version_stores_local_definitions_without_changing_the_project(
    client: TestClient,
    prompt_project: PromptProject,
) -> None:
    """A code edited in the prompt is saved with the version only; the project's
    code Claim keeps its name and description."""
    project = prompt_project
    prompt = project["span_prompt"]
    claim = project["claim_code"]
    local_claim = PromptCode(
        code_id=claim.id, name="Assertion", description="Something claimed as true."
    )
    response = client.put(
        f"{PROMPT_URL}/{prompt.id}/version",
        json=PromptVersionCreate(text=SPAN_V1_PROMPT, codes=[local_claim]).model_dump(
            mode="json"
        ),
    )
    assert response.status_code == 200, response.text
    updated = PromptRead.model_validate(response.json())
    assert updated.versions[-1].codes == [local_claim]

    response = client.get(f"/code/{claim.id}")
    assert response.status_code == 200, response.text
    assert (response.json()["name"], response.json()["description"]) == (
        "Claim",
        CLAIM_DESCRIPTION,
    )


def test_create_version_validates_the_prompt_for_the_prompt_task(
    client: TestClient,
    prompt_project: PromptProject,
) -> None:
    """A new version follows the rules of the prompt's task (HTTP 400)."""
    prompt = prompt_project["span_prompt"]
    response = client.put(
        f"{PROMPT_URL}/{prompt.id}/version",
        json=PromptVersionCreate(text=TAGGING_PROMPT).model_dump(mode="json"),
    )
    assert response.status_code == 400, response.text
    assert "<output-format:tags> is not supported for this task" in response.text


@pytest.mark.parametrize(
    "prompt_key",
    [
        # The prompt of another project.
        pytest.param("foreign", id="foreign"),
        # A prompt that does not exist.
        pytest.param("unknown", id="unknown"),
    ],
)
def test_create_version_rejects_foreign_or_unknown_prompts(
    client: TestClient,
    prompt_project: PromptProject,
    prompt_key: str,
) -> None:
    """Saving a version requires access to the prompt (HTTP 403 for both)."""
    prompt_id = (
        prompt_project["foreign_prompt"].id if prompt_key == "foreign" else 999999
    )
    response = client.put(
        f"{PROMPT_URL}/{prompt_id}/version",
        json=PromptVersionCreate(text=SPAN_V1_PROMPT).model_dump(mode="json"),
    )
    assert response.status_code == 403, response.text


# ===========================================================================
# READ (GET /prompt/...) TESTS
# ===========================================================================


def test_get_by_project_lists_the_project_prompts_by_name(
    client: TestClient,
    prompt_project: PromptProject,
) -> None:
    """Names sort byte-wise, so ``Span tagging`` precedes the defaults."""
    response = client.get(f"{PROMPT_URL}/project/{prompt_project['project'].id}")
    assert response.status_code == 200, response.text
    prompts = PromptList.validate_python(response.json())
    assert [prompt.name for prompt in prompts] == [
        "Span tagging",
        *DEFAULT_PROMPT_FORMATS,
    ]


def test_get_by_project_rejects_foreign_project(
    client: TestClient,
    prompt_project: PromptProject,
) -> None:
    """Listing requires membership in the project."""
    response = client.get(
        f"{PROMPT_URL}/project/{prompt_project['foreign_project'].id}"
    )
    assert response.status_code == 403, response.text


def test_get_returns_a_prompt_and_a_version(
    client: TestClient,
    prompt_project: PromptProject,
) -> None:
    """A prompt and each of its versions can be read by id, with all selections."""
    project = prompt_project
    prompt = project["span_prompt"]
    prompt_response = client.get(f"{PROMPT_URL}/{prompt.id}")
    assert prompt_response.status_code == 200, prompt_response.text
    assert PromptRead.model_validate(prompt_response.json()) == prompt

    version = prompt.versions[1]
    version_response = client.get(f"{PROMPT_URL}/version/{version.id}")
    assert version_response.status_code == 200, version_response.text
    read = PromptVersionRead.model_validate(version_response.json())
    assert read == version
    assert read.codes == [
        prompt_code(project["person_code"]),
        prompt_code(project["claim_code"]),
    ]
    assert read.examples == [project["alice_example"]]


def test_get_rejects_foreign_prompts_and_versions(
    client: TestClient,
    prompt_project: PromptProject,
) -> None:
    """Prompts and versions of other projects cannot be read."""
    prompt = prompt_project["foreign_prompt"]
    assert client.get(f"{PROMPT_URL}/{prompt.id}").status_code == 403
    version_id = prompt.versions[0].id
    assert client.get(f"{PROMPT_URL}/version/{version_id}").status_code == 403


# ===========================================================================
# UPDATE (PATCH /prompt/{id}) TESTS
# ===========================================================================


@pytest.mark.parametrize(
    "update,expected_name,expected_archived",
    [
        # Renaming keeps the versions.
        pytest.param(PromptUpdate(name="Renamed"), "Renamed", False, id="rename"),
        # Archiving keeps the prompt and its versions for the runs that used them.
        pytest.param(
            PromptUpdate(is_archived=True),
            "Span tagging",
            True,
            id="archive",
        ),
    ],
)
def test_update_renames_or_archives_without_creating_a_version(
    client: TestClient,
    prompt_project: PromptProject,
    update: PromptUpdate,
    expected_name: str,
    expected_archived: bool,
) -> None:
    """Renaming and archiving change the prompt only, never its versions."""
    prompt = prompt_project["span_prompt"]
    response = client.patch(
        f"{PROMPT_URL}/{prompt.id}",
        json=update.model_dump(mode="json", exclude_unset=True),
    )
    assert response.status_code == 200, response.text
    updated = PromptRead.model_validate(response.json())
    assert updated.name == expected_name
    assert updated.is_archived == expected_archived
    assert updated.versions == prompt.versions


@pytest.mark.parametrize(
    "body",
    [
        # An update must change something.
        pytest.param({}, id="empty"),
        # The name is not nullable.
        pytest.param({"name": None}, id="null-name"),
        # The archive flag is not nullable.
        pytest.param({"is_archived": None}, id="null-archived"),
        # Names must not be empty.
        pytest.param({"name": ""}, id="empty-name"),
    ],
)
def test_update_rejects_invalid_bodies(
    client: TestClient,
    prompt_project: PromptProject,
    body: dict[str, object],
) -> None:
    """Invalid updates return HTTP 422."""
    prompt = prompt_project["span_prompt"]
    response = client.patch(f"{PROMPT_URL}/{prompt.id}", json=body)
    assert response.status_code == 422, response.text


def test_update_rejects_foreign_prompt(
    client: TestClient,
    prompt_project: PromptProject,
) -> None:
    """Updating requires access to the prompt's project."""
    prompt = prompt_project["foreign_prompt"]
    response = client.patch(f"{PROMPT_URL}/{prompt.id}", json={"name": "Taken over"})
    assert response.status_code == 403, response.text


# ===========================================================================
# CREATE EXAMPLES (POST /prompt/examples) TESTS
# ===========================================================================


def _post_examples(
    client: TestClient,
    project: PromptProject,
    kind: PromptExampleKind,
    annotation_ids: list[int],
    project_key: str = "project",
):
    return client.post(
        f"{PROMPT_URL}/examples",
        json=PromptExamplesCreate(
            project_id=project[project_key].id,  # type: ignore[literal-required]
            kind=kind,
            annotation_ids=annotation_ids,
        ).model_dump(mode="json"),
    )


# --- A. span examples ---------------------------------------------------------------
# A span example is the sentence around an annotation with all spans its annotator
# annotated in it; annotations of the same text are merged.


def test_create_span_example_shows_all_spans_of_the_annotator_in_the_sentence(
    client: TestClient,
    prompt_project: PromptProject,
) -> None:
    """The Alice example also shows ``the report`` but not the assistant's ``wrote``."""
    project = prompt_project
    response = _post_examples(
        client, project, PromptExampleKind.SPAN, [project["alice_annotation"].id]
    )
    assert response.status_code == 200, response.text
    assert PromptExampleList.validate_python(response.json()) == [
        SpanPromptExample(
            kind=PromptExampleKind.SPAN,
            sdoc_id=project["sdoc"].id,
            source_annotation_ids=[project["alice_annotation"].id],
            text=EXAMPLE_SENTENCES[0],
            spans=[
                PromptExampleSpan(code_id=project["person_code"].id, begin=0, end=5),
                PromptExampleSpan(code_id=project["claim_code"].id, begin=12, end=22),
            ],
        )
    ]


def test_create_span_examples_merges_annotations_of_the_same_sentence(
    client: TestClient,
    prompt_project: PromptProject,
) -> None:
    """``Alice`` and ``the report`` (both S0) become one example; ``Bob`` (S2) another."""
    project = prompt_project
    response = _post_examples(
        client,
        project,
        PromptExampleKind.SPAN,
        [
            project["alice_annotation"].id,
            project["report_annotation"].id,
            project["bob_annotation"].id,
        ],
    )
    assert response.status_code == 200, response.text
    examples = PromptExampleList.validate_python(response.json())

    assert examples == [
        project["alice_example"].model_copy(
            update={
                "source_annotation_ids": [
                    project["alice_annotation"].id,
                    project["report_annotation"].id,
                ]
            }
        ),
        SpanPromptExample(
            kind=PromptExampleKind.SPAN,
            sdoc_id=project["sdoc"].id,
            source_annotation_ids=[project["bob_annotation"].id],
            text=EXAMPLE_SENTENCES[2],
            spans=[
                PromptExampleSpan(code_id=project["person_code"].id, begin=0, end=3)
            ],
        ),
    ]


def test_create_span_example_of_another_annotator_shows_only_its_spans(
    client: TestClient,
    prompt_project: PromptProject,
) -> None:
    """The assistant's ``wrote`` example shows its own span only."""
    project = prompt_project
    response = _post_examples(
        client, project, PromptExampleKind.SPAN, [project["assistant_annotation"].id]
    )
    assert response.status_code == 200, response.text
    [example] = PromptExampleList.validate_python(response.json())
    assert isinstance(example, SpanPromptExample)
    assert example.text == EXAMPLE_SENTENCES[0]
    assert example.spans == [
        PromptExampleSpan(code_id=project["claim_code"].id, begin=6, end=11)
    ]


# --- B. sentence examples -----------------------------------------------------------


def test_create_sentence_examples_copy_the_text_of_the_annotated_sentences(
    client: TestClient,
    prompt_project: PromptProject,
) -> None:
    """A sentence example is the text of its sentences, in the order of the ids."""
    project = prompt_project
    response = _post_examples(
        client,
        project,
        PromptExampleKind.SENTENCE,
        [
            project["claim_sentence_annotation"].id,
            project["person_sentence_annotation"].id,
        ],
    )
    assert response.status_code == 200, response.text
    assert PromptExampleList.validate_python(response.json()) == [
        SentencePromptExample(
            kind=PromptExampleKind.SENTENCE,
            code_id=project["claim_code"].id,
            sdoc_id=project["sdoc"].id,
            source_annotation_ids=[project["claim_sentence_annotation"].id],
            text=f"{EXAMPLE_SENTENCES[1]} {EXAMPLE_SENTENCES[2]}",
        ),
        SentencePromptExample(
            kind=PromptExampleKind.SENTENCE,
            code_id=project["person_code"].id,
            sdoc_id=project["sdoc"].id,
            source_annotation_ids=[project["person_sentence_annotation"].id],
            text=EXAMPLE_SENTENCES[0],
        ),
    ]


# --- C. invalid requests ------------------------------------------------------------


def test_create_examples_rejects_annotations_of_another_project(
    client: TestClient,
    prompt_project: PromptProject,
) -> None:
    """Examples are created from the project's own annotations only (HTTP 400)."""
    project = prompt_project
    response = _post_examples(
        client,
        project,
        PromptExampleKind.SPAN,
        [project["foreign_span_annotation"].id],
    )
    assert response.status_code == 400, response.text
    assert "do not belong to project" in response.text


def test_create_examples_rejects_foreign_project(
    client: TestClient,
    prompt_project: PromptProject,
) -> None:
    """Creating examples requires membership in the project."""
    project = prompt_project
    response = _post_examples(
        client,
        project,
        PromptExampleKind.SPAN,
        [project["foreign_span_annotation"].id],
        project_key="foreign_project",
    )
    assert response.status_code == 403, response.text


def test_create_examples_rejects_an_empty_selection(
    client: TestClient,
    prompt_project: PromptProject,
) -> None:
    """At least one annotation is required (HTTP 422)."""
    response = client.post(
        f"{PROMPT_URL}/examples",
        json={
            "project_id": prompt_project["project"].id,
            "kind": PromptExampleKind.SPAN.value,
            "annotation_ids": [],
        },
    )
    assert response.status_code == 422, response.text
    assert "annotation_ids" in response.text


# ===========================================================================
# PREVIEW (POST /prompt/preview) TESTS
# ===========================================================================


def _inline_prompt(unit: DocumentUnit) -> str:
    return f"Codes: <code_names>\n\n<output-format:inline>\n\nText:\n<document:{unit.value}>"


def _draft(
    task_type: TaskType,
    text: str,
    *,
    codes: list[PromptCode] | None = None,
    examples: list[PromptExample] | None = None,
    settings: PromptSettings | None = None,
    language: PromptLanguage = PromptLanguage.EN,
) -> PromptSnapshot:
    return PromptSnapshot(
        task_type=task_type,
        language=language,
        text=text,
        settings=settings or PromptSettings(),
        codes=codes or [],
        examples=examples or [],
    )


def _request(
    project: PromptProject,
    *,
    draft: PromptSnapshot | None = None,
    version_id: int | None = None,
    sdoc_id: int | None = None,
    message_index: int = 0,
) -> PromptPreviewRequest:
    return PromptPreviewRequest(
        project_id=project["project"].id,
        draft=draft,
        prompt_version_id=version_id,
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


# --- A. prompts without a document --------------------------------------------------


def test_preview_of_a_draft_without_document_keeps_the_document_block(
    client: TestClient,
    prompt_project: PromptProject,
) -> None:
    """The blocks are filled, ``<document:whole>`` stays; there are no messages."""
    project = prompt_project
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
    assert preview.text == (
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
    prompt_project: PromptProject,
) -> None:
    """An empty ``<examples>`` block leaves no gap of blank lines."""
    project = prompt_project
    draft = _draft(
        TaskType.ANNOTATION,
        "Codes: <code_names>\n\n<examples>\n\nText:\n<document:whole>\n"
        "<output-format:inline>",
        codes=[prompt_code(project["claim_code"])],
    )
    preview = _preview(client, _request(project, draft=draft))
    assert preview.text.startswith("Codes: CLAIM\n\nText:\n<document:whole>\n")
    assert "\n\n\n" not in preview.text
    assert _blocks(preview)["<examples>"] == ""
    assert not preview.is_fewshot


def test_preview_lists_unknown_placeholders(
    client: TestClient,
    prompt_project: PromptProject,
) -> None:
    """Placeholder-like tags no block fills are listed once and kept verbatim."""
    project = prompt_project
    draft = _draft(
        TaskType.ANNOTATION,
        "<code> <codes>\n<output-format:inline>\n<sentence> <code>\n<document:whole>",
        codes=[prompt_code(project["claim_code"])],
    )
    preview = _preview(client, _request(project, draft=draft))
    assert preview.unknown_placeholders == ["<code>", "<sentence>"]
    assert preview.text.startswith(f"<code> CLAIM: {CLAIM_DESCRIPTION}\n")
    assert "\n<sentence> <code>\n<document:whole>" in preview.text


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
    prompt_project: PromptProject,
    unit: DocumentUnit,
    settings: PromptSettings,
    message_index: int,
    expected_num_messages: int,
    expected_text: str,
) -> None:
    """The document block is replaced with the text of the requested message."""
    project = prompt_project
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
    assert preview.text == (f"Codes: CLAIM\n\n{instructions}\n\nText:\n{expected_text}")


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
    prompt_project: PromptProject,
    unit: DocumentUnit,
    settings: PromptSettings,
    message_index: int,
    expected_num_messages: int,
    expected_text: str,
) -> None:
    """The sentence format shows ``n: sentence`` lines with document-wide numbers."""
    project = prompt_project
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
    assert preview.text.endswith(f"\nDocument:\n{expected_text}")


def test_preview_renders_a_stored_version(
    client: TestClient,
    prompt_project: PromptProject,
) -> None:
    """Version 2 of ``Span tagging`` splits by sentences and shows its example."""
    project = prompt_project
    version = project["span_prompt"].versions[1]
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
    assert preview.text.startswith(
        f"Tag these codes: PERSON, CLAIM\n"
        f"PERSON: {project['person_code'].description}\nCLAIM: {CLAIM_DESCRIPTION}"
    )
    assert preview.text.endswith(f"\n\nText:\n{EXAMPLE_SENTENCES[2]}")


# --- C. few-shot examples -----------------------------------------------------------
# Examples only show spans of the selected codes; an example without such spans is
# dropped, and a prompt without rendered examples is zero-shot.


def test_preview_inline_examples_tag_all_selected_spans(
    client: TestClient,
    prompt_project: PromptProject,
) -> None:
    """Every selected span of an example is tagged in its output."""
    project = prompt_project
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
    prompt_project: PromptProject,
) -> None:
    """With Claim only, PERSON spans are not tagged and the Bob example is dropped."""
    project = prompt_project
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
    prompt_project: PromptProject,
) -> None:
    """The Bob example has no Claim span, so nothing is shown and the run is zero-shot."""
    project = prompt_project
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
    prompt_project: PromptProject,
    language: PromptLanguage,
    expected_examples: str,
) -> None:
    """Each selected span becomes a passage with five characters of context."""
    project = prompt_project
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
    prompt_project: PromptProject,
) -> None:
    """Sentence examples are listed under the name of their code."""
    project = prompt_project
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
    prompt_project: PromptProject,
) -> None:
    """The example document has three sentence messages, so index 3 is HTTP 400."""
    project = prompt_project
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
    prompt_project: PromptProject,
) -> None:
    """Only documents of the request's project can be rendered (HTTP 400)."""
    project = prompt_project
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
    prompt_project: PromptProject,
) -> None:
    """A version of the unauthorized project cannot be rendered (HTTP 400)."""
    project = prompt_project
    version_id = project["foreign_prompt"].versions[0].id
    response = _post_preview(client, _request(project, version_id=version_id))
    assert response.status_code == 400, response.text
    assert f"Prompt version {version_id} cannot be used" in response.text


def test_preview_rejects_an_invalid_draft(
    client: TestClient,
    prompt_project: PromptProject,
) -> None:
    """Drafts are validated like saved prompts (HTTP 400)."""
    project = prompt_project
    draft = _draft(TaskType.ANNOTATION, "<codes>\n<output-format:inline>")
    response = _post_preview(client, _request(project, draft=draft))
    assert response.status_code == 400, response.text
    assert "must contain exactly one document block" in response.text


def test_preview_rejects_foreign_project(
    client: TestClient,
    prompt_project: PromptProject,
) -> None:
    """Previewing requires membership in the request's project."""
    project = prompt_project
    request = _request(
        project, version_id=project["foreign_prompt"].versions[0].id
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
    prompt_project: PromptProject,
    has_version: bool,
    has_draft: bool,
) -> None:
    """Exactly one of version id and draft must be set (HTTP 422)."""
    project = prompt_project
    draft = _draft(
        TaskType.ANNOTATION,
        _inline_prompt(DocumentUnit.WHOLE),
        codes=[prompt_code(project["claim_code"])],
    )
    body = {
        "project_id": project["project"].id,
        "prompt_version_id": (
            project["span_prompt"].versions[0].id if has_version else None
        ),
        "draft": draft.model_dump(mode="json") if has_draft else None,
    }
    response = client.post(PREVIEW_URL, json=body)
    assert response.status_code == 422, response.text
    assert "Exactly one of prompt_version_id and draft" in response.text


def test_preview_rejects_a_negative_message_index(
    client: TestClient,
    prompt_project: PromptProject,
) -> None:
    """Message indices start at 0 (HTTP 422)."""
    project = prompt_project
    body = {
        "project_id": project["project"].id,
        "prompt_version_id": project["span_prompt"].versions[0].id,
        "message_index": -1,
    }
    response = client.post(PREVIEW_URL, json=body)
    assert response.status_code == 422, response.text
    assert "message_index" in response.text
