import pytest
from fastapi.testclient import TestClient

from common.meta_type_enum import MetaType
from core.prompt_template.prompt_template_dto import (
    PromptCode,
    PromptMetadataField,
    PromptSelectionsSync,
    PromptTag,
    PromptTemplateRead,
    PushedPromptSelections,
)

from .conftest import CLAIM_DESCRIPTION, PromptTemplateProject, prompt_code

PROMPT_TEMPLATE_URL = "/prompt_template"


# ===========================================================================
# PUSH (PATCH /prompt_template/push) TESTS
# ===========================================================================


# --- A. successful pushes ------------------------------------------------------


def test_push_replaces_the_project_definitions_with_the_prompt_ones(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """Name (key) and description of the code, tag and metadata field become the
    prompt's; the metatype of a metadata field is not pushed."""
    project = prompt_template_project
    claim = project["claim_code"]
    tag = project["report_tag"]
    field = project["author_field"]
    request = PromptSelectionsSync(
        project_id=project["project"].id,
        codes=[PromptCode(code_id=claim.id, name="Assertion", description="Pushed.")],
        tags=[PromptTag(tag_id=tag.id, name="Paper", description="Pushed tag.")],
        metadata_fields=[
            PromptMetadataField(
                project_metadata_id=field.id,
                key="writer",
                description="Pushed field.",
                metatype=MetaType.NUMBER,
            )
        ],
    )
    response = client.patch(
        f"{PROMPT_TEMPLATE_URL}/push", json=request.model_dump(mode="json")
    )
    assert response.status_code == 200, response.text
    pushed = PushedPromptSelections.model_validate(response.json())

    assert [(c.id, c.name, c.description) for c in pushed.codes] == [
        (claim.id, "Assertion", "Pushed.")
    ]
    assert [(t.id, t.name, t.description) for t in pushed.tags] == [
        (tag.id, "Paper", "Pushed tag.")
    ]
    assert [
        (f.id, f.key, f.description, f.metatype) for f in pushed.metadata_fields
    ] == [(field.id, "writer", "Pushed field.", MetaType.STRING)]

    code = client.get(f"/code/{claim.id}").json()
    assert (code["name"], code["description"]) == ("Assertion", "Pushed.")
    project_tag = client.get(f"/tag/{tag.id}").json()
    assert (project_tag["name"], project_tag["description"]) == ("Paper", "Pushed tag.")
    project_field = client.get(f"/projmeta/{field.id}").json()
    assert (project_field["key"], project_field["description"]) == (
        "writer",
        "Pushed field.",
    )


def test_push_keeps_the_definitions_of_saved_template_versions(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """Template versions that selected a pushed code keep their own definition."""
    project = prompt_template_project
    claim = project["claim_code"]
    template = project["span_template"]
    request = PromptSelectionsSync(
        project_id=project["project"].id,
        codes=[PromptCode(code_id=claim.id, name="Assertion", description="Pushed.")],
    )
    response = client.patch(
        f"{PROMPT_TEMPLATE_URL}/push", json=request.model_dump(mode="json")
    )
    assert response.status_code == 200, response.text

    response = client.get(f"{PROMPT_TEMPLATE_URL}/{template.id}")
    assert response.status_code == 200, response.text
    stored = PromptTemplateRead.model_validate(response.json())
    assert stored.versions[-1].codes == [
        prompt_code(project["person_code"]),
        PromptCode(code_id=claim.id, name="Claim", description=CLAIM_DESCRIPTION),
    ]


def test_push_accepts_the_current_name_of_the_code(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """A code's own name is no conflict: only the description changes."""
    project = prompt_template_project
    claim = project["claim_code"]
    request = PromptSelectionsSync(
        project_id=project["project"].id,
        codes=[PromptCode(code_id=claim.id, name="Claim", description="Shorter.")],
    )
    response = client.patch(
        f"{PROMPT_TEMPLATE_URL}/push", json=request.model_dump(mode="json")
    )
    assert response.status_code == 200, response.text
    pushed = PushedPromptSelections.model_validate(response.json())
    assert [(c.name, c.description) for c in pushed.codes] == [("Claim", "Shorter.")]


# --- B. name conflicts (HTTP 409) ----------------------------------------------
# Names stay unique per project; a push that breaks this changes nothing.


@pytest.mark.parametrize(
    "names",
    [
        # Claim is renamed to the name of the existing code PERSON.
        pytest.param({"claim": "PERSON"}, id="taken-by-another-code"),
        # Claim and PERSON are both pushed with the same new name.
        pytest.param({"claim": "Actor", "person": "Actor"}, id="duplicate-in-push"),
    ],
)
def test_push_rejects_a_name_that_is_already_taken(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
    names: dict[str, str],
) -> None:
    """The message names the taken name, and no code is changed."""
    project = prompt_template_project
    codes = {"claim": project["claim_code"], "person": project["person_code"]}
    request = PromptSelectionsSync(
        project_id=project["project"].id,
        codes=[
            PromptCode(code_id=codes[key].id, name=name, description="Pushed.")
            for key, name in names.items()
        ],
    )
    response = client.patch(
        f"{PROMPT_TEMPLATE_URL}/push", json=request.model_dump(mode="json")
    )
    assert response.status_code == 409, response.text
    taken = names["claim"]
    assert f"the code name '{taken}' is already taken in the project" in response.text

    code = client.get(f"/code/{project['claim_code'].id}").json()
    assert (code["name"], code["description"]) == ("Claim", CLAIM_DESCRIPTION)


# --- C. invalid requests -------------------------------------------------------


def test_push_rejects_selections_outside_the_project(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """A deleted code cannot be pushed (HTTP 400), and the other code of the push
    is not changed either."""
    project = prompt_template_project
    claim = project["claim_code"]
    deleted_id = project["deleted_code_id"]
    request = PromptSelectionsSync(
        project_id=project["project"].id,
        codes=[
            PromptCode(code_id=claim.id, name="Assertion", description=""),
            PromptCode(code_id=deleted_id, name="OBSOLETE", description=""),
        ],
    )
    response = client.patch(
        f"{PROMPT_TEMPLATE_URL}/push", json=request.model_dump(mode="json")
    )
    assert response.status_code == 400, response.text
    assert f"code {deleted_id}" in response.text
    assert client.get(f"/code/{claim.id}").json()["name"] == "Claim"


def test_push_rejects_foreign_project(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """Pushing requires membership in the project (HTTP 403)."""
    project = prompt_template_project
    request = PromptSelectionsSync(
        project_id=project["foreign_project"].id,
        codes=[prompt_code(project["foreign_code"])],
    )
    response = client.patch(
        f"{PROMPT_TEMPLATE_URL}/push", json=request.model_dump(mode="json")
    )
    assert response.status_code == 403, response.text
