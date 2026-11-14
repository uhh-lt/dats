"""The feature registry: features -> the features and artefacts they require."""

import pytest

from bootstrap import register_jobs
from common.doc_type_enum import DocType
from common.feature_enum import FeatureArea
from feature_test_utils import feature_named
from pipeline_test_utils import all_steps, artefact_named, planned_steps
from systems.artefact_system.artefact_registry import Artefact, artefact_registry
from systems.feature_system.feature_exceptions import (
    FeatureDeclarationError,
    FeatureStillRequiredError,
)
from systems.feature_system.feature_registry import (
    Feature,
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
    artefacts = feature_registry.required_artefacts([feature_named("rag_chat")])

    assert artefacts == {artefact_named("sentence_embeddings")}
    assert not artefacts & artefact_registry.always()


def test_required_artefacts_of_no_feature_are_none():
    """A project without features demands no artefact; the core artefacts are
    computed anyway."""
    assert feature_registry.required_artefacts([]) == frozenset()


def test_every_feature_requires_an_artefact():
    """Every feature needs at least one artefact besides the core artefacts, so
    its status counts the documents its artefacts apply to."""
    for feature in feature_registry.declarations():
        assert feature_registry.required_artefacts([feature]), feature.name


@pytest.mark.parametrize("doctype", list(DocType), ids=lambda d: d.value)
def test_all_features_plan_every_step_of_the_doctype(doctype: DocType):
    """All features together (every existing project enables them) plan every
    step of the doctype, in pipeline order: no step is unreachable from the
    features."""
    assert planned_steps(doctype, feature_registry.names()) == all_steps(doctype)


def test_all_features_together_require_every_on_demand_artefact():
    """Every artefact that is neither always computed nor uploaded is required by
    some feature."""
    required = feature_registry.required_artefacts(feature_registry.declarations())

    assert required == {
        a for a in artefact_registry.artefacts() if not a.always and not a.uploaded_for
    }


def test_closure_adds_the_required_features_transitively():
    """RAG chat requires sentence similarity search; full-text search requires
    nothing."""
    rag = feature_named("rag_chat")
    full_text = feature_named("full_text_search")

    assert feature_registry.closure([rag]) == {
        rag,
        feature_named("sentence_similarity_search"),
    }
    assert feature_registry.closure([full_text]) == {full_text}


# ===========================================================================
# REGISTRY: LOOKUP AND ORDER
# ===========================================================================


def test_a_feature_is_found_by_its_name():
    """The registry finds a feature by its text name; an unknown name is None."""
    assert feature_named("rag_chat").name == "rag_chat"
    assert feature_registry.feature("no_such_feature") is None


def test_declarations_are_ordered_by_area_and_title():
    """The features are ordered by the position of their area in `FeatureArea`,
    then by title, and `names()` follows that order."""
    areas = list(FeatureArea)
    declarations = feature_registry.declarations()

    keys = [(areas.index(f.area), f.title) for f in declarations]
    assert keys == sorted(keys)
    assert feature_registry.names() == [f.name for f in declarations]


def test_defaults_are_the_features_a_new_project_enables(off_by_default: Feature):
    """`defaults()` lists the features with `default_enabled`, in the order of
    the declarations; a feature off by default is not among them."""
    assert feature_registry.defaults() == [
        f for f in feature_registry.declarations() if f.default_enabled
    ]
    assert off_by_default not in feature_registry.defaults()
    assert off_by_default in feature_registry.declarations()


# ===========================================================================
# ENABLED FEATURES
# ===========================================================================


def test_enabling_a_feature_enables_the_features_it_requires():
    """Enabling RAG chat also enables sentence similarity search; the result is
    sorted by name."""
    enabled = FeatureService().resolve_enabled_features(
        requested=[feature_named("rag_chat")]
    )
    assert [f.name for f in enabled] == ["rag_chat", "sentence_similarity_search"]


def test_disabling_a_feature_an_enabled_feature_requires_is_rejected():
    """Sentence similarity search cannot be disabled while RAG chat stays enabled;
    disabling both is fine."""
    rag = feature_named("rag_chat")
    current = [feature_named("sentence_similarity_search"), rag]
    with pytest.raises(FeatureStillRequiredError, match="rag_chat"):
        FeatureService().resolve_enabled_features(requested=[rag], current=current)
    assert (
        FeatureService().resolve_enabled_features(requested=[], current=current) == []
    )


# ===========================================================================
# REGISTRY: STARTUP CHECK
# ===========================================================================


def _feature(
    name: str,
    artefacts: set[Artefact] | None = None,
    features: set[Feature] | None = None,
) -> Feature:
    return Feature(
        name=name,
        title=name,
        description="",
        area=FeatureArea.ANALYSIS,
        requires_artefacts=frozenset(artefacts or set()),
        requires_features=frozenset(features or set()),
        default_enabled=True,
    )


def _problems(registry: FeatureRegistry, produced: set[Artefact]) -> list[str]:
    with pytest.raises(FeatureDeclarationError) as exc_info:
        registry.check(frozenset(produced))
    return exc_info.value.problems


def test_registry_check_fails_on_an_artefact_no_step_produces():
    registry = FeatureRegistry()
    registry.register(_feature("word_frequency", {artefact_named("word_frequencies")}))
    assert _problems(
        registry,
        set(artefact_registry.artefacts()) - {artefact_named("word_frequencies")},
    ) == [
        "Feature 'word_frequency' requires artefact 'word_frequencies', which is not registered."
    ]


def test_registry_check_fails_on_a_cycle():
    """`register_feature` cannot build a cycle, as a feature requires objects
    that exist before it; the check still rejects one (built by hand)."""
    rag = _feature("rag_chat")
    scaling = _feature("annotation_scaling", features={rag})
    object.__setattr__(rag, "requires_features", frozenset({scaling}))
    registry = FeatureRegistry()
    registry.register(rag)
    registry.register(scaling)

    assert _problems(registry, set(artefact_registry.artefacts())) == [
        "Feature 'rag_chat' requires itself (cycle).",
        "Feature 'annotation_scaling' requires itself (cycle).",
    ]


def test_registry_check_fails_on_an_unregistered_required_feature():
    """A required feature that is not the registered object of its name is
    rejected."""
    registry = FeatureRegistry()
    registry.register(_feature("rag_chat", features={_feature("word_frequency")}))

    assert _problems(registry, set(artefact_registry.artefacts())) == [
        "Feature 'rag_chat' requires the undeclared feature 'word_frequency'."
    ]


def test_registry_rejects_a_feature_declared_twice():
    registry = FeatureRegistry()
    registry.register(_feature("rag_chat"))
    with pytest.raises(FeatureDeclarationError, match="declared twice"):
        registry.register(_feature("rag_chat"))
