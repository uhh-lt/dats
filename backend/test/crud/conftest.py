from typing import TypedDict

import pytest

from core.project.project_orm import ProjectORM
from core.tag.tag_crud import crud_tag
from core.tag.tag_dto import TagCreate
from core.tag.tag_orm import TagORM


class ProjectWithTags(TypedDict):
    project: ProjectORM
    tags: list[TagORM]


@pytest.fixture(scope="function")
def project_with_tags(db_session, test_project) -> ProjectWithTags:
    """
    This fixture sets up the following project:

    - The test project of the test user.
    - Five root tags (no parent, no description) named "Tag 0" to "Tag 4", created in
      this order with one `create_multi` call. `tags[i]` is "Tag i".

    Non-obvious derived behavior:

    - The tag ids ascend with the names, so reading them in any other order tests
      that the CRUD restores the input order instead of returning id order.
    """
    tags = crud_tag.create_multi(
        db=db_session,
        create_dtos=[
            TagCreate(name=f"Tag {i}", color="#000000", project_id=test_project.id)
            for i in range(5)
        ],
    )
    db_session.commit()

    return {"project": test_project, "tags": tags}
