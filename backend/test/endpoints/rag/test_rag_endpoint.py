import pytest
from fastapi.testclient import TestClient

from feature_test_utils import (
    FeaturelessProject,
    SentenceEmbeddingProject,
    assert_feature_disabled,
    feature_named,
)
from modules.rag.rag_dto import ChatSessionResponse
from pipeline_test_utils import artefact_named
from repos.llm_repo import LLMRepo
from repos.ray.dto.clip import ClipEmbeddingOutput, ClipTextEmbeddingInput
from repos.ray.ray_repo import RayRepo
from systems.feature_system.feature_registry import feature_registry

# ===========================================================================
# RAG SESSION (/projects/{project_id}/rag/session) TESTS
# ===========================================================================


def test_rag_session_is_rejected_when_rag_chat_is_disabled(
    client: TestClient, featureless_project: FeaturelessProject
):
    """A project without RAG chat answers 403 before any LLM call."""
    response = client.post(
        f"/projects/{featureless_project['project'].id}/rag/session",
        params={
            "top_k": 10,
            "threshold": 0.5,
            "model": "default",
        },
        json={"query": "alpha", "sdoc_ids": None},
    )

    assert_feature_disabled(response, "rag_chat")


def test_rag_session_rejects_a_list_query(client: TestClient, test_project):
    """`test_project` enables RAG chat; a list of texts is no query (one text), so the body validation rejects it: 422 for the `query`
    of the body, before any LLM call."""
    response = client.post(
        f"/projects/{test_project.id}/rag/session",
        params={
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


# --- retrieval (the sentence embeddings, without semantic search) -----------
# CLIP and the LLM are external services: the tests replace them and record
# what they were asked.


@pytest.fixture
def stubbed_models(monkeypatch: pytest.MonkeyPatch) -> dict[str, list[str]]:
    """CLIP embeds every text to [1, 0]; the LLM answers "answer" and records
    each user prompt."""
    calls: dict[str, list[str]] = {"clip": [], "prompt": []}

    def embed_text(self, clip_input: ClipTextEmbeddingInput) -> ClipEmbeddingOutput:
        calls["clip"].extend(clip_input.text)
        return ClipEmbeddingOutput(embeddings=[[1.0, 0.0] for _ in clip_input.text])

    def chat(self, model: str, user_prompt: str, **kwargs: object) -> tuple[str, str]:
        calls["prompt"].append(user_prompt)
        return " answer ", "session"

    monkeypatch.setattr(RayRepo, "clip_text_embedding", embed_text)
    monkeypatch.setattr(LLMRepo, "llm_chat_with_session", chat)
    return calls


@pytest.mark.parametrize(
    "sdoc_ids,expected_context",
    [
        # every document: sentence 0 is above the threshold, sentence 1 below
        pytest.param("all", ["Hello world."], id="all-documents"),
        # another document only: nothing of text.txt is retrieved
        pytest.param("other", [], id="other-document"),
    ],
)
def test_rag_session_answers_from_the_nearest_sentences_without_semantic_search(
    client: TestClient,
    sentence_embedding_project: SentenceEmbeddingProject,
    stubbed_models: dict[str, list[str]],
    sdoc_ids: str,
    expected_context: list[str],
):
    """A project with RAG chat but without semantic search: the query is
    embedded by CLIP, the sentences of the selected documents above the
    threshold become the context of the prompt, and the answer is returned."""
    p = sentence_embedding_project
    ids = [] if sdoc_ids == "all" else [p["text"].id + 1000]

    response = client.post(
        f"/projects/{p['project'].id}/rag/session",
        params={
            "top_k": 10,
            "threshold": 0.75,
            "model": "default",
        },
        json={"query": "a greeting", "sdoc_ids": ids},
    )

    assert response.status_code == 200, response.text
    assert ChatSessionResponse.model_validate(response.json()).response == "answer"
    assert stubbed_models["clip"] == ["a greeting"]
    (prompt,) = stubbed_models["prompt"]
    context = prompt.split("Context:\n")[1].split("\n\nQuestion:")[0]
    assert context.splitlines() == expected_context


def test_rag_session_retrieves_nothing_of_a_document_of_another_project(
    client: TestClient,
    sentence_embedding_project: SentenceEmbeddingProject,
    foreign_sentence_embedding_project: SentenceEmbeddingProject,
    stubbed_models: dict[str, list[str]],
):
    """The document filter holds "text.txt" of "Foreign Project", another project
    of the user with the same embeddings: it matches no sentence of the path's
    project, so the context is empty."""
    p = sentence_embedding_project

    response = client.post(
        f"/projects/{p['project'].id}/rag/session",
        params={"top_k": 10, "threshold": 0.75, "model": "default"},
        json={
            "query": "a greeting",
            "sdoc_ids": [foreign_sentence_embedding_project["text"].id],
        },
    )

    assert response.status_code == 200, response.text
    (prompt,) = stubbed_models["prompt"]
    context = prompt.split("Context:\n")[1].split("\n\nQuestion:")[0]
    assert context.splitlines() == []


@pytest.fixture
def stubbed_clip(monkeypatch: pytest.MonkeyPatch) -> None:
    """CLIP embeds every text to [1, 0]; the LLM is not replaced."""

    def embed_text(self, clip_input: ClipTextEmbeddingInput) -> ClipEmbeddingOutput:
        return ClipEmbeddingOutput(embeddings=[[1.0, 0.0] for _ in clip_input.text])

    monkeypatch.setattr(RayRepo, "clip_text_embedding", embed_text)


def test_rag_session_of_another_project_answers_404(
    client: TestClient,
    chat_session_id: str,
    sentence_embedding_project: SentenceEmbeddingProject,
    stubbed_clip: None,
):
    """The session of `test_user` in `test_project` is unknown in "RAG Only",
    another project of the same user: 404."""
    response = client.post(
        f"/projects/{sentence_embedding_project['project'].id}/rag/session",
        params={
            "top_k": 10,
            "threshold": 0.75,
            "model": "default",
            "session_id": chat_session_id,
        },
        json={"query": "a greeting", "sdoc_ids": []},
    )

    assert response.status_code == 404, response.text


def test_rag_session_of_another_user_answers_404(
    other_member_client: TestClient,
    chat_session_id: str,
    test_project,
    stubbed_clip: None,
):
    """The session of `test_user` is unknown to another member of the same
    project: 404."""
    response = other_member_client.post(
        f"/projects/{test_project.id}/rag/session",
        params={
            "top_k": 10,
            "threshold": 0.75,
            "model": "default",
            "session_id": chat_session_id,
        },
        json={"query": "a greeting", "sdoc_ids": []},
    )

    assert response.status_code == 404, response.text


# ===========================================================================
# FEATURE DECLARATION (rag_feature.py)
# ===========================================================================


def test_rag_chat_requires_the_sentence_embeddings():
    """RAG chat requires the sentence embeddings, the only artefact it needs
    besides the core artefacts."""
    assert feature_named("rag_chat").requires_artefacts == {
        artefact_named("sentence_embeddings")
    }
    assert feature_registry.required_artefacts([feature_named("rag_chat")]) == {
        artefact_named("sentence_embeddings")
    }
