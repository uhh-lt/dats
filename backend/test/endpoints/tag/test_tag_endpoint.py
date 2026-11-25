import pytest
from fastapi.testclient import TestClient

from composite_keys_test_utils import TwoTenants
from core.tag.tag_dto import (
    SdocTagLinks,
    SourceDocumentTagMultiLink,
    TagCreate,
    TagRead,
    TagUpdate,
    TagUpdateBulk,
)


def _tags_url(project_id: int) -> str:
    return f"/projects/{project_id}/tags"


def _links(response_json: dict) -> dict[int, set[int]]:
    """The tag ids per document of an SdocTagLinks response, as sets (the order of
    the tag ids is not deterministic)."""
    links = SdocTagLinks.model_validate(response_json).links
    return {sdoc_id: set(tag_ids) for sdoc_id, tag_ids in links.items()}


# ===========================================================================
# CREATE TAG (PUT /projects/{project_id}/tags) TESTS
# ===========================================================================


def test_create_tag(client: TestClient, test_project):
    """A new tag is created in the project of the path."""
    payload = TagCreate(name="Tag", color="Red", description="Tag Content")

    resp = client.put(
        _tags_url(test_project.id), json=payload.model_dump(exclude_none=True)
    )

    assert resp.status_code == 200, resp.text
    created = TagRead.model_validate(resp.json())
    assert created.project_id == test_project.id
    assert (created.name, created.color, created.description, created.parent_id) == (
        payload.name,
        payload.color,
        payload.description,
        None,
    )


def test_create_tag_persists_when_the_actor_is_the_only_member(system_only_project):
    """Creating a tag in a project whose only member is the actor persists the tag.

    The tag's websocket event has an empty audience (the actor is excluded), which
    must neither fail the request nor roll back its transaction.
    """
    project = system_only_project["project"]
    client = system_only_project["client"]
    payload = TagCreate(name="Tag", color="Red")

    resp = client.put(_tags_url(project.id), json=payload.model_dump(exclude_none=True))

    assert resp.status_code == 200, resp.text
    created = TagRead.model_validate(resp.json())
    resp = client.get(_tags_url(project.id))
    assert resp.status_code == 200, resp.text
    assert [TagRead.model_validate(tag) for tag in resp.json()] == [created]


def test_create_tag_in_a_project_of_no_membership_is_forbidden(client: TestClient):
    """The user is no member of a project that does not exist (403)."""
    payload = TagCreate(name="Tag", color="Red")

    resp = client.put(_tags_url(9999), json=payload.model_dump(exclude_none=True))

    assert resp.status_code == 403, resp.text


def test_create_tag_with_a_parent_of_another_project_is_a_conflict(
    client: TestClient, two_tenants: TwoTenants
):
    """The parent of a new tag is a body reference: a tag of another project is
    rejected by the composite foreign key (409)."""
    own, foreign = two_tenants["own"], two_tenants["foreign"]
    payload = TagCreate(name="New", color="Red", parent_id=foreign["tag"].id)

    resp = client.put(_tags_url(own["project"].id), json=payload.model_dump())

    assert resp.status_code == 409, resp.text


# ===========================================================================
# GET TAGS (GET /projects/{project_id}/tags) TESTS
# ===========================================================================


def test_get_tags_by_project(client: TestClient, project_with_sdoc_and_multiple_tags):
    """Without a filter, all tags of the project are returned."""
    project = project_with_sdoc_and_multiple_tags["project"]
    tag1 = project_with_sdoc_and_multiple_tags["tag"]
    tag2 = project_with_sdoc_and_multiple_tags["tag2"]

    resp = client.get(_tags_url(project.id))

    assert resp.status_code == 200, resp.text
    assert [TagRead.model_validate(x).id for x in resp.json()] == [tag1.id, tag2.id]


def test_get_tags_by_sdoc(
    client: TestClient, project_with_multiple_sdocs_and_multiple_tags
):
    """The `sdoc_id` filter returns the tags linked with the document."""
    project = project_with_multiple_sdocs_and_multiple_tags["project"]
    sdoc2 = project_with_multiple_sdocs_and_multiple_tags["source_document2"]
    tag1 = project_with_multiple_sdocs_and_multiple_tags["tag1"]

    resp = client.get(_tags_url(project.id), params={"sdoc_id": sdoc2.id})

    assert resp.status_code == 200, resp.text
    assert [TagRead.model_validate(x).id for x in resp.json()] == [tag1.id]


def test_get_tags_by_sdoc_of_another_project_matches_nothing(
    client: TestClient, two_tenants: TwoTenants
):
    """A document of another project in the filter matches no tag, while the own
    document returns its tag."""
    own, foreign = two_tenants["own"], two_tenants["foreign"]
    url = _tags_url(own["project"].id)

    resp = client.get(url, params={"sdoc_id": own["sdoc"].id})
    assert resp.status_code == 200, resp.text
    assert [tag["id"] for tag in resp.json()] == [own["tag"].id]

    resp = client.get(url, params={"sdoc_id": foreign["sdoc"].id})
    assert resp.status_code == 200, resp.text
    assert resp.json() == []


def test_get_tags_of_a_project_of_no_membership_is_forbidden(client: TestClient):
    """The user is no member of a project that does not exist (403)."""
    resp = client.get(_tags_url(1441))

    assert resp.status_code == 403, resp.text


# ===========================================================================
# GET TAG (GET /projects/{project_id}/tags/{tag_id}) TESTS
# ===========================================================================


def test_get_by_id(client: TestClient, project_with_sdoc_and_tag):
    """A tag of the project is returned."""
    project = project_with_sdoc_and_tag["project"]
    tag = project_with_sdoc_and_tag["tag"]

    resp = client.get(f"{_tags_url(project.id)}/{tag.id}")

    assert resp.status_code == 200, resp.text
    assert TagRead.model_validate(resp.json()).name == "Test Tag"


def test_get_by_id_not_found(client: TestClient, test_project):
    """A tag that does not exist answers 404."""
    resp = client.get(f"{_tags_url(test_project.id)}/1441")

    assert resp.status_code == 404, resp.text


def test_get_by_id_of_another_project_is_not_found(
    client: TestClient, two_tenants: TwoTenants
):
    """A tag of another project does not exist in the project of the path (404),
    also for a member of both projects."""
    own, foreign = two_tenants["own"], two_tenants["foreign"]

    resp = client.get(f"{_tags_url(own['project'].id)}/{foreign['tag'].id}")

    assert resp.status_code == 404, resp.text


# ===========================================================================
# GET SDOC IDS (GET /projects/{project_id}/tags/{tag_id}/source-documents) TESTS
# ===========================================================================


def test_get_sdoc_ids_by_tag_id(
    client: TestClient, project_with_multiple_sdocs_and_multiple_tags
):
    """T1 is linked with both documents, T2 only with A."""
    project = project_with_multiple_sdocs_and_multiple_tags["project"]
    tag1 = project_with_multiple_sdocs_and_multiple_tags["tag1"]
    tag2 = project_with_multiple_sdocs_and_multiple_tags["tag2"]
    sd1 = project_with_multiple_sdocs_and_multiple_tags["source_document1"]
    sd2 = project_with_multiple_sdocs_and_multiple_tags["source_document2"]

    resp = client.get(f"{_tags_url(project.id)}/{tag1.id}/source-documents")
    assert resp.status_code == 200, resp.text
    assert set(resp.json()) == {sd1.id, sd2.id}

    resp = client.get(f"{_tags_url(project.id)}/{tag2.id}/source-documents")
    assert resp.status_code == 200, resp.text
    assert set(resp.json()) == {sd1.id}


def test_get_sdoc_ids_by_tag_id_not_found(client: TestClient, test_project):
    """A tag that does not exist answers 404."""
    resp = client.get(f"{_tags_url(test_project.id)}/2000/source-documents")

    assert resp.status_code == 404, resp.text


# ===========================================================================
# UPDATE TAG (PATCH /projects/{project_id}/tags/{tag_id}) TESTS
# ===========================================================================


testdata_tags = [
    pytest.param({"name": "New Tag Name"}, id="update_name_only"),
    pytest.param({"color": "red"}, id="update_color_only"),
    pytest.param({"description": "Updated Description"}, id="update_description_only"),
    pytest.param({"name": "Combined", "color": "yellow"}, id="update_multiple_fields"),
]


@pytest.mark.parametrize("payload", testdata_tags)
def test_update_tag_parametrized(
    client: TestClient, project_with_sdoc_and_multiple_tags, payload
):
    """Only the sent fields change."""
    project = project_with_sdoc_and_multiple_tags["project"]
    tag = project_with_sdoc_and_multiple_tags["tag"]

    resp = client.patch(
        f"{_tags_url(project.id)}/{tag.id}",
        json=TagUpdate(**payload).model_dump(exclude_unset=True),
    )

    assert resp.status_code == 200, resp.text
    updated = TagRead.model_validate(resp.json())
    assert updated.name == payload.get("name", tag.name)
    assert updated.color == payload.get("color", tag.color)
    assert updated.description == payload.get("description", tag.description)


def test_update_tag_not_found(client: TestClient, test_project):
    """A tag that does not exist answers 404."""
    payload = TagUpdate(name="None")

    resp = client.patch(
        f"{_tags_url(test_project.id)}/999999",
        json=payload.model_dump(exclude_unset=True),
    )

    assert resp.status_code == 404, resp.text


def test_update_tag_with_a_parent_of_another_project_is_a_conflict(
    client: TestClient, two_tenants: TwoTenants
):
    """A tag cannot get the parent of another project: the composite foreign key
    rejects it (409) and the tag keeps its parent."""
    own, foreign = two_tenants["own"], two_tenants["foreign"]
    url = f"{_tags_url(own['project'].id)}/{own['child_tag'].id}"

    resp = client.patch(url, json={"parent_id": foreign["tag"].id})

    assert resp.status_code == 409, resp.text
    resp = client.get(url)
    assert resp.status_code == 200, resp.text
    assert TagRead.model_validate(resp.json()).parent_id == own["tag"].id


# ===========================================================================
# UPDATE TAGS BULK (PATCH /projects/{project_id}/tags/bulk) TESTS
# ===========================================================================


def test_update_tags_bulk_updates_each_tag(
    client: TestClient, project_with_sdoc_and_multiple_tags
):
    """Every tag gets its own changes, and the results keep the request order."""
    project = project_with_sdoc_and_multiple_tags["project"]
    tag = project_with_sdoc_and_multiple_tags["tag"]
    tag2 = project_with_sdoc_and_multiple_tags["tag2"]
    request = [
        TagUpdateBulk(tag_id=tag2.id, name="Renamed Tag 2", description="second"),
        TagUpdateBulk(tag_id=tag.id, description="first"),
    ]

    response = client.patch(
        f"{_tags_url(project.id)}/bulk",
        json=[update.model_dump(exclude_unset=True) for update in request],
    )

    assert response.status_code == 200, response.text
    tags = [TagRead.model_validate(t) for t in response.json()]
    assert [(t.id, t.name, t.description) for t in tags] == [
        (tag2.id, "Renamed Tag 2", "second"),
        (tag.id, "Test Tag", "first"),
    ]


def test_update_tags_bulk_rejects_a_taken_name_without_changes(
    client: TestClient, project_with_sdoc_and_multiple_tags
):
    """Tag names are unique per project: a taken name fails the whole update with
    409, and no tag of the request is changed."""
    project = project_with_sdoc_and_multiple_tags["project"]
    tag = project_with_sdoc_and_multiple_tags["tag"]
    tag2 = project_with_sdoc_and_multiple_tags["tag2"]

    response = client.patch(
        f"{_tags_url(project.id)}/bulk",
        json=[
            {"tag_id": tag2.id, "description": "changed"},
            {"tag_id": tag.id, "name": "Test Tag 2"},
        ],
    )

    assert response.status_code == 409, response.text
    response = client.get(f"{_tags_url(project.id)}/{tag2.id}")
    assert response.status_code == 200, response.text
    assert TagRead.model_validate(response.json()).description is None


def test_update_tags_bulk_rejects_tags_of_another_project(
    client: TestClient, two_tenants: TwoTenants
):
    """A tag of another project does not exist in the project of the path (404)."""
    own, foreign = two_tenants["own"], two_tenants["foreign"]

    response = client.patch(
        f"{_tags_url(own['project'].id)}/bulk",
        json=[
            {"tag_id": own["tag"].id, "name": "A"},
            {"tag_id": foreign["tag"].id, "name": "B"},
        ],
    )

    assert response.status_code == 404, response.text


# ===========================================================================
# DELETE TAG (DELETE /projects/{project_id}/tags/{tag_id}) TESTS
# ===========================================================================


def test_delete_tag_by_id(client: TestClient, project_with_sdoc_and_tag):
    """The deleted tag is returned as it was before the delete."""
    project = project_with_sdoc_and_tag["project"]
    tag = project_with_sdoc_and_tag["tag"]

    resp = client.delete(f"{_tags_url(project.id)}/{tag.id}")

    assert resp.status_code == 200, resp.text
    deleted = TagRead.model_validate(resp.json())
    assert (deleted.id, deleted.project_id, deleted.name) == (
        tag.id,
        project.id,
        tag.name,
    )
    resp = client.get(f"{_tags_url(project.id)}/{tag.id}")
    assert resp.status_code == 404, resp.text


def test_delete_tag_by_id_not_found(client: TestClient, test_project):
    """A tag that does not exist answers 404."""
    resp = client.delete(f"{_tags_url(test_project.id)}/3000")

    assert resp.status_code == 404, resp.text


# ===========================================================================
# LINK TAGS (PUT /projects/{project_id}/tags/bulk/source-documents) TESTS
# ===========================================================================


def test_link_tags_bulk(
    client: TestClient, project_with_multiple_sdocs_and_multiple_tags
):
    """B already has T1; after linking T1 and T2 it has both."""
    project = project_with_multiple_sdocs_and_multiple_tags["project"]
    sdoc = project_with_multiple_sdocs_and_multiple_tags["source_document2"]
    tag1 = project_with_multiple_sdocs_and_multiple_tags["tag1"]
    tag2 = project_with_multiple_sdocs_and_multiple_tags["tag2"]
    payload = SourceDocumentTagMultiLink(
        source_document_ids=[sdoc.id], tag_ids=[tag1.id, tag2.id]
    )

    resp = client.put(
        f"{_tags_url(project.id)}/bulk/source-documents", json=payload.model_dump()
    )

    assert resp.status_code == 200, resp.text
    assert _links(resp.json()) == {sdoc.id: {tag1.id, tag2.id}}


@pytest.mark.parametrize("foreign_field", ["source_document_ids", "tag_ids"])
def test_link_tags_bulk_with_an_id_of_another_project_is_a_conflict(
    client: TestClient, two_tenants: TwoTenants, foreign_field: str
):
    """The documents and tags of a link are body references: one of another
    project is rejected by the composite foreign keys of the link table (409)."""
    own, foreign = two_tenants["own"], two_tenants["foreign"]
    payload = {
        "source_document_ids": [own["bare_sdoc"].id],
        "tag_ids": [own["tag"].id],
    }
    payload[foreign_field] = [
        (
            foreign["bare_sdoc"]
            if foreign_field == "source_document_ids"
            else foreign["tag"]
        ).id
    ]

    resp = client.put(
        f"{_tags_url(own['project'].id)}/bulk/source-documents", json=payload
    )

    assert resp.status_code == 409, resp.text


def test_link_tags_bulk_without_documents_returns_no_links(
    client: TestClient, test_project
):
    """Linking no documents changes nothing."""
    resp = client.put(
        f"{_tags_url(test_project.id)}/bulk/source-documents",
        json={"source_document_ids": [], "tag_ids": []},
    )

    assert resp.status_code == 200, resp.text
    assert resp.json() == {"links": {}}


# ===========================================================================
# UPDATE LINKS (PATCH /projects/{project_id}/tags/bulk/source-documents) TESTS
# ===========================================================================


# The document starts with both tags (param ids 1 and 2) linked. Each case lists the
# param ids to unlink and to link, and the expected resulting set of linked tag
# param ids.
testdata = [
    # Unlinking both tags leaves the document with no tags.
    pytest.param([1, 2], [], set(), id="unlink_both"),
    # Linking an already-linked tag changes nothing: both remain linked.
    pytest.param([], [1], {1, 2}, id="link_tag1"),
    pytest.param([], [2], {1, 2}, id="link_tag2"),
    pytest.param([], [1, 2], {1, 2}, id="link_both"),
    # Unlinking one tag leaves the other linked.
    pytest.param([1], [], {2}, id="unlink_tag1"),
    pytest.param([2], [], {1}, id="unlink_tag2"),
    # Linking and unlinking nothing leaves both tags linked.
    pytest.param([], [], {1, 2}, id="nothing"),
]


@pytest.mark.parametrize("unlink_ids, link_ids, expected_tag_param_ids", testdata)
def test_update_sdoc_tags_bulk_parametrize(
    client: TestClient,
    project_with_sdoc_and_multiple_tags,
    unlink_ids: list[int],
    link_ids: list[int],
    expected_tag_param_ids: set[int],
):
    """The links are added and removed, and the resulting tags per document are
    returned."""
    project = project_with_sdoc_and_multiple_tags["project"]
    sdoc = project_with_sdoc_and_multiple_tags["source_document"]
    param_id2tag = {
        1: project_with_sdoc_and_multiple_tags["tag"],
        2: project_with_sdoc_and_multiple_tags["tag2"],
    }
    payload = {
        "sdoc_ids": [sdoc.id],
        "unlink_tag_ids": [param_id2tag[i].id for i in unlink_ids],
        "link_tag_ids": [param_id2tag[i].id for i in link_ids],
    }

    resp = client.patch(f"{_tags_url(project.id)}/bulk/source-documents", json=payload)

    assert resp.status_code == 200, resp.text
    expected = {param_id2tag[i].id for i in expected_tag_param_ids}
    assert _links(resp.json()) == {sdoc.id: expected}


def test_update_sdoc_tags_bulk_linking_a_tag_of_another_project_is_a_conflict(
    client: TestClient, two_tenants: TwoTenants
):
    """A tag of another project to link is rejected by the composite foreign key
    (409)."""
    own, foreign = two_tenants["own"], two_tenants["foreign"]
    payload = {
        "sdoc_ids": [own["sdoc"].id],
        "unlink_tag_ids": [],
        "link_tag_ids": [foreign["tag"].id],
    }

    resp = client.patch(
        f"{_tags_url(own['project'].id)}/bulk/source-documents", json=payload
    )

    assert resp.status_code == 409, resp.text


# ===========================================================================
# SET LINKS (PATCH /projects/{project_id}/tags/bulk/source-documents/set) TESTS
# ===========================================================================


def test_set_sdoc_tags_bulk(
    client: TestClient, project_with_multiple_sdocs_and_multiple_tags
):
    """Every document gets exactly its given tags: A loses T1, B gets T2."""
    project = project_with_multiple_sdocs_and_multiple_tags["project"]
    sdoc1 = project_with_multiple_sdocs_and_multiple_tags["source_document1"]
    sdoc2 = project_with_multiple_sdocs_and_multiple_tags["source_document2"]
    tag1 = project_with_multiple_sdocs_and_multiple_tags["tag1"]
    tag2 = project_with_multiple_sdocs_and_multiple_tags["tag2"]
    payload = SdocTagLinks(links={sdoc1.id: [tag2.id], sdoc2.id: [tag1.id, tag2.id]})

    resp = client.patch(
        f"{_tags_url(project.id)}/bulk/source-documents/set",
        json=payload.model_dump(),
    )

    assert resp.status_code == 200, resp.text
    assert _links(resp.json()) == {sdoc1.id: {tag2.id}, sdoc2.id: {tag1.id, tag2.id}}


def test_set_sdoc_tags_bulk_with_a_document_of_another_project_is_a_conflict(
    client: TestClient, two_tenants: TwoTenants
):
    """A document of another project gets no tags of the path's project: the
    composite foreign key rejects the link (409)."""
    own, foreign = two_tenants["own"], two_tenants["foreign"]
    payload = SdocTagLinks(links={foreign["bare_sdoc"].id: [own["tag"].id]})

    resp = client.patch(
        f"{_tags_url(own['project'].id)}/bulk/source-documents/set",
        json=payload.model_dump(),
    )

    assert resp.status_code == 409, resp.text


# ===========================================================================
# UNLINK TAGS (DELETE /projects/{project_id}/tags/bulk/source-documents) TESTS
# ===========================================================================


def test_unlink_tags_bulk(client: TestClient, project_with_sdoc_and_multiple_tags):
    """Unlinking both tags leaves the document without tags."""
    project = project_with_sdoc_and_multiple_tags["project"]
    sdoc = project_with_sdoc_and_multiple_tags["source_document"]
    tag1 = project_with_sdoc_and_multiple_tags["tag"]
    tag2 = project_with_sdoc_and_multiple_tags["tag2"]
    payload = {"source_document_ids": [sdoc.id], "tag_ids": [tag1.id, tag2.id]}

    resp = client.request(
        "DELETE", f"{_tags_url(project.id)}/bulk/source-documents", json=payload
    )

    assert resp.status_code == 200, resp.text
    assert resp.json() == {"links": {str(sdoc.id): []}}


def test_unlink_tags_bulk_of_another_project_removes_nothing(
    client: TestClient, two_tenants: TwoTenants
):
    """Unlinking the link of another project through the own project matches no
    link: the foreign document keeps its tag."""
    own, foreign = two_tenants["own"], two_tenants["foreign"]
    payload = {
        "source_document_ids": [foreign["sdoc"].id],
        "tag_ids": [foreign["tag"].id],
    }

    resp = client.request(
        "DELETE", f"{_tags_url(own['project'].id)}/bulk/source-documents", json=payload
    )

    assert resp.status_code == 200, resp.text
    resp = client.get(
        _tags_url(foreign["project"].id), params={"sdoc_id": foreign["sdoc"].id}
    )
    assert [tag["id"] for tag in resp.json()] == [foreign["tag"].id]


# ===========================================================================
# COUNT TAGS (POST /projects/{project_id}/tags/count) TESTS
# ===========================================================================


def test_count_tags_of_all_tags(
    client: TestClient, project_with_multiple_sdocs_and_multiple_tags
):
    """Without tag ids, every tag of the project is counted: T1 on A and B, T2 on
    A."""
    project = project_with_multiple_sdocs_and_multiple_tags["project"]
    sdoc1 = project_with_multiple_sdocs_and_multiple_tags["source_document1"]
    sdoc2 = project_with_multiple_sdocs_and_multiple_tags["source_document2"]
    tag1 = project_with_multiple_sdocs_and_multiple_tags["tag1"]
    tag2 = project_with_multiple_sdocs_and_multiple_tags["tag2"]

    resp = client.post(
        f"{_tags_url(project.id)}/count", json={"sdoc_ids": [sdoc1.id, sdoc2.id]}
    )

    assert resp.status_code == 200, resp.text
    assert resp.json() == {str(tag1.id): 2, str(tag2.id): 1}


def test_count_tags_of_given_tags(
    client: TestClient, project_with_multiple_sdocs_and_multiple_tags
):
    """With tag ids, only those tags are counted."""
    project = project_with_multiple_sdocs_and_multiple_tags["project"]
    sdoc2 = project_with_multiple_sdocs_and_multiple_tags["source_document2"]
    tag2 = project_with_multiple_sdocs_and_multiple_tags["tag2"]

    resp = client.post(
        f"{_tags_url(project.id)}/count",
        json={"sdoc_ids": [sdoc2.id], "tag_ids": [tag2.id]},
    )

    assert resp.status_code == 200, resp.text
    assert resp.json() == {str(tag2.id): 0}


def test_count_tags_of_another_project_counts_nothing(
    client: TestClient, two_tenants: TwoTenants
):
    """A document and a tag of another project match no link of the path's
    project."""
    own, foreign = two_tenants["own"], two_tenants["foreign"]

    resp = client.post(
        f"{_tags_url(own['project'].id)}/count",
        json={"sdoc_ids": [foreign["sdoc"].id], "tag_ids": [foreign["tag"].id]},
    )

    assert resp.status_code == 200, resp.text
    assert resp.json() == {str(foreign["tag"].id): 0}
