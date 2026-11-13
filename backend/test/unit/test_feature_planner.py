"""The feature registry: features -> the features and artefacts they require."""

import pytest

from bootstrap import register_jobs
from common.artefact_enum import CORE_ARTEFACTS, Artefact
from common.doc_type_enum import DocType
from common.feature_enum import Feature
from pipeline_test_utils import all_steps, planned_steps
from systems.feature_system.feature_exceptions import (
    FeatureDeclarationError,
    FeatureStillRequiredError,
)
from systems.feature_system.feature_registry import (
    FeatureDeclaration,
    FeatureRegistry,
    feature_registry,
)
from systems.feature_system.feature_service import FeatureService

register_jobs()


# ===========================================================================
# REQUIRED ARTEFACTS
# ===========================================================================


def test_required_artefacts_are_those_of_the_closure_without_core_artefacts():
    """RAG chat requires sentence similarity search: both need the sentence
    embeddings, and no core artefact is named."""
    artefacts = feature_registry.required_artefacts([Feature.RAG_CHAT])

    assert artefacts == {Artefact.SENTENCE_EMBEDDINGS}
    assert not artefacts & CORE_ARTEFACTS


def test_required_artefacts_of_no_feature_are_none():
    """A project without features demands no artefact; the core artefacts are
    computed anyway."""
    assert feature_registry.required_artefacts([]) == frozenset()


def test_every_feature_requires_an_artefact():
    """Every feature needs at least one artefact besides the core artefacts, so
    its status counts the documents its artefacts apply to."""
    for feature in Feature:
        assert feature_registry.required_artefacts([feature]), feature


@pytest.mark.parametrize("doctype", list(DocType), ids=lambda d: d.value)
def test_all_features_plan_every_step_of_the_doctype(doctype: DocType):
    """All features together (every existing project enables them) plan every
    step of the doctype, in pipeline order: no step is unreachable from the
    features."""
    assert planned_steps(doctype, list(Feature)) == all_steps(doctype)


@pytest.mark.parametrize(
    "feature,artefacts",
    [
        # the search index serves two features
        pytest.param(Feature.FULL_TEXT_SEARCH, {Artefact.ES_INDEX}, id="full-text"),
        pytest.param(
            Feature.SEARCH_ANNOTATE, {Artefact.ES_INDEX}, id="search-annotate"
        ),
        pytest.param(
            Feature.SENTENCE_SIMILARITY_SEARCH,
            {Artefact.SENTENCE_EMBEDDINGS},
            id="sentence-search",
        ),
        pytest.param(
            Feature.IMAGE_SIMILARITY_SEARCH,
            {Artefact.IMAGE_EMBEDDINGS},
            id="image-search",
        ),
        # these require sentence similarity search and need only its artefact
        pytest.param(Feature.RAG_CHAT, {Artefact.SENTENCE_EMBEDDINGS}, id="rag-chat"),
        pytest.param(
            Feature.ANNOTATION_SCALING,
            {Artefact.SENTENCE_EMBEDDINGS},
            id="annotation-scaling",
        ),
        pytest.param(
            Feature.CONCEPTS_OVER_TIME,
            {Artefact.SENTENCE_EMBEDDINGS},
            id="concepts-over-time",
        ),
        pytest.param(
            Feature.TAG_RECOMMENDATION,
            {Artefact.DOCUMENT_EMBEDDINGS},
            id="tag-recommendation",
        ),
        # the word frequencies serve two features
        pytest.param(
            Feature.WORD_FREQUENCY, {Artefact.WORD_FREQUENCIES}, id="word-frequency"
        ),
        pytest.param(
            Feature.DUPLICATE_FINDER,
            {Artefact.WORD_FREQUENCIES},
            id="duplicate-finder",
        ),
        pytest.param(
            Feature.KEYWORD_STATISTICS, {Artefact.KEYWORDS}, id="keyword-statistics"
        ),
        pytest.param(
            Feature.ENTITY_ANNOTATIONS, {Artefact.NER_SPANS}, id="entity-annotations"
        ),
        pytest.param(
            Feature.OBJECT_DETECTION, {Artefact.OBJECT_BBOXES}, id="object-detection"
        ),
    ],
)
def test_a_feature_requires_its_artefacts(feature: Feature, artefacts: set[Artefact]):
    """The artefacts a feature (with the features it requires) needs besides
    the core artefacts."""
    assert feature_registry.required_artefacts([feature]) == artefacts


def test_closure_adds_the_required_features_transitively():
    """RAG chat requires sentence similarity search; full-text search requires
    nothing."""
    assert feature_registry.closure([Feature.RAG_CHAT]) == {
        Feature.RAG_CHAT,
        Feature.SENTENCE_SIMILARITY_SEARCH,
    }
    assert feature_registry.closure([Feature.FULL_TEXT_SEARCH]) == {
        Feature.FULL_TEXT_SEARCH
    }


# ===========================================================================
# ENABLED FEATURES
# ===========================================================================


def test_enabling_a_feature_enables_the_features_it_requires():
    """Enabling RAG chat also enables sentence similarity search."""
    enabled = FeatureService().resolve_enabled_features(requested=[Feature.RAG_CHAT])
    assert enabled == [Feature.SENTENCE_SIMILARITY_SEARCH, Feature.RAG_CHAT]


def test_disabling_a_feature_an_enabled_feature_requires_is_rejected():
    """Sentence similarity search cannot be disabled while RAG chat stays enabled;
    disabling both is fine."""
    current = [Feature.SENTENCE_SIMILARITY_SEARCH, Feature.RAG_CHAT]
    with pytest.raises(FeatureStillRequiredError, match="rag_chat"):
        FeatureService().resolve_enabled_features(
            requested=[Feature.RAG_CHAT], current=current
        )
    assert (
        FeatureService().resolve_enabled_features(requested=[], current=current) == []
    )


def test_every_feature_is_declared():
    """Every Feature is declared once, so `GET /feature` lists all of them."""
    declared = [f.feature for f in FeatureService().read_all()]
    assert declared == list(Feature)


# ===========================================================================
# REGISTRY: STARTUP CHECK
# ===========================================================================


def _registry(*declarations: FeatureDeclaration) -> FeatureRegistry:
    """A registry with the given declarations and all other features declared
    without requirements."""
    registry = FeatureRegistry()
    declared = {d.feature for d in declarations}
    for declaration in declarations:
        registry.register(declaration)
    for feature in Feature:
        if feature not in declared:
            registry.register(_declaration(feature))
    return registry


def _declaration(
    feature: Feature,
    artefacts: set[Artefact] | None = None,
    features: set[Feature] | None = None,
) -> FeatureDeclaration:
    return FeatureDeclaration(
        feature=feature,
        requires_artefacts=frozenset(artefacts or set()),
        requires_features=frozenset(features or set()),
    )


def _problems(registry: FeatureRegistry, produced: set[Artefact]) -> list[str]:
    with pytest.raises(FeatureDeclarationError) as exc_info:
        registry.check(frozenset(produced))
    return exc_info.value.problems


def test_registry_check_fails_on_an_artefact_no_step_produces():
    registry = _registry(
        _declaration(Feature.WORD_FREQUENCY, {Artefact.WORD_FREQUENCIES})
    )
    assert _problems(registry, set(Artefact) - {Artefact.WORD_FREQUENCIES}) == [
        "Feature 'word_frequency' requires artefact 'word_frequencies', which no step produces."
    ]


def test_registry_check_fails_on_a_cycle():
    registry = _registry(
        _declaration(Feature.RAG_CHAT, features={Feature.ANNOTATION_SCALING}),
        _declaration(Feature.ANNOTATION_SCALING, features={Feature.RAG_CHAT}),
    )
    assert _problems(registry, set(Artefact)) == [
        "Feature 'rag_chat' requires itself (cycle).",
        "Feature 'annotation_scaling' requires itself (cycle).",
    ]


def test_registry_check_fails_on_undeclared_features():
    registry = FeatureRegistry()
    registry.register(_declaration(Feature.RAG_CHAT, features={Feature.WORD_FREQUENCY}))
    problems = _problems(registry, set(Artefact))
    assert (
        "Feature 'rag_chat' requires the undeclared feature 'word_frequency'."
        in problems
    )
    assert "Feature 'word_frequency' is not declared with register_feature." in problems


def test_registry_rejects_a_feature_declared_twice():
    registry = FeatureRegistry()
    registry.register(_declaration(Feature.RAG_CHAT))
    with pytest.raises(FeatureDeclarationError, match="declared twice"):
        registry.register(_declaration(Feature.RAG_CHAT))
