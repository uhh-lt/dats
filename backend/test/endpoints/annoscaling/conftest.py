from typing import TypedDict

import pytest

from core.code.code_crud import crud_code
from core.code.code_dto import CodeCreate
from core.code.code_orm import CodeORM
from core.user.user_orm import UserORM
from dats_test_utils import create_span_for_text
from feature_test_utils import (
    FeaturelessProject,
    SentenceEmbeddingProject,
    create_featureless_project,
    create_sentence_embedding_project,
)


@pytest.fixture(scope="function")
def featureless_project(db_session, test_user: UserORM) -> FeaturelessProject:
    """
    This fixture sets up the following project, in addition to `test_project`
    (which enables the features that are on by default):

    - project: "Featureless Project" of `test_user`, without any enabled feature
    - sdoc: text document "text_done.txt" in it, with the steps of a project
      without features finished
    """
    return create_featureless_project(db_session, test_user)


class AnnotatedScalingProject(TypedDict):
    """
    The project of `SentenceEmbeddingProject`, "Scaling Annotated", which
    enables only annotation scaling (not semantic search), plus:

    - accept: user code "ACCEPT" of the project
    - reject: user code "REJECT" of the project
    - `test_user` annotated "Hello world." (sentence 0 of `text`) with ACCEPT

    Non-obvious derived behavior:

    - The suggestions start from the annotated sentence 0: its nearest
      sentence other than itself is sentence 1 ("The cat sits on the mat.").
    """

    project: SentenceEmbeddingProject
    accept: CodeORM
    reject: CodeORM


@pytest.fixture(scope="function")
def annotated_scaling_project(
    db_session, test_user: UserORM
) -> AnnotatedScalingProject:
    """See `AnnotatedScalingProject`."""
    project = create_sentence_embedding_project(
        db_session,
        test_user,
        title="Scaling Annotated",
        features=["annotation_scaling"],
    )
    project_id = project["project"].id
    accept, reject = (
        crud_code.create(
            db=db_session,
            create_dto=CodeCreate(
                name=name,
                color="#ff0000",
                description="",
                project_id=project_id,
                is_system=False,
                enabled=True,
            ),
        )
        for name in ("ACCEPT", "REJECT")
    )
    create_span_for_text(
        db_session,
        sdoc=project["text"],
        text="Hello world.",
        code_id=accept.id,
        user_id=test_user.id,
    )
    db_session.commit()
    return {"project": project, "accept": accept, "reject": reject}
