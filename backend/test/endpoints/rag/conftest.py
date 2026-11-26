import pytest

from core.user.user_orm import UserORM
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
