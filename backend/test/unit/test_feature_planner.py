"""The feature registry: features -> the artefacts they require."""

import pytest

from bootstrap import register_jobs
from common.doc_type_enum import DocType
from common.feature_enum import FeatureArea
from feature_test_utils import feature_named
from pipeline_test_utils import all_steps, artefact_named, planned_steps
from systems.artefact_system.artefact_registry import Artefact, artefact_registry
from systems.feature_system.feature_exceptions import FeatureDeclarationError
from systems.feature_system.feature_registry import (
    Feature,
    FeatureRegistry,
    feature_registry,
)

register_jobs()


# ===========================================================================
# REQUIRED ARTEFACTS
# ===========================================================================


def test_required_artefacts_are_those_of_the_features_without_core_artefacts():
    """RAG chat needs the sentence embeddings, and no core artefact is named."""
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
# REGISTRY: STARTUP CHECK
# ===========================================================================


def _feature(name: str, artefacts: set[Artefact]) -> Feature:
    return Feature(
        name=name,
        title=name,
        description="",
        area=FeatureArea.ANALYSIS,
        requires_artefacts=frozenset(artefacts),
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


def test_registry_check_fails_on_a_feature_without_an_on_demand_artefact():
    """A feature that requires only core artefacts (or none) needs no processing
    and is not toggleable; all problems come in one error."""
    registry = FeatureRegistry()
    registry.register(_feature("search", {artefact_named("content")}))
    registry.register(_feature("nothing", set()))
    registry.register(
        _feature(
            "rag_chat",
            {artefact_named("sentence_embeddings"), artefact_named("content")},
        )
    )

    assert _problems(registry, set(artefact_registry.artefacts())) == [
        "Feature 'search' requires no artefact besides the core artefacts; it needs no processing and must not be a feature.",
        "Feature 'nothing' requires no artefact besides the core artefacts; it needs no processing and must not be a feature.",
    ]


def test_registry_rejects_a_feature_declared_twice():
    registry = FeatureRegistry()
    registry.register(_feature("rag_chat", {artefact_named("sentence_embeddings")}))
    with pytest.raises(FeatureDeclarationError, match="declared twice"):
        registry.register(_feature("rag_chat", {artefact_named("sentence_embeddings")}))
