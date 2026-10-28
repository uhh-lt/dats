import pytest
from fastapi.testclient import TestClient
from pydantic import TypeAdapter

from common.meta_type_enum import MetaType
from core.prompt_template.prompt_template_defaults import DEFAULT_PROMPTS
from core.prompt_template.prompt_template_dto import (
    PromptMetadataField,
    PromptSettings,
    PromptTag,
    PromptTaskInfo,
    PromptTemplateContent,
    PromptTemplateCreate,
    PromptTemplateRead,
    PromptTemplateUpdate,
    PromptTemplateVersionCreate,
    PromptTemplateVersionRead,
)
from core.prompt_template.prompt_template_enum import (
    DocumentUnit,
    OutputFormat,
    PromptBlock,
    PromptExampleKind,
    PromptLanguage,
    TaskType,
)
from core.prompt_template.prompt_template_specs import OUTPUT_FORMAT_SPECS
from core.user.user_crud import SYSTEM_USER_ID
from core.user.user_orm import UserORM

from .conftest import (
    SPAN_V1_PROMPT,
    SPAN_V2_PROMPT,
    PromptTemplateProject,
    prompt_code,
)

PROMPT_TEMPLATE_URL = "/prompt_template"
PromptTemplateList = TypeAdapter(list[PromptTemplateRead])

# name of every default template -> (output format, language)
DEFAULT_TEMPLATES: dict[str, tuple[OutputFormat, PromptLanguage]] = {
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


def _put_template(client: TestClient, create_dto: PromptTemplateCreate):
    return client.put(PROMPT_TEMPLATE_URL, json=create_dto.model_dump(mode="json"))


# ===========================================================================
# DEFAULT TEMPLATES (project creation) TESTS
# ===========================================================================


def test_new_projects_get_one_default_template_per_output_format_and_language(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """Every default has version 1 by the system user with the default prompt.

    The defaults select nothing (a new project has no codes, tags or fields).
    """
    response = client.get(
        f"{PROMPT_TEMPLATE_URL}/project/{prompt_template_project['project'].id}"
    )
    assert response.status_code == 200, response.text
    defaults = [
        template
        for template in PromptTemplateList.validate_python(response.json())
        if template.name.startswith("default-")
    ]

    assert [template.name for template in defaults] == list(DEFAULT_TEMPLATES)
    for template in defaults:
        output_format, language = DEFAULT_TEMPLATES[template.name]
        assert template.task_type == OUTPUT_FORMAT_SPECS[output_format].task_type
        assert template.language == language
        assert not template.is_archived
        assert [version.version for version in template.versions] == [1]
        version = template.versions[0]
        assert version.user_id == SYSTEM_USER_ID
        assert version.prompt == DEFAULT_PROMPTS[output_format][language]
        assert version.settings == PromptSettings()
        assert version.codes == []
        assert version.examples == []
        assert version.tags == []
        assert version.metadata_fields == []


# ===========================================================================
# TASK INFO (GET /prompt_template/task_info) TESTS
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
        f"{PROMPT_TEMPLATE_URL}/task_info", params={"task_type": task_type.value}
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
    response = client.get(
        f"{PROMPT_TEMPLATE_URL}/task_info", params={"task_type": "UNKNOWN"}
    )
    assert response.status_code == 422, response.text


# ===========================================================================
# DEFAULT PROMPT (GET /prompt_template/default) TESTS
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
        f"{PROMPT_TEMPLATE_URL}/default",
        params={"output_format": output_format.value, "language": language.value},
    )
    assert response.status_code == 200, response.text
    default = PromptTemplateContent.model_validate(response.json())

    assert default == PromptTemplateContent(
        prompt=DEFAULT_PROMPTS[output_format][language]
    )
    assert f"<output-format:{output_format.value}>" in default.prompt
    unit = OUTPUT_FORMAT_SPECS[output_format].default_document_unit
    assert f"<document:{unit.value}>" in default.prompt


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
    response = client.get(f"{PROMPT_TEMPLATE_URL}/default", params=params)
    assert response.status_code == 422, response.text


# ===========================================================================
# CREATE PROMPT TEMPLATE (PUT /prompt_template) TESTS
# ===========================================================================


# --- A. valid templates -----------------------------------------------------------


def test_create_prompt_template_stores_the_content_as_version_one(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
    test_user: UserORM,
) -> None:
    """A new template has exactly one version (number 1) with the whole content."""
    project = prompt_template_project
    create_dto = PromptTemplateCreate(
        project_id=project["project"].id,
        name="New template",
        task_type=TaskType.ANNOTATION,
        language=PromptLanguage.DE,
        prompt=SPAN_V2_PROMPT,
        settings=PromptSettings(chunk_size_tokens=100, chunk_overlap_tokens=10),
        codes=[prompt_code(project["claim_code"])],
        examples=[project["alice_example"]],
    )
    response = _put_template(client, create_dto)
    assert response.status_code == 200, response.text
    template = PromptTemplateRead.model_validate(response.json())

    assert template.name == "New template"
    assert template.project_id == project["project"].id
    assert template.task_type == TaskType.ANNOTATION
    assert template.language == PromptLanguage.DE
    assert not template.is_archived
    assert [version.version for version in template.versions] == [1]
    version = template.versions[0]
    assert version.prompt == SPAN_V2_PROMPT
    assert version.settings == create_dto.settings
    assert version.codes == create_dto.codes
    assert version.examples == [project["alice_example"]]
    assert version.tags == []
    assert version.metadata_fields == []
    assert version.user_id == test_user.id
    assert version.prompt_template_id == template.id


@pytest.mark.parametrize(
    "task_type,prompt,selection",
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
        # Templates may be saved before they select anything.
        pytest.param(TaskType.TAGGING, TAGGING_PROMPT, "none", id="no-selection"),
    ],
)
def test_create_prompt_template_accepts_every_task(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
    task_type: TaskType,
    prompt: str,
    selection: str,
) -> None:
    """Templates of every task can be stored with valid blocks and selections."""
    project = prompt_template_project
    field = project["author_field"]
    create_dto = PromptTemplateCreate(
        project_id=project["project"].id,
        name="New template",
        task_type=task_type,
        language=PromptLanguage.EN,
        prompt=prompt,
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
    response = _put_template(client, create_dto)
    assert response.status_code == 200, response.text
    template = PromptTemplateRead.model_validate(response.json())
    assert template.task_type == task_type
    version = template.versions[0]
    assert (version.codes, version.tags, version.metadata_fields) == (
        create_dto.codes,
        create_dto.tags,
        create_dto.metadata_fields,
    )


# --- B. invalid templates (HTTP 400 contracts) ---------------------------------------
# Each case breaks exactly one block or selection rule of its task.


def _selection(project: PromptTemplateProject, key: str) -> dict[str, object]:
    """The selections of an invalid-template case, by key."""
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
    "task_type,prompt,selection,expected_fragment",
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
        # Codes must belong to the template's project.
        pytest.param(
            TaskType.ANNOTATION,
            SPAN_V1_PROMPT,
            "foreign-code",
            "which do not belong to project",
            id="foreign-code",
        ),
        # Tags must belong to the template's project.
        pytest.param(
            TaskType.TAGGING,
            TAGGING_PROMPT,
            "foreign-tag",
            "which do not belong to project",
            id="foreign-tag",
        ),
        # The spans of examples must show codes of the template's project.
        pytest.param(
            TaskType.ANNOTATION,
            SPAN_V2_PROMPT,
            "foreign-example",
            "which do not belong to project",
            id="foreign-example-code",
        ),
    ],
)
def test_create_prompt_template_rejects_invalid_blocks_and_selections(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
    task_type: TaskType,
    prompt: str,
    selection: str,
    expected_fragment: str,
) -> None:
    """Block and selection rule violations return HTTP 400 with the broken rule."""
    project = prompt_template_project
    create_dto = PromptTemplateCreate.model_validate(
        {
            "project_id": project["project"].id,
            "name": "New template",
            "task_type": task_type,
            "language": PromptLanguage.EN,
            "prompt": prompt,
            **_selection(project, selection),
        }
    )
    response = _put_template(client, create_dto)
    assert response.status_code == 400, response.text
    assert expected_fragment in response.text


def test_create_prompt_template_rejects_a_duplicate_name(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """Template names are unique per project (HTTP 409)."""
    response = _put_template(
        client,
        PromptTemplateCreate(
            project_id=prompt_template_project["project"].id,
            name="Span tagging",
            task_type=TaskType.ANNOTATION,
            language=PromptLanguage.EN,
            prompt=SPAN_V1_PROMPT,
        ),
    )
    assert response.status_code == 409, response.text


def test_create_prompt_template_rejects_foreign_project(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """Creating requires membership in the template's project."""
    response = _put_template(
        client,
        PromptTemplateCreate(
            project_id=prompt_template_project["foreign_project"].id,
            name="New template",
            task_type=TaskType.ANNOTATION,
            language=PromptLanguage.EN,
            prompt=SPAN_V1_PROMPT,
        ),
    )
    assert response.status_code == 403, response.text


@pytest.mark.parametrize(
    "field",
    [
        # A template is written in one language.
        pytest.param("language", id="language"),
        # A template is made for one task.
        pytest.param("task_type", id="task-type"),
        # A template has a prompt.
        pytest.param("prompt", id="prompt"),
    ],
)
def test_create_prompt_template_requires_language_task_and_prompt(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
    field: str,
) -> None:
    """Missing required fields return HTTP 422."""
    body = PromptTemplateCreate(
        project_id=prompt_template_project["project"].id,
        name="New template",
        task_type=TaskType.ANNOTATION,
        language=PromptLanguage.EN,
        prompt=SPAN_V1_PROMPT,
    ).model_dump(mode="json")
    del body[field]
    response = client.put(PROMPT_TEMPLATE_URL, json=body)
    assert response.status_code == 422, response.text
    assert field in response.text


def test_create_prompt_template_rejects_a_chunk_overlap_not_below_the_size(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """The chunk overlap must be smaller than the chunk size (HTTP 422)."""
    body = PromptTemplateCreate(
        project_id=prompt_template_project["project"].id,
        name="New template",
        task_type=TaskType.ANNOTATION,
        language=PromptLanguage.EN,
        prompt=CONTEXT_PROMPT,
    ).model_dump(mode="json")
    body["settings"] = {"chunk_size_tokens": 10, "chunk_overlap_tokens": 10}
    response = client.put(PROMPT_TEMPLATE_URL, json=body)
    assert response.status_code == 422, response.text
    assert "The chunk overlap must be smaller than the chunk size" in response.text


# ===========================================================================
# CREATE VERSION (PUT /prompt_template/{id}/version) TESTS
# ===========================================================================


def test_create_version_appends_the_next_version_and_keeps_older_ones(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
    test_user: UserORM,
) -> None:
    """Saving creates version 3; versions 1 and 2 stay unchanged."""
    project = prompt_template_project
    template = project["span_template"]
    new_version = PromptTemplateVersionCreate(
        prompt=CONTEXT_PROMPT, codes=[prompt_code(project["claim_code"])]
    )
    response = client.put(
        f"{PROMPT_TEMPLATE_URL}/{template.id}/version",
        json=new_version.model_dump(mode="json"),
    )
    assert response.status_code == 200, response.text
    updated = PromptTemplateRead.model_validate(response.json())

    assert [version.version for version in updated.versions] == [1, 2, 3]
    assert updated.versions[:2] == template.versions
    assert [version.prompt for version in updated.versions] == [
        SPAN_V1_PROMPT,
        SPAN_V2_PROMPT,
        CONTEXT_PROMPT,
    ]
    assert updated.versions[2].codes == new_version.codes
    assert updated.versions[2].user_id == test_user.id


def test_create_version_validates_the_prompt_for_the_template_task(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """A new version follows the rules of the template's task (HTTP 400)."""
    template = prompt_template_project["span_template"]
    response = client.put(
        f"{PROMPT_TEMPLATE_URL}/{template.id}/version",
        json=PromptTemplateVersionCreate(prompt=TAGGING_PROMPT).model_dump(mode="json"),
    )
    assert response.status_code == 400, response.text
    assert "<output-format:tags> is not supported for this task" in response.text


@pytest.mark.parametrize(
    "template_key",
    [
        # The template of another project.
        pytest.param("foreign", id="foreign"),
        # A template that does not exist.
        pytest.param("unknown", id="unknown"),
    ],
)
def test_create_version_rejects_foreign_or_unknown_templates(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
    template_key: str,
) -> None:
    """Saving a version requires access to the template (HTTP 403 for both)."""
    template_id = (
        prompt_template_project["foreign_template"].id
        if template_key == "foreign"
        else 999999
    )
    response = client.put(
        f"{PROMPT_TEMPLATE_URL}/{template_id}/version",
        json=PromptTemplateVersionCreate(prompt=SPAN_V1_PROMPT).model_dump(mode="json"),
    )
    assert response.status_code == 403, response.text


# ===========================================================================
# READ (GET /prompt_template/...) TESTS
# ===========================================================================


def test_get_by_project_lists_the_project_templates_by_name(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """Names sort byte-wise, so ``Span tagging`` precedes the defaults."""
    response = client.get(
        f"{PROMPT_TEMPLATE_URL}/project/{prompt_template_project['project'].id}"
    )
    assert response.status_code == 200, response.text
    templates = PromptTemplateList.validate_python(response.json())
    assert [template.name for template in templates] == [
        "Span tagging",
        *DEFAULT_TEMPLATES,
    ]


def test_get_by_project_rejects_foreign_project(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """Listing requires membership in the project."""
    response = client.get(
        f"{PROMPT_TEMPLATE_URL}/project/{prompt_template_project['foreign_project'].id}"
    )
    assert response.status_code == 403, response.text


def test_get_returns_a_template_and_a_version(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """A template and each of its versions can be read by id, with all selections."""
    project = prompt_template_project
    template = project["span_template"]
    template_response = client.get(f"{PROMPT_TEMPLATE_URL}/{template.id}")
    assert template_response.status_code == 200, template_response.text
    assert PromptTemplateRead.model_validate(template_response.json()) == template

    version = template.versions[1]
    version_response = client.get(f"{PROMPT_TEMPLATE_URL}/version/{version.id}")
    assert version_response.status_code == 200, version_response.text
    read = PromptTemplateVersionRead.model_validate(version_response.json())
    assert read == version
    assert read.codes == [
        prompt_code(project["person_code"]),
        prompt_code(project["claim_code"]),
    ]
    assert read.examples == [project["alice_example"]]


def test_get_rejects_foreign_templates_and_versions(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """Templates and versions of other projects cannot be read."""
    template = prompt_template_project["foreign_template"]
    assert client.get(f"{PROMPT_TEMPLATE_URL}/{template.id}").status_code == 403
    version_id = template.versions[0].id
    assert client.get(f"{PROMPT_TEMPLATE_URL}/version/{version_id}").status_code == 403


# ===========================================================================
# UPDATE (PATCH /prompt_template/{id}) TESTS
# ===========================================================================


@pytest.mark.parametrize(
    "update,expected_name,expected_archived",
    [
        # Renaming keeps the versions.
        pytest.param(
            PromptTemplateUpdate(name="Renamed"), "Renamed", False, id="rename"
        ),
        # Archiving keeps the template and its versions for the runs that used them.
        pytest.param(
            PromptTemplateUpdate(is_archived=True),
            "Span tagging",
            True,
            id="archive",
        ),
    ],
)
def test_update_renames_or_archives_without_creating_a_version(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
    update: PromptTemplateUpdate,
    expected_name: str,
    expected_archived: bool,
) -> None:
    """Renaming and archiving change the template only, never its versions."""
    template = prompt_template_project["span_template"]
    response = client.patch(
        f"{PROMPT_TEMPLATE_URL}/{template.id}",
        json=update.model_dump(mode="json", exclude_unset=True),
    )
    assert response.status_code == 200, response.text
    updated = PromptTemplateRead.model_validate(response.json())
    assert updated.name == expected_name
    assert updated.is_archived == expected_archived
    assert updated.versions == template.versions


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
    prompt_template_project: PromptTemplateProject,
    body: dict[str, object],
) -> None:
    """Invalid updates return HTTP 422."""
    template = prompt_template_project["span_template"]
    response = client.patch(f"{PROMPT_TEMPLATE_URL}/{template.id}", json=body)
    assert response.status_code == 422, response.text


def test_update_rejects_foreign_template(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """Updating requires access to the template's project."""
    template = prompt_template_project["foreign_template"]
    response = client.patch(
        f"{PROMPT_TEMPLATE_URL}/{template.id}", json={"name": "Taken over"}
    )
    assert response.status_code == 403, response.text
