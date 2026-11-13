from fastapi.testclient import TestClient

from common.feature_enum import Feature
from feature_test_utils import FeaturelessProject, assert_feature_disabled

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

    assert_feature_disabled(response, Feature.RAG_CHAT)
