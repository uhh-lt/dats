"""FastAPI dependency that gates the routes of a feature not yet under
`/projects/{project_id}` (a project router takes the feature itself): a request
to a route of a feature that is disabled in the project fails with 403.

- `require_feature(FEATURE)`: for routes with a `project_id` path or query
  parameter.

`FEATURE` is the object `register_feature` returned, imported from the
module's `*_feature.py`. Routes that carry the project id in the request body call
`FeatureService().assert_enabled(...)` after their authorization check instead.
The dependency checks the project membership first, so a non-member never
learns which features a project enables.
"""

from typing import Callable

from fastapi import Depends

from common.dependencies import DBSession
from core.auth.authz_user import AuthzUser
from systems.feature_system.feature_registry import Feature
from systems.feature_system.feature_service import FeatureService


def require_feature(feature: Feature) -> Callable[..., None]:
    """Gate a route with a `project_id` path or query parameter."""

    def check_feature_enabled(
        project_id: int,
        db: DBSession,
        authz_user: AuthzUser = Depends(),
    ) -> None:
        authz_user.assert_in_project(project_id)
        FeatureService().assert_enabled(db=db, project_id=project_id, feature=feature)

    return check_feature_enabled
