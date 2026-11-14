from fastapi.testclient import TestClient

from feature_test_utils import FeaturelessProject, assert_feature_disabled
from modules.doc_processing.artefacts import SENTENCE_EMBEDDINGS
from modules.rag.rag_feature import RAG_CHAT
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


# ===========================================================================
# FEATURE DECLARATION (rag_feature.py)
# ===========================================================================


def test_rag_chat_builds_on_sentence_similarity_search():
    """RAG chat requires sentence similarity search and needs only its sentence
    embeddings besides the core artefacts."""
    assert {f.name for f in RAG_CHAT.requires_features} == {
        "sentence_similarity_search"
    }
    assert feature_registry.required_artefacts([RAG_CHAT]) == {SENTENCE_EMBEDDINGS}
