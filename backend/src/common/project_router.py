from enum import Enum
from typing import Any

from fastapi import APIRouter, Depends

from common.dependencies import DBSession, get_current_user
from core.auth.authz_user import AuthzUser
from systems.feature_system.feature_registry import Feature
from systems.feature_system.feature_service import FeatureService

# the errors every project route can answer, documented once for all of them
PROJECT_ROUTE_ERRORS: dict[int | str, dict[str, Any]] = {
    400: {"description": "The request breaks a rule of the domain"},
    403: {
        "description": "The user is no member of the project, or the feature is disabled"
    },
    404: {"description": "A path id, or an id the route reads, is not in the project"},
    409: {
        "description": "A body id violates a foreign key, or a value a unique constraint"
    },
}


def project_router(
    prefix: str, *, tags: list[str | Enum], feature: Feature | None = None
) -> APIRouter:
    """
    The router of a resource of a project: its routes live under
    `/projects/{project_id}<prefix>`, and every request needs a logged-in member of
    the project (403 otherwise) and, for the router of a feature, the feature
    enabled in the project (403 otherwise). The routes read every path id within
    the project of the path (404 for an id of another project), leave the body ids
    of a write to the composite foreign keys (409) and filter by the project, so a
    filter id of another project matches nothing.

    Args:
        prefix: The plural, kebab-case name of the resource, e.g.
            `"/span-annotations"`.
        tags: The OpenAPI tags of the routes.
        feature: The feature of the module, the object `register_feature` returned.
    """

    def check_project(
        project_id: int,
        db: DBSession,
        authz_user: AuthzUser = Depends(),
    ) -> None:
        authz_user.assert_in_project(project_id)
        if feature is not None:
            FeatureService().assert_enabled(
                db=db, project_id=project_id, feature=feature
            )

    return APIRouter(
        prefix=f"/projects/{{project_id}}{prefix}",
        dependencies=[Depends(get_current_user), Depends(check_project)],
        tags=tags,
        responses=PROJECT_ROUTE_ERRORS,
    )
