from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from core.project.project_orm import ProjectORM
from core.project.project_service import ProjectService
from core.user.user_crud import crud_user
from core.user.user_dto import UserCreate
from core.user.user_orm import UserORM
from dats_test_utils import create_user_client
from feature_test_utils import (
    FeaturelessProject,
    SentenceEmbeddingProject,
    create_featureless_project,
    create_sentence_embedding_project,
)
from repos.llm_repo import LLMRepo


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


@pytest.fixture(scope="function")
def sentence_embedding_project(
    db_session, test_user: UserORM
) -> SentenceEmbeddingProject:
    """The project of `SentenceEmbeddingProject`, "RAG Only", which enables
    only rag_chat (not semantic search)."""
    return create_sentence_embedding_project(
        db_session, test_user, title="RAG Only", features=["rag_chat"]
    )


@pytest.fixture(scope="function")
def foreign_sentence_embedding_project(
    db_session, test_user: UserORM
) -> SentenceEmbeddingProject:
    """The project of `SentenceEmbeddingProject`, "Foreign Project", without
    features: another project of the user with the same embedded document."""
    return create_sentence_embedding_project(
        db_session, test_user, title="Foreign Project", features=[]
    )


@pytest.fixture(scope="function")
def chat_session_id(test_user: UserORM, test_project: ProjectORM) -> str:
    """A chat session without messages of `test_user` in `test_project` (which
    enables RAG chat)."""
    return LLMRepo()._start_llm_chat_session(
        project_id=test_project.id, user_id=test_user.id
    )


@pytest.fixture(scope="function")
def other_member_client(
    db_session, app_client: TestClient, test_project: ProjectORM
) -> Generator[TestClient, None, None]:
    """A client of "Other Member", a second member of `test_project`."""
    user = crud_user.create(
        db=db_session,
        create_dto=UserCreate(
            email="other.member@dats.org",
            first_name="Other",
            last_name="Member",
            password="OtherMember123",
        ),
    )
    ProjectService().associate_user(
        db=db_session, project_id=test_project.id, user_id=user.id
    )
    db_session.commit()
    c = create_user_client(app_client, user)
    yield c
    c.close()
