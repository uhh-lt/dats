"""FastAPI dependencies that gate the routes of a feature: a request to a route
of a feature that is disabled in the project fails with 403.

- `require_feature(Feature.X)`: for routes with a `project_id` path or query
  parameter.
- `require_feature_of(Feature.X, Crud.Y, "y_id")`: for routes that identify an
  object of the project by a path parameter.

Routes that carry the project id in the request body call
`FeatureService().assert_enabled(...)` after their authorization check instead.
Both dependencies check the project membership first, so a non-member never
learns which features a project enables.
"""

from typing import Callable

from fastapi import Depends, Request
from fastapi.exceptions import RequestValidationError
from sqlalchemy.orm import Session

from common.crud_enum import Crud
from common.dependencies import get_db_session
from common.feature_enum import Feature
from core.auth.authz_user import AuthzUser
from systems.feature_system.feature_service import FeatureService


def require_feature(feature: Feature) -> Callable[..., None]:
    """Gate a route with a `project_id` path or query parameter."""

    def check_feature_enabled(
        project_id: int,
        authz_user: AuthzUser = Depends(),
        db: Session = Depends(get_db_session),
    ) -> None:
        authz_user.assert_in_project(project_id)
        FeatureService().assert_enabled(db=db, project_id=project_id, feature=feature)

    return check_feature_enabled


def require_feature_of(
    feature: Feature, crud: Crud, id_param: str
) -> Callable[..., None]:
    """Gate a route that identifies an object by the integer path parameter
    `id_param`, e.g. `/cota/{cota_id}`. The object's project must enable the
    feature."""

    def check_feature_enabled(
        request: Request,
        authz_user: AuthzUser = Depends(),
        db: Session = Depends(get_db_session),
    ) -> None:
        raw_id = request.path_params[id_param]
        try:
            object_id = int(raw_id)
        except ValueError:
            # the route's own validation would report it, but this runs first
            raise RequestValidationError(
                [
                    {
                        "type": "int_parsing",
                        "loc": ("path", id_param),
                        "msg": "Input should be a valid integer, unable to parse string as an integer",
                        "input": raw_id,
                    }
                ]
            )
        orm_object = authz_user.read_crud(crud, object_id)
        project_id = orm_object.get_project_id()
        authz_user.assert_in_project(project_id)
        FeatureService().assert_enabled(db=db, project_id=project_id, feature=feature)

    return check_feature_enabled
