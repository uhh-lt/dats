from fastapi.testclient import TestClient

from feature_test_utils import (
    FeaturelessProject,
    assert_feature_disabled,
    feature_named,
)
from pipeline_test_utils import artefact_named
from systems.feature_system.feature_registry import feature_registry

# ===========================================================================
# RAG SESSION (/rag/rag_session) TESTS
# ===========================================================================


def test_rag_session_is_rejected_when_rag_chat_is_disabled(
    client: TestClient, featureless_project: FeaturelessProject
):
    """A project without RAG chat answers 403 before any LLM call."""
    response = client.post(
        "/rag/rag_session",
        params={
            "project_id": featureless_project["project"].id,
            "top_k": 10,
            "threshold": 0.5,
            "model": "default",
        },
        json={"query": "alpha", "sdoc_ids": None},
    )

    assert_feature_disabled(response, "rag_chat")


def test_rag_session_rejects_a_list_query(client: TestClient, test_project):
    """`test_project` enables RAG chat; a list of texts is no query (one text or
    the id of an image), so the body validation rejects it: 422 for the `query`
    of the body, before any LLM call."""
    response = client.post(
        "/rag/rag_session",
        params={
            "project_id": test_project.id,
            "top_k": 10,
            "threshold": 0.5,
            "model": "default",
        },
        json={"query": ["alpha", "beta"], "sdoc_ids": []},
    )

    assert response.status_code == 422, response.text
    locations = [error["loc"] for error in response.json()["detail"]]
    assert locations, response.text
    assert all(loc[:2] == ["body", "query"] for loc in locations), locations


# ===========================================================================
# FEATURE DECLARATION (rag_feature.py)
# ===========================================================================


def test_rag_chat_builds_on_sentence_similarity_search():
    """RAG chat requires sentence similarity search and needs only its sentence
    embeddings besides the core artefacts."""
    assert {f.name for f in feature_named("rag_chat").requires_features} == {
        "sentence_similarity_search"
    }
    assert feature_registry.required_artefacts([feature_named("rag_chat")]) == {
        artefact_named("sentence_embeddings")
    }
