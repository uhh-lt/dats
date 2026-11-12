"""The feature registry and the planner: features -> artefacts -> steps per doctype."""

import pytest

from bootstrap import register_jobs
from common.artefact_enum import Artefact
from common.doc_type_enum import DocType
from common.feature_enum import Feature
from common.job_type_enum import JobType
from modules.doc_processing.pipeline.pipeline_graph import pipeline_registry
from modules.doc_processing.pipeline.step_planning import feature_steps, planned_steps
from pipeline_test_utils import all_steps, core_steps
from systems.feature_system.feature_exceptions import (
    FeatureDeclarationError,
    FeatureStillRequiredError,
)
from systems.feature_system.feature_registry import (
    FeatureDeclaration,
    FeatureRegistry,
)
from systems.feature_system.feature_service import FeatureService

register_jobs()

ALL_FEATURES = list(Feature)


def _planned(doctype: DocType, features: list[Feature]) -> list[JobType]:
    return planned_steps(doctype=doctype, features=features)


# ===========================================================================
# PLANNER: STEPS PER DOCTYPE
# ===========================================================================


@pytest.mark.parametrize("doctype", list(DocType), ids=lambda d: d.value)
def test_all_features_plan_the_steps_documents_get_today(doctype: DocType):
    """A project with all features enabled (every existing project) plans every
    step of the doctype, in pipeline order, as before the feature toggles."""
    assert _planned(doctype, ALL_FEATURES) == pipeline_registry.graph().steps(doctype)


@pytest.mark.parametrize("doctype", list(DocType), ids=lambda d: d.value)
def test_minimal_project_plans_only_the_core_steps(doctype: DocType):
    """A project without features plans only the steps of the core artefacts;
    no Elasticsearch index, embeddings, keywords, word frequencies, entities,
    captions or object detection."""
    assert _planned(doctype, []) == core_steps(doctype)


@pytest.mark.parametrize(
    "doctype,feature,added_steps",
    [
        # the spaCy outputs are steps of their own
        pytest.param(
            DocType.text,
            Feature.KEYWORD_STATISTICS,
            [JobType.TEXT_KEYWORDS],
            id="text-keywords",
        ),
        pytest.param(
            DocType.text,
            Feature.ENTITY_ANNOTATIONS,
            [JobType.TEXT_NER],
            id="text-entities",
        ),
        # word frequency analysis and the duplicate finder share one artefact
        pytest.param(
            DocType.audio,
            Feature.DUPLICATE_FINDER,
            [JobType.TEXT_WORD_FREQUENCY],
            id="audio-duplicate-finder",
        ),
        pytest.param(
            DocType.text,
            Feature.FULL_TEXT_SEARCH,
            [JobType.TEXT_ES_INDEX],
            id="text-full-text-search",
        ),
        pytest.param(
            DocType.video,
            Feature.TAG_RECOMMENDATION,
            [JobType.TEXT_DOCUMENT_EMBEDDING],
            id="video-tag-recommendation",
        ),
        pytest.param(
            DocType.image,
            Feature.OBJECT_DETECTION,
            [JobType.IMAGE_OBJECT_DETECTION],
            id="image-object-detection",
        ),
        pytest.param(
            DocType.image,
            Feature.IMAGE_SIMILARITY_SEARCH,
            [JobType.IMAGE_EMBEDDING],
            id="image-similarity-search",
        ),
        # a feature-to-feature requirement: RAG chat needs sentence embeddings
        pytest.param(
            DocType.text,
            Feature.RAG_CHAT,
            [JobType.TEXT_SENTENCE_EMBEDDING],
            id="text-rag-chat",
        ),
        # features of another doctype add nothing
        pytest.param(DocType.text, Feature.OBJECT_DETECTION, [], id="text-objects"),
    ],
)
def test_a_feature_adds_the_steps_of_its_artefacts(
    doctype: DocType, feature: Feature, added_steps: list[JobType]
):
    """Enabling one feature in a minimal project adds exactly the steps that
    produce its artefacts."""
    planned = _planned(doctype, [feature])
    assert set(planned) - set(core_steps(doctype)) == set(added_steps)
    assert set(core_steps(doctype)) <= set(planned)


def test_image_text_steps_need_image_captions():
    """An image has text only with a caption: without image captions, the text
    steps a feature needs are not planned, with them they are."""
    assert _planned(DocType.image, [Feature.SENTENCE_SIMILARITY_SEARCH]) == (
        core_steps(DocType.image)
    )
    # the caption, then the core steps of the image and of the caption's text
    text_core_steps = [
        s for s in core_steps(DocType.text) if s in all_steps(DocType.image)
    ]
    assert _planned(DocType.image, [Feature.IMAGE_CAPTIONS]) == [
        s
        for s in all_steps(DocType.image)
        if s == JobType.IMAGE_CAPTION
        or s in core_steps(DocType.image)
        or s in text_core_steps
    ]
    assert JobType.TEXT_SENTENCE_EMBEDDING in _planned(
        DocType.image, [Feature.IMAGE_CAPTIONS, Feature.SENTENCE_SIMILARITY_SEARCH]
    )


# ===========================================================================
# PLANNER: STEPS PER FEATURE (COVERAGE)
# ===========================================================================


def test_feature_steps_are_its_producers_and_the_steps_they_require():
    """The steps of RAG chat on a text document: the sentence embeddings and the
    steps before them; not the HTML mapping, which it does not need."""
    steps = feature_steps(doctype=DocType.text, feature=Feature.RAG_CHAT, enabled=[])
    assert steps == [
        JobType.EXTRACT_HTML,
        JobType.TEXT_EXTRACTION,
        JobType.TEXT_LANGUAGE_DETECTION,
        JobType.TEXT_SPACY,
        JobType.TEXT_SENTENCE_EMBEDDING,
    ]


def test_feature_steps_of_images_depend_on_the_enabled_image_captions():
    """Sentence similarity search applies to images only in projects that
    caption them."""
    feature = Feature.SENTENCE_SIMILARITY_SEARCH
    assert feature_steps(doctype=DocType.image, feature=feature, enabled=[]) == []
    assert feature_steps(
        doctype=DocType.image, feature=feature, enabled=[Feature.IMAGE_CAPTIONS]
    )[-1] == (JobType.TEXT_SENTENCE_EMBEDDING)


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
