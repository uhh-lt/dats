"""Ids are unique per project only: two projects that hold the same ids answer
every GET route the same, apart from their own project id. A route that matched a
row by its id alone would mix in the rows of the other project."""

from typing import Any

from fastapi.testclient import TestClient
from httpx2 import Response

from composite_keys_test_utils import TwinProjects

from .test_project_router import (
    PATH_IDS,
    QUERIES,
    _path_params,
    _project_routes,
)

# the routes of what the twin does not copy: the project itself (title, timestamps)
# and its members (global users)
NOT_COPIED_ROUTES = {"/projects/{project_id}", "/projects/{project_id}/members"}


def _without_project(value: Any, project_id: int) -> Any:
    """The response without the project id: project_id fields and the project
    in URLs."""
    if isinstance(value, dict):
        return {
            key: None if key == "project_id" else _without_project(item, project_id)
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [_without_project(item, project_id) for item in value]
    if isinstance(value, str):
        return value.replace(f"projects/{project_id}/", "projects/<p>/")
    return value


def _content(response: Response) -> Any:
    """The JSON body of the response, or its text if it has none."""
    try:
        return response.json()
    except ValueError:
        return response.text


def test_every_read_route_answers_the_same_in_projects_with_the_same_ids(
    client: TestClient, twins: TwinProjects
) -> None:
    """Every GET route answers the same status and body in the test project and in
    its twin; at least 50 of them answer 200."""
    rows = twins["rows"]
    differences: list[str] = []
    ok = 0
    for method, path, _ in _project_routes(client):
        names = _path_params(path)
        key = f"{method} {path}"
        if (
            method != "GET"
            or path in NOT_COPIED_ROUTES
            or any(name not in PATH_IDS for name in names)
        ):
            continue
        values = {name: PATH_IDS[name](rows) for name in names}
        answers = []
        for project in [twins["project"], twins["twin"]]:
            try:
                response = client.request(
                    method,
                    path.format(project_id=project.id, **values),
                    params=QUERIES.get(key),
                )
            except Exception as error:
                # a route that fails on the bare fixture rows must fail in both
                answers.append((500, type(error).__name__))
                continue
            content = _content(response)
            answers.append(
                (response.status_code, _without_project(content, project.id))
            )
        if answers[0] != answers[1]:
            differences.append(f"{key}: {answers[0]!r:.300} != {answers[1]!r:.300}")
        ok += answers[0][0] == 200

    assert differences == []
    assert ok >= 50
