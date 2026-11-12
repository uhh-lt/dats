"""The steps a project's enabled features need, per doctype: the questions about
features that the pipeline graph answers with the artefacts of the feature
registry.

A document gets the steps that produce the core artefacts and the artefacts of
the enabled features, plus the steps these require. A step whose required
artefacts cannot be produced for the document's doctype is not planned (e.g. the
text steps of an image without image captions)."""

from typing import Iterable

from common.artefact_enum import CORE_ARTEFACTS
from common.doc_type_enum import DocType
from common.feature_enum import Feature
from common.job_type_enum import JobType
from modules.doc_processing.pipeline.pipeline_graph import pipeline_registry
from systems.feature_system.feature_registry import feature_registry


def planned_steps(*, doctype: DocType, features: Iterable[Feature]) -> list[JobType]:
    """The steps to run for a document of this doctype in a project with these
    enabled features, in pipeline order."""
    graph = pipeline_registry.graph()
    return graph.plan(doctype, feature_registry.required_artefacts(features))


def feature_steps(
    *, doctype: DocType, feature: Feature, enabled: Iterable[Feature]
) -> list[JobType]:
    """The steps a document of this doctype needs for the feature, in a project
    with these enabled features (with the feature enabled): the producers of the
    feature's artefacts and the steps they require. Empty if the feature does
    not apply to the doctype (e.g. object detection to text documents)."""
    graph = pipeline_registry.graph()
    features = feature_registry.closure([feature])
    plan = planned_steps(doctype=doctype, features=set(enabled) | features)
    artefacts = feature_registry.required_artefacts(features) - CORE_ARTEFACTS
    if not artefacts or any(graph.producer(doctype, a) not in plan for a in artefacts):
        return []
    return graph.needed_steps(doctype, plan, artefacts)
