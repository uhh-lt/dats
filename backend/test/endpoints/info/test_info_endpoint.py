from fastapi.testclient import TestClient

from config import conf
from core.info.info_dto import InstanceInfo
from pipeline_test_utils import artefact_named
from systems.feature_system.feature_dto import FeatureRead
from systems.feature_system.feature_registry import Feature, feature_registry
from systems.feature_system.feature_system_enum import FeatureArea

# ===========================================================================
# GET INFO (/info) TESTS
# ===========================================================================


def test_get_info_describes_the_instance_from_the_config(client: TestClient):
    """The instance information comes from the config: the enabled OIDC
    providers and whether the instance is stable."""
    response = client.get("/info")

    assert response.status_code == 200, response.text
    info = InstanceInfo.model_validate(response.json())
    assert info.oidc_provider_names == [x.name for x in conf.auth.oidc if x.enabled]
    assert info.is_oidc_enabled == bool(info.oidc_provider_names)
    assert info.is_stable == conf.api.is_stable


# ===========================================================================
# GET FEATURES (/info/features) TESTS
# ===========================================================================


def _all_features(client: TestClient) -> dict[str, FeatureRead]:
    """The response of `GET /info/features`, in its order, by feature name."""
    response = client.get("/info/features")
    assert response.status_code == 200, response.text
    reads = [FeatureRead.model_validate(f) for f in response.json()]
    return {r.feature: r for r in reads}


def test_get_all_features_lists_every_feature_ordered_by_area_and_title(
    client: TestClient,
):
    """Every registered feature, ordered by the position of its area in
    `FeatureArea`, then by title."""
    features = _all_features(client)

    assert list(features) == feature_registry.names()
    areas = list(FeatureArea)
    keys = [(areas.index(f.area), f.title) for f in features.values()]
    assert keys == sorted(keys)


def test_get_all_features_reports_title_and_default(
    client: TestClient,
):
    """RAG chat reads its title, description and area from its declaration and
    is enabled in a new project."""
    rag = _all_features(client)["rag_chat"]

    assert rag.title == "RAG Chat"
    assert rag.area == FeatureArea.ANALYSIS
    assert rag.description
    assert rag.default_enabled is True


def test_get_all_features_reports_a_feature_off_by_default(
    client: TestClient, off_by_default: Feature
):
    """A feature registered with `default_enabled=False` is listed with the
    flag false."""
    read = _all_features(client)[off_by_default.name]

    assert read.default_enabled is False
    assert read.title == off_by_default.title


def test_get_all_features_lists_the_artefacts_a_feature_computes(
    client: TestClient,
):
    """A feature lists the artefacts it requires besides the core artefacts,
    with their titles: keyword statistics the keywords; semantic search the
    sentence and the image embeddings, ordered by title."""
    features = _all_features(client)

    assert [(a.name, a.title) for a in features["keyword_statistics"].artefacts] == [
        ("keywords", artefact_named("keywords").title)
    ]
    assert [a.name for a in features["semantic_search"].artefacts] == [
        "image_embeddings",
        "sentence_embeddings",
    ]
