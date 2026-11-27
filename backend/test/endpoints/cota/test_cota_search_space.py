"""The search space of a concepts over time analysis (`init_search_space`, the
first step of its refinement job): the sentences most similar to the
descriptions of its concepts, read from the sentence embeddings without
semantic search."""

import pytest
from sqlalchemy.orm import Session

from feature_test_utils import SentenceEmbeddingProject
from modules.concept_over_time_analysis.cota_dto import ConceptOverTimeAnalysisRead
from modules.concept_over_time_analysis.refinement_steps.init_search_space import (
    init_search_space,
)
from repos.ray.dto.clip import ClipEmbeddingOutput, ClipTextEmbeddingInput
from repos.ray.ray_repo import RayRepo

# CLIP is an external service: "greeting" embeds like sentence 0, "animal" like
# sentence 1
CONCEPT_EMBEDDINGS = {"greeting": [1.0, 0.0], "animal": [0.0, 1.0]}


@pytest.fixture
def clip_texts(monkeypatch: pytest.MonkeyPatch) -> list[str]:
    """Replaces CLIP text with `CONCEPT_EMBEDDINGS`; records the texts."""
    texts: list[str] = []

    def embed_text(self, clip_input: ClipTextEmbeddingInput) -> ClipEmbeddingOutput:
        texts.extend(clip_input.text)
        return ClipEmbeddingOutput(
            embeddings=[CONCEPT_EMBEDDINGS[t] for t in clip_input.text]
        )

    monkeypatch.setattr(RayRepo, "clip_text_embedding", embed_text)
    return texts


def test_search_space_holds_the_nearest_sentences_of_each_concept(
    db_session: Session,
    embedded_cota: tuple[SentenceEmbeddingProject, ConceptOverTimeAnalysisRead],
    clip_texts: list[str],
):
    """Each concept description is embedded once; each concept finds the
    sentence with its own embedding (certainty 1.0) and not the other one
    (0.5, below the threshold 0.8), so every sentence is in the search space
    once, with its text and the score of the concept that found it."""
    project, cota = embedded_cota

    search_space = init_search_space(db=db_session, cota=cota)

    assert clip_texts == ["greeting", "animal"]
    sdoc_id = project["text"].id
    assert sorted(
        (s.sdoc_id, s.sentence_id, s.text, s.concept_similarities) for s in search_space
    ) == [
        (sdoc_id, 0, "Hello world.", {"c1": pytest.approx(1.0), "c2": 0.0}),
        (sdoc_id, 1, "The cat sits on the mat.", {"c1": 0.0, "c2": pytest.approx(1.0)}),
    ]
