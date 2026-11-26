"""The project router of a feature module gates every route of the module: in a
project that does not enable the feature, every route answers 403 before it reads
anything, and the routes of other modules are not gated by a feature."""

import importlib
import pkgutil
import re

from fastapi.routing import APIRoute, iter_route_contexts
from fastapi.testclient import TestClient

from feature_test_utils import FeaturelessProject, assert_feature_disabled
from systems.feature_system.feature_registry import Feature

PROJECT_PREFIX = "/projects/{project_id}"
FEATURE_DISABLED = "is not enabled"


def _project_routes(client: TestClient) -> list[tuple[str, APIRoute]]:
    """The routes of the app below /projects/{project_id}, by method; the routes
    of the project itself belong to no feature module (and its DELETE would
    delete the project of the test)."""
    return [
        (method, context.original_route)
        for context in iter_route_contexts(client.app.routes)  # type: ignore[attr-defined]
        if isinstance(context.original_route, APIRoute)
        and context.original_route.path.startswith(f"{PROJECT_PREFIX}/")
        for method in sorted(context.original_route.methods or ())
    ]


def _feature_of_module(endpoint_module: str) -> Feature | None:
    """The feature declared in the `*_feature.py` of the module package of an
    endpoint (`modules.<module>.<name>_endpoint`), None outside `modules` or for a
    module without a feature."""
    parts = endpoint_module.split(".")
    if parts[0] != "modules":
        return None
    package = importlib.import_module(".".join(parts[:2]))
    features = [
        value
        for info in pkgutil.iter_modules(package.__path__)
        if info.name.endswith("_feature")
        for value in vars(
            importlib.import_module(f"{package.__name__}.{info.name}")
        ).values()
        if isinstance(value, Feature)
    ]
    assert len(features) <= 1, f"{package.__name__} declares {len(features)} features"
    return features[0] if features else None


def test_every_route_of_a_feature_module_is_gated_by_its_feature(
    client: TestClient, featureless_project: FeaturelessProject
) -> None:
    """Every project route of a module with a feature answers 403 (feature
    disabled) in a project without features, whatever its path ids and body; the
    project routes of other modules are never rejected for a feature."""
    project_id = featureless_project["project"].id
    failures: list[str] = []
    gated = 0
    for method, route in _project_routes(client):
        feature = _feature_of_module(route.endpoint.__module__)
        url = re.sub(
            r"{(\w+)}", "0", route.path.replace("{project_id}", str(project_id))
        )
        response = client.request(method, url)
        if feature is None:
            if FEATURE_DISABLED in response.text:
                failures.append(f"{method} {route.path}: gated: {response.text[:200]}")
            continue
        gated += 1
        try:
            assert_feature_disabled(response, feature.name)
        except AssertionError:
            failures.append(
                f"{method} {route.path}: {response.status_code} {response.text[:200]}"
            )
    assert gated, "no route of a feature module under /projects/{project_id}"
    assert not failures, "\n".join(failures)
