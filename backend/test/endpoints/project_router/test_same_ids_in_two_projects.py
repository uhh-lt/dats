"""Ids are unique per project only: a project answers every read route the same
before and after another project with the same ids exists, and that project answers
what the first one answered, with its own project id. A route that matched a row by
its id alone, or read the rows of all projects, would mix in the rows of the other
project."""

from typing import Any, Callable

from fastapi.testclient import TestClient
from httpx2 import Response

from composite_keys_test_utils import TenantRows
from repos.filesystem.filesystem_repo import FilesystemRepo

from .conftest import LoneProject
from .test_project_router import PATH_IDS, QUERIES, _path_params, _project_routes

# the routes of what the twin does not copy: the project itself (title, timestamps)
# and its members (global users)
NOT_COPIED_ROUTES = {"/projects/{project_id}", "/projects/{project_id}/members"}

# an empty filter of any search
_NO_FILTER = {"id": "root", "logic_operator": "and", "items": []}

# the query parameters and the body of a valid request on the rows of a tenant, by
# "<METHOD> <path>": the GET routes with required query parameters and the POST
# routes that only read (searches, counts, statistics, analyses); each must answer
# 200
ARGUMENTS: dict[str, Callable[[TenantRows], dict[str, Any]]] = {
    "GET /projects/{project_id}/span-annotations": lambda rows: {
        "params": {"user_id": rows["adoc"].user_id}
    },
    "GET /projects/{project_id}/sentence-annotations": lambda rows: {
        "params": {"user_id": rows["adoc"].user_id}
    },
    "GET /projects/{project_id}/sentence-annotations/per-sentence": lambda rows: {
        "params": {"user_id": rows["adoc"].user_id, "sdoc_id": rows["sdoc"].id}
    },
    "GET /projects/{project_id}/bbox-annotations": lambda rows: {
        "params": {"user_id": rows["adoc"].user_id}
    },
    "GET /projects/{project_id}/span-groups": lambda rows: {
        "params": {"user_id": rows["adoc"].user_id}
    },
    "GET /projects/{project_id}/source-documents": lambda rows: {
        "params": {"filename": rows["sdoc"].filename}
    },
    "GET /projects/{project_id}/source-document-metadata": lambda rows: {
        "params": {"sdoc_id": rows["sdoc"].id}
    },
    "GET /projects/{project_id}/search-views": lambda rows: {
        "params": {"entity_type": rows["search_view"].entity_type}
    },
    "GET /projects/{project_id}/doc-processing/columns": lambda rows: {
        "params": {"doctype": "text"}
    },
    "GET /projects/{project_id}/doc-processing/status": lambda rows: {
        "params": {"status": 1}
    },
    "GET /projects/{project_id}/prompts/task-info": lambda rows: {
        "params": {"task_type": "TAGGING"}
    },
    "GET /projects/{project_id}/prompts/default": lambda rows: {
        "params": {"output_format": "tags", "language": "en"}
    },
    "POST /projects/{project_id}/search/source-documents": lambda rows: {
        "params": {"search_query": "", "expert_mode": False, "highlight": False},
        "json": {"filter": _NO_FILTER, "sorts": []},
    },
    "POST /projects/{project_id}/search/memos": lambda rows: {
        "json": {"filter": _NO_FILTER}
    },
    "POST /projects/{project_id}/search/memos/groups": lambda rows: {
        "json": {"filter": _NO_FILTER, "group_by": {"field": "M_USER_ID"}}
    },
    "POST /projects/{project_id}/search/span-annotations": lambda rows: {
        "json": {"filter": _NO_FILTER}
    },
    "POST /projects/{project_id}/search/span-annotations/groups": lambda rows: {
        "json": {"filter": _NO_FILTER, "group_by": {"field": "SP_USER_ID"}}
    },
    "POST /projects/{project_id}/search/sentence-annotations": lambda rows: {
        "json": {"filter": _NO_FILTER}
    },
    "POST /projects/{project_id}/search/sentence-annotations/groups": lambda rows: {
        "json": {"filter": _NO_FILTER, "group_by": {"field": "SentAnno_USER_ID"}}
    },
    "POST /projects/{project_id}/search/bbox-annotations": lambda rows: {
        "json": {"filter": _NO_FILTER}
    },
    "POST /projects/{project_id}/search/bbox-annotations/groups": lambda rows: {
        "json": {"filter": _NO_FILTER, "group_by": {"field": "BB_USER_ID"}}
    },
    "POST /projects/{project_id}/span-annotations/count": lambda rows: {
        "params": {"user_id": rows["adoc"].user_id},
        "json": {
            "sdoc_ids": [rows["sdoc"].id],
            "code_ids": [rows["code"].id, rows["child_code"].id],
        },
    },
    "POST /projects/{project_id}/sentence-annotations/count": lambda rows: {
        "params": {"user_id": rows["adoc"].user_id},
        "json": {
            "sdoc_ids": [rows["sdoc"].id],
            "code_ids": [rows["code"].id, rows["child_code"].id],
        },
    },
    "POST /projects/{project_id}/tags/count": lambda rows: {
        "json": {"sdoc_ids": [rows["sdoc"].id, rows["bare_sdoc"].id], "tag_ids": None}
    },
    "POST /projects/{project_id}/doc-processing/search": lambda rows: {
        "params": {"doctype": "text", "page": 0, "page_size": 10},
        "json": [],
    },
    "POST /projects/{project_id}/agreements": lambda rows: {
        "json": {
            "sdoc_ids": [rows["sdoc"].id],
            "code_ids": [rows["code"].id],
            "reference_user_id": rows["adoc"].user_id,
            "compared_user_id": rows["adoc"].user_id,
            "annotation_type": "span",
            "scoring": "exact",
        }
    },
    "POST /projects/{project_id}/agreements/export": lambda rows: {
        "json": {
            "sdoc_ids": [rows["sdoc"].id],
            "code_ids": [rows["code"].id],
            "reference_user_id": rows["adoc"].user_id,
            "compared_user_id": rows["adoc"].user_id,
            "annotation_type": "sentence",
            "scoring": "constituents",
        }
    },
    "POST /projects/{project_id}/agreements/segment-texts": lambda rows: {
        "json": [{"sdoc_id": rows["sdoc"].id, "begin": 0, "end": 5}]
    },
    "POST /projects/{project_id}/llm-assistant/count-existing-annotations": (
        lambda rows: {
            "params": {
                "task_type": "ANNOTATION",
                "virtual_user_id": rows["virtual_user"].id,
            },
            "json": {"sdoc_ids": [rows["sdoc"].id], "code_ids": [rows["code"].id]},
        }
    ),
    "POST /projects/{project_id}/document-samples": lambda rows: {
        "params": {"n": 10, "frac": 1.0},
        "json": [[rows["tag"].id, rows["child_tag"].id]],
    },
    "POST /projects/{project_id}/classifiers/dataset-statistics": lambda rows: {
        "json": {
            "model": "document",
            "base_model_name": "default",
            "tag_ids": [rows["tag"].id],
            "user_ids": [rows["adoc"].user_id],
            "class_ids": [rows["tag"].id, rows["child_tag"].id],
            "merge_children_into_parent": False,
        }
    },
    "POST /projects/{project_id}/code-frequencies": lambda rows: {
        "json": {
            "code_ids": [rows["code"].id],
            "user_ids": [rows["adoc"].user_id],
            "doctypes": ["text"],
        }
    },
    "POST /projects/{project_id}/code-frequencies/occurrences": lambda rows: {
        "params": {"code_id": rows["code"].id, "return_children": True},
        "json": {"user_ids": [rows["adoc"].user_id], "doctypes": ["text"]},
    },
    "POST /projects/{project_id}/statistics/codes": lambda rows: {
        "params": {"code_id": rows["code"].id},
        "json": [rows["sdoc"].id, rows["bare_sdoc"].id],
    },
    "POST /projects/{project_id}/statistics/tags": lambda rows: {
        "json": [rows["sdoc"].id, rows["bare_sdoc"].id]
    },
    "POST /projects/{project_id}/word-frequencies/analysis": lambda rows: {
        "params": {"page": 0, "page_size": 10},
        "json": {"filter": _NO_FILTER, "sorts": []},
    },
    "POST /projects/{project_id}/word-frequencies/export": lambda rows: {
        "json": {"filter": _NO_FILTER, "sorts": []}
    },
    "POST /projects/{project_id}/prompts/build-examples": lambda rows: {
        "json": {"kind": "SPAN", "annotation_ids": [rows["span"].id]}
    },
    "POST /projects/{project_id}/keyword-statistics": lambda rows: {
        "json": [rows["sdoc"].id, rows["bare_sdoc"].id]
    },
    "POST /projects/{project_id}/similarity-search/sentences": lambda rows: {
        "params": {"top_k": 10, "threshold": 0.0},
        "json": {"query": "text", "filter": _NO_FILTER},
    },
    "POST /projects/{project_id}/similarity-search/images": lambda rows: {
        "params": {"top_k": 10, "threshold": 0.0},
        "json": {"query": "text", "filter": _NO_FILTER},
    },
    "POST /projects/{project_id}/perspectives/aspects/{aspect_id}/visualize": (
        lambda rows: {
            "params": {"search_query": ""},
            "json": {"filter": _NO_FILTER, "sorts": []},
        }
    ),
    "POST /projects/{project_id}/experiments/{experiment_id}/runs/{run_id}/export-log": (
        lambda rows: {"params": {"export_format": "json"}}
    ),
    "POST /projects/{project_id}/search-annotate/auto-annotate": lambda rows: {
        "params": {"query": "text"}
    },
    "POST /projects/{project_id}/prompts/preview": lambda rows: {
        "json": {
            "draft": {
                "text": "<document:whole> <tags> <output-format:tags>",
                "task_type": "TAGGING",
                "language": "en",
                "tags": [{"tag_id": rows["tag"].id, "name": "Tag", "description": ""}],
            },
            "sdoc_id": rows["sdoc"].id,
        }
    },
}

# the answer of a route: status and body
Answer = tuple[int, Any]

# a read: method, path, its path ids and the arguments of the request
Read = tuple[str, str, dict[str, int], dict[str, Any]]


def _in_project(value: Any, source_id: int, target_id: int) -> Any:
    """The answer of the source project as the target project would give it: the
    project ids of the source and the project in URLs replaced by the target."""
    if isinstance(value, dict):
        return {
            key: target_id
            if key.endswith("project_id") and item == source_id
            else _in_project(item, source_id, target_id)
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [_in_project(item, source_id, target_id) for item in value]
    if isinstance(value, str):
        return value.replace(f"projects/{source_id}/", f"projects/{target_id}/")
    return value


def _content(response: Response) -> Any:
    """The JSON body of the response, or its text if it has none; the text of the
    file instead of its path for an export (the path holds a new uuid each time)."""
    try:
        content = response.json()
    except ValueError:
        return response.text
    if isinstance(content, str) and "/exports/" in content:
        return (FilesystemRepo().root_dir / content).read_text()
    return content


def _reads(client: TestClient, rows: TenantRows) -> dict[str, Read]:
    """Every read on the rows, by "<METHOD> <path>": the GET routes whose path ids
    are in PATH_IDS and the POST routes of ARGUMENTS."""
    reads: dict[str, Read] = {}
    for method, path, _ in _project_routes(client):
        key = f"{method} {path}"
        names = _path_params(path)
        if key in ARGUMENTS:
            arguments = ARGUMENTS[key](rows)
        elif method == "GET" and all(name in PATH_IDS for name in names):
            arguments = {"params": QUERIES.get(key)}
        else:
            continue
        values = {name: PATH_IDS[name](rows) for name in names}
        reads[key] = (method, path, values, arguments)
    missing = set(ARGUMENTS) - set(reads)
    assert not missing, f"ARGUMENTS names unknown routes {missing}"
    return reads


def _answers(
    client: TestClient, reads: dict[str, Read], project_id: int
) -> dict[str, Answer]:
    answers = {}
    for key, (method, path, values, arguments) in reads.items():
        try:
            response = client.request(
                method, path.format(project_id=project_id, **values), **arguments
            )
        except Exception as error:
            # a route that raises on the fixture rows answers 500
            answers[key] = (500, type(error).__name__)
            continue
        answers[key] = (response.status_code, _content(response))
    return answers


def _differences(actual: dict[str, Answer], expected: dict[str, Answer]) -> list[str]:
    return [
        f"{key}: {actual[key]!r:.300} != {expected[key]!r:.300}"
        for key in expected
        if actual[key] != expected[key]
    ]


def test_every_get_route_with_a_required_query_has_arguments(
    client: TestClient,
) -> None:
    """Every GET route without path ids whose query has a required parameter is in
    ARGUMENTS, so the twin test compares its answers instead of two errors."""
    missing = [
        f"{method} {path}"
        for method, path, route in _project_routes(client)
        if method == "GET"
        and not _path_params(path)
        and any(
            param.field_info.is_required() for param in route.dependant.query_params
        )
        and f"{method} {path}" not in ARGUMENTS
    ]
    assert missing == []


def test_every_read_route_answers_the_same_after_a_project_with_the_same_ids_exists(
    client: TestClient, lone_project: LoneProject
) -> None:
    """Every GET route and every POST read of ARGUMENTS answers the same status and
    body in the test project before and after the twin exists, and the twin answers
    what the test project answered alone, with its own project id (apart from the
    routes of the project and its members, which the twin does not copy). Every
    route of ARGUMENTS and at least 100 reads in all answer 200 alone."""
    project = lone_project["project"]
    reads = _reads(client, lone_project["rows"])
    alone = _answers(client, reads, project.id)
    failed = {
        key: answer
        for key, answer in alone.items()
        if key in ARGUMENTS and answer[0] != 200
    }
    ok = sum(status == 200 for status, _ in alone.values())

    twin = lone_project["create_twin"]()
    after = _answers(client, reads, project.id)
    in_twin = _answers(client, reads, twin.id)

    assert failed == {}
    assert ok >= 100
    assert _differences(after, alone) == []
    expected_in_twin = {
        key: (status, _in_project(content, project.id, twin.id))
        for key, (status, content) in alone.items()
        if key.split(" ")[1] not in NOT_COPIED_ROUTES
    }
    assert _differences(in_twin, expected_in_twin) == []
