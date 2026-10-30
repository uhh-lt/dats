import pytest
from fastapi import FastAPI
from mcp_types import Tool

from systems.mcp_system.mcp_constants import MCP_TAG
from systems.mcp_system.mcp_server import requires_approval

from .conftest import list_mcp_tools


def _needs_approval(tool: Tool) -> bool:
    """Reads the annotations like pydantic-ai passes them to the agents."""
    annotations = (
        tool.annotations.model_dump(by_alias=True) if tool.annotations else None
    )
    return requires_approval(annotations)


# ===========================================================================
# MCP TOOLS (list_tools of the DATS MCP server) TESTS
# ===========================================================================

# --- A. which routes are tools ------------------------------------------------


def test_mcp_tools_are_exactly_the_routes_with_the_mcp_tag(
    app: FastAPI, mcp_tools: dict[str, Tool]
):
    """Every operation with the MCP tag becomes one tool, and nothing else does."""
    mcp_operations = {
        op["operationId"].replace("-", "_")
        for ops in app.openapi()["paths"].values()
        for op in ops.values()
        if MCP_TAG in op.get("tags", [])
    }
    assert set(mcp_tools) == mcp_operations


def test_mcp_tools_of_the_user_router_leave_out_the_account_routes(
    mcp_tools: dict[str, Tool],
):
    """MCP clients can read users and manage project members, but never change or
    delete the logged-in user's account."""
    assert {name for name in mcp_tools if name.startswith("user_")} == {
        "user_get_me",
        "user_get_by_id",
        "user_get_by_project",
        "user_get_all",
        "user_associate_user_to_project",
        "user_dissociate_user_from_project",
    }


@pytest.mark.parametrize(
    "tags,expected_prefixes",
    [
        # The project agent's toolset: only the project router.
        pytest.param(["project"], {"project"}, id="project-agent"),
        # The source document agent's toolset: documents and their annotations.
        pytest.param(
            [
                "sourceDocument",
                "spanAnnotation",
                "bboxAnnotation",
                "sentenceAnnotation",
            ],
            {
                "sourceDocument",
                "spanAnnotation",
                "bboxAnnotation",
                "sentenceAnnotation",
            },
            id="source-document-agent",
        ),
        # "user" also has routes without the MCP tag, which stay excluded.
        pytest.param(["user"], {"user"}, id="user-router"),
    ],
)
def test_mcp_tools_with_tags_are_the_mcp_tools_of_these_routers(
    app: FastAPI,
    mcp_tools: dict[str, Tool],
    tags: list[str],
    expected_prefixes: set[str],
):
    """An agent's toolset holds exactly the MCP tools of its routers."""
    tools = list_mcp_tools(app, tags)

    expected = {
        name for name in mcp_tools if name.split("_", 1)[0] in expected_prefixes
    }
    assert set(tools) == expected
    assert len(tools) > 0


# --- B. which tools need the user's approval ----------------------------------
# The annotations follow the HTTP method; agents ask before destructive tools.


def test_mcp_tools_needing_approval_are_the_deletes_and_the_marked_updates(
    mcp_tools: dict[str, Tool],
):
    """All DELETE tools plus the marked PATCH tools (bulk overwrites, sharing)
    need approval; reading, computing, creating and single updates do not."""
    assert {name for name, tool in mcp_tools.items() if _needs_approval(tool)} == {
        "bboxAnnotation_delete_bbox_annotations_bulk",
        "bboxAnnotation_delete_by_id",
        "code_delete_by_id",
        "folder_delete_by_id",
        "memo_delete_by_id",
        "memo_delete_memos_bulk",
        "projectMetadata_delete_by_id",
        "project_delete_project",
        "sdocMetadata_delete_by_id",
        "sentenceAnnotation_delete_by_id",
        "sentenceAnnotation_delete_sentence_annotations_bulk",
        "sourceDocument_delete_by_id",
        "sourceDocument_delete_sdocs_bulk",
        "spanAnnotation_delete_by_id",
        "spanAnnotation_delete_span_annotations_bulk",
        "spanAnnotation_remove_from_all_groups",
        "spanAnnotation_remove_from_group",
        "tag_delete_by_id",
        "tag_unlink_multiple_tags",
        "user_dissociate_user_from_project",
        # PATCH routes marked with MCP_DESTRUCTIVE_EXTENSION
        "tag_set_tags_batch",
        "user_associate_user_to_project",
        "spanAnnotation_update_span_annotations_bulk",
        "sentenceAnnotation_update_sentence_annotations_bulk",
        "bboxAnnotation_update_bbox_annotations_bulk",
        "folder_update_folders_bulk",
        "sdocMetadata_update_bulk",
        "tag_update_tags_batch",
        "memo_update_memos_bulk",
    }


@pytest.mark.parametrize(
    "tool_name,read_only,destructive",
    [
        # GET reads.
        pytest.param("project_get_project", True, None, id="get"),
        # POST computes or starts a job: not read-only, not destructive.
        pytest.param("search_search_sdocs", False, False, id="post"),
        # PUT creates: a change, but nothing is lost.
        pytest.param("code_create_code", False, False, id="put"),
        # PATCH updates.
        pytest.param("code_update_by_id", False, False, id="patch"),
        # A marked PATCH overwrites in bulk or removes data.
        pytest.param("tag_set_tags_batch", False, True, id="marked-patch"),
        # DELETE removes data.
        pytest.param("code_delete_by_id", False, True, id="delete"),
    ],
)
def test_mcp_tool_annotations_follow_the_http_method(
    mcp_tools: dict[str, Tool],
    tool_name: str,
    read_only: bool,
    destructive: bool | None,
):
    """MCP clients see the read-only and destructive hints of each tool."""
    annotations = mcp_tools[tool_name].annotations
    assert annotations is not None
    assert annotations.read_only_hint is read_only
    assert annotations.destructive_hint is destructive


@pytest.mark.parametrize(
    "annotations,expected",
    [
        # Without annotations, a tool counts as destructive (MCP spec default).
        pytest.param(None, True, id="no-annotations"),
        pytest.param({}, True, id="empty-annotations"),
        # A write without a destructive hint counts as destructive, too.
        pytest.param({"readOnlyHint": False}, True, id="write-without-hint"),
        pytest.param({"readOnlyHint": True}, False, id="read-only"),
        pytest.param(
            {"readOnlyHint": False, "destructiveHint": False}, False, id="additive"
        ),
    ],
)
def test_requires_approval_defaults_to_destructive(
    annotations: dict[str, bool] | None, expected: bool
):
    """Tools of other MCP servers carry no or partial annotations."""
    assert requires_approval(annotations) is expected
