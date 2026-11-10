from fastapi.testclient import TestClient

from common.feature_enum import Feature
from systems.feature_system.feature_dto import FeatureRead

# ===========================================================================
# GET ALL FEATURES (/feature) TESTS
# ===========================================================================


def test_get_all_features_lists_every_feature_with_its_requirements(
    client: TestClient,
):
    """Every toggleable feature, in enum order, with a title and the features it
    requires (RAG chat, annotation scaling and concepts over time require
    sentence similarity search, no other feature requires one)."""
    response = client.get("/feature")

    assert response.status_code == 200, response.text
    features = [FeatureRead.model_validate(f) for f in response.json()]
    assert [f.feature for f in features] == list(Feature)
    assert all(f.title for f in features)
    requires = {f.feature: f.requires_features for f in features if f.requires_features}
    assert requires == {
        Feature.RAG_CHAT: [Feature.SENTENCE_SIMILARITY_SEARCH],
        Feature.ANNOTATION_SCALING: [Feature.SENTENCE_SIMILARITY_SEARCH],
        Feature.CONCEPTS_OVER_TIME: [Feature.SENTENCE_SIMILARITY_SEARCH],
    }
