import pytest
from fastapi.testclient import TestClient

from common.meta_type_enum import MetaType
from core.prompt_template.prompt_template_dto import (
    PromptCode,
    PromptMetadataField,
    PromptSelections,
    PromptSelectionsSync,
    PromptTag,
)

from .conftest import CLAIM_DESCRIPTION, PromptTemplateProject, prompt_code

PROMPT_TEMPLATE_URL = "/prompt_template"


# ===========================================================================
# PULL (POST /prompt_template/pull) TESTS
# ===========================================================================


def test_pull_returns_the_project_definitions_of_the_selections(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """Locally edited codes, tags and metadata fields get the project's names,
    descriptions and metatypes back, in the order of the request."""
    project = prompt_template_project
    claim = project["claim_code"]
    tag = project["report_tag"]
    field = project["author_field"]
    request = PromptSelectionsSync(
        project_id=project["project"].id,
        codes=[
            PromptCode(code_id=claim.id, name="Assertion", description="local"),
            prompt_code(project["person_code"]),
        ],
        tags=[PromptTag(tag_id=tag.id, name="Paper", description="local")],
        metadata_fields=[
            PromptMetadataField(
                project_metadata_id=field.id,
                key="writer",
                description="local",
                metatype=MetaType.NUMBER,
            )
        ],
    )
    response = client.post(
        f"{PROMPT_TEMPLATE_URL}/pull", json=request.model_dump(mode="json")
    )
    assert response.status_code == 200, response.text

    assert PromptSelections.model_validate(response.json()) == PromptSelections(
        codes=[
            PromptCode(code_id=claim.id, name="Claim", description=CLAIM_DESCRIPTION),
            prompt_code(project["person_code"]),
        ],
        tags=[
            PromptTag(
                tag_id=tag.id, name="Report", description="Documents about reports."
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


def test_pull_does_not_change_the_project(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """Pulling only reads the project: the code keeps its definition."""
    project = prompt_template_project
    claim = project["claim_code"]
    request = PromptSelectionsSync(
        project_id=project["project"].id,
        codes=[PromptCode(code_id=claim.id, name="Assertion", description="local")],
    )
    response = client.post(
        f"{PROMPT_TEMPLATE_URL}/pull", json=request.model_dump(mode="json")
    )
    assert response.status_code == 200, response.text

    code = client.get(f"/code/{claim.id}").json()
    assert (code["name"], code["description"]) == ("Claim", CLAIM_DESCRIPTION)


def test_pull_of_nothing_returns_nothing(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """A pull without selections is valid and returns empty lists."""
    request = PromptSelectionsSync(project_id=prompt_template_project["project"].id)
    response = client.post(
        f"{PROMPT_TEMPLATE_URL}/pull", json=request.model_dump(mode="json")
    )
    assert response.status_code == 200, response.text
    assert PromptSelections.model_validate(response.json()) == PromptSelections()


@pytest.mark.parametrize(
    "selection",
    [
        # A code that was deleted from the project.
        pytest.param("deleted_code", id="deleted-code"),
        # A code of another project.
        pytest.param("foreign_code", id="foreign-code"),
        # A tag of another project.
        pytest.param("foreign_tag", id="foreign-tag"),
    ],
)
def test_pull_rejects_selections_outside_the_project(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
    selection: str,
) -> None:
    """Only selections of the project can be pulled (HTTP 400)."""
    project = prompt_template_project
    project_id = project["project"].id
    match selection:
        case "deleted_code":
            item_id = project["deleted_code_id"]
            request = PromptSelectionsSync(
                project_id=project_id,
                codes=[PromptCode(code_id=item_id, name="OBSOLETE", description="")],
            )
            expected = f"code {item_id}"
        case "foreign_code":
            item_id = project["foreign_code"].id
            request = PromptSelectionsSync(
                project_id=project_id, codes=[prompt_code(project["foreign_code"])]
            )
            expected = f"code {item_id}"
        case _:
            item_id = project["foreign_tag"].id
            request = PromptSelectionsSync(
                project_id=project_id,
                tags=[PromptTag(tag_id=item_id, name="Foreign tag", description="")],
            )
            expected = f"tag {item_id}"
    response = client.post(
        f"{PROMPT_TEMPLATE_URL}/pull", json=request.model_dump(mode="json")
    )
    assert response.status_code == 400, response.text
    assert f"The prompt selects {expected}, which do not belong" in response.text


def test_pull_rejects_foreign_project(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """Pulling requires membership in the project (HTTP 403)."""
    project = prompt_template_project
    request = PromptSelectionsSync(
        project_id=project["foreign_project"].id,
        codes=[prompt_code(project["foreign_code"])],
    )
    response = client.post(
        f"{PROMPT_TEMPLATE_URL}/pull", json=request.model_dump(mode="json")
    )
    assert response.status_code == 403, response.text
