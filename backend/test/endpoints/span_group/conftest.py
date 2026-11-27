from typing import TypedDict

import pytest

from composite_keys_test_utils import TwoTenants, create_two_tenants
from core.annotation.span_group_crud import crud_span_group
from core.annotation.span_group_dto import SpanGroupCreate
from core.annotation.span_group_orm import SpanGroupORM
from core.annotation.span_group_service import SpanGroupService


@pytest.fixture(scope="function")
def tenants(db_session, test_user, test_project) -> TwoTenants:
    """
    This fixture sets up two projects with one row of every project-owned table
    each (see `composite_keys_test_utils.TenantRows` for the full inventory):

    - `own`: the rows in the test project.
    - `foreign`: the same rows in the project "Foreign Project" (no features).

    The test user is a member of both projects and annotated in both: the
    annotation document of the test user for "doc_<p>.txt" holds the span
    annotation of "Code <p>" and the span group "Group <p>", which contains that
    span annotation. "bare_<p>.txt" has no annotation document.

    Non-obvious derived behavior: because the user is a member of both projects,
    a request may only fail because an id belongs to the other project, never
    because of the membership.
    """
    return create_two_tenants(db_session, user=test_user, project=test_project)


class TenantsWithEmptySpanGroup(TypedDict):
    tenants: TwoTenants
    empty_span_group: SpanGroupORM


@pytest.fixture(scope="function")
def tenants_with_empty_span_group(
    db_session, test_user, tenants: TwoTenants
) -> TenantsWithEmptySpanGroup:
    """
    The two projects of `tenants`, plus the span group "Empty" of the test user in
    "doc_<p>.txt" of the own project, which contains no span annotation.

    Non-obvious derived behavior: the span annotation of the own project is in
    "Group <p>" only, so it can be added to "Empty" without a conflict.
    """
    own = tenants["own"]
    group = SpanGroupService().create(
        db=db_session,
        project_id=own["project"].id,
        user_id=test_user.id,
        create_dto=SpanGroupCreate(name="Empty", sdoc_id=own["sdoc"].id),
    )
    db_session.commit()
    return {
        "tenants": tenants,
        "empty_span_group": crud_span_group.read(
            db=db_session, project_id=own["project"].id, id=group.id
        ),
    }
