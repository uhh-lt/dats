from fastapi.testclient import TestClient

from common.meta_type_enum import MetaType
from core.prompt_template.prompt_template_dto import (
    PromptCode,
    PromptMetadataField,
    PromptSettings,
    PromptTag,
    PromptTemplateContent,
    PromptTemplateRefresh,
)

from .conftest import (
    CLAIM_DESCRIPTION,
    SPAN_V2_PROMPT,
    PromptTemplateProject,
    prompt_code,
)

PROMPT_TEMPLATE_URL = "/prompt_template"


# ===========================================================================
# REFRESH (POST /prompt_template/refresh) TESTS
# ===========================================================================


def test_refresh_replaces_the_selections_with_the_current_project_state(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """Stale snapshots get current names, deleted data is dropped.

    Claim was snapshotted as ``Old claim``, OBSOLETE and the ``long`` annotation
    were deleted. Examples are created again from their annotations, so the stale
    Alice example becomes ``alice_example`` again. Prompt and settings are kept.
    """
    project = prompt_template_project
    field = project["author_field"]
    stale_alice = project["alice_example"].model_copy(
        update={"text": "Stale text.", "spans": []}
    )
    deleted_example = project["bob_example"].model_copy(
        update={"source_annotation_ids": [project["deleted_span_annotation_id"]]}
    )
    stale_sentence = project["sentence_example"].model_copy(update={"text": "Stale."})
    settings = PromptSettings(context_before_chars=10, context_after_chars=20)
    request = PromptTemplateRefresh(
        project_id=project["project"].id,
        prompt=SPAN_V2_PROMPT,
        settings=settings,
        codes=[
            PromptCode(
                code_id=project["claim_code"].id, name="Old claim", description="old"
            ),
            PromptCode(
                code_id=project["deleted_code_id"], name="OBSOLETE", description=""
            ),
            prompt_code(project["person_code"]),
        ],
        examples=[stale_alice, deleted_example, stale_sentence],
        tags=[PromptTag(tag_id=project["report_tag"].id, name="Old", description="")],
        metadata_fields=[
            PromptMetadataField(
                project_metadata_id=field.id,
                key="old_key",
                description="",
                metatype=MetaType.NUMBER,
            )
        ],
    )
    response = client.post(
        f"{PROMPT_TEMPLATE_URL}/refresh", json=request.model_dump(mode="json")
    )
    assert response.status_code == 200, response.text
    refreshed = PromptTemplateContent.model_validate(response.json())

    assert refreshed == PromptTemplateContent(
        prompt=SPAN_V2_PROMPT,
        settings=settings,
        codes=[
            PromptCode(
                code_id=project["claim_code"].id,
                name="Claim",
                description=CLAIM_DESCRIPTION,
            ),
            prompt_code(project["person_code"]),
        ],
        examples=[project["alice_example"], project["sentence_example"]],
        tags=[
            PromptTag(
                tag_id=project["report_tag"].id,
                name="Report",
                description="Documents about reports.",
            )
        ],
        metadata_fields=[
            PromptMetadataField(
                project_metadata_id=field.id,
                key="author",
                description="The author of the document.",
                metatype=MetaType.STRING,
            )
        ],
    )


def test_refresh_drops_selections_of_another_project(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """Codes and tags that are not in the project count as deleted."""
    project = prompt_template_project
    foreign_tag = project["foreign_tag"]
    request = PromptTemplateRefresh(
        project_id=project["project"].id,
        prompt=SPAN_V2_PROMPT,
        codes=[prompt_code(project["foreign_code"])],
        tags=[PromptTag(tag_id=foreign_tag.id, name=foreign_tag.name, description="")],
    )
    response = client.post(
        f"{PROMPT_TEMPLATE_URL}/refresh", json=request.model_dump(mode="json")
    )
    assert response.status_code == 200, response.text
    refreshed = PromptTemplateContent.model_validate(response.json())
    assert refreshed == PromptTemplateContent(prompt=SPAN_V2_PROMPT)


def test_refresh_rejects_foreign_project(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """Refreshing requires membership in the project."""
    request = PromptTemplateRefresh(
        project_id=prompt_template_project["foreign_project"].id,
        prompt=SPAN_V2_PROMPT,
    )
    response = client.post(
        f"{PROMPT_TEMPLATE_URL}/refresh", json=request.model_dump(mode="json")
    )
    assert response.status_code == 403, response.text
