"""Temporary check that the graph answers the step relations as the planner of
`ProjectFeatureService` derives them: the plan, the input steps, the steps after
a step and the steps of a feature. Deleted with the old functions."""

import pytest

from bootstrap import register_jobs
from common.artefact_enum import CORE_ARTEFACTS
from common.doc_type_enum import DocType
from common.feature_enum import Feature
from common.job_type_enum import JobType
from modules.doc_processing.doc_processing_pipeline import _descendants
from modules.doc_processing.pipeline.pipeline_graph import pipeline_registry
from modules.project_features.project_feature_service import (
    ProjectFeatureService,
    _inputs,
    _plan,
)
from systems.feature_system.feature_registry import feature_registry

register_jobs()

FEATURE_SETS = (
    [pytest.param([], id="none")]
    + [pytest.param([f], id=f.value) for f in Feature]
    + [pytest.param(list(Feature), id="all")]
)


@pytest.mark.parametrize("features", FEATURE_SETS)
@pytest.mark.parametrize("doctype", list(DocType), ids=lambda d: d.value)
def test_graph_answers_the_relations_like_the_planner(
    doctype: DocType, features: list[Feature]
):
    graph = pipeline_registry.graph()
    needed = feature_registry.required_artefacts(features)

    plan = _plan(graph, doctype, needed)
    assert graph.plan(doctype, needed) == plan

    old_inputs = _inputs(graph, plan)
    assert {s: set(old_inputs[s]) for s in plan} == {
        s: set(graph.inputs(doctype, s)) for s in plan
    }

    for feature in Feature:
        old = ProjectFeatureService().feature_steps(
            doctype=doctype, feature=feature, enabled=features
        )
        closure = feature_registry.closure([feature])
        feature_plan = graph.plan(
            doctype, feature_registry.required_artefacts(set(features) | closure)
        )
        artefacts = feature_registry.required_artefacts(closure) - CORE_ARTEFACTS
        applies = bool(artefacts) and all(
            graph.producer(doctype, a) in feature_plan for a in artefacts
        )
        new = graph.needed_steps(doctype, feature_plan, artefacts) if applies else []
        assert new == old, feature


@pytest.mark.parametrize("step", list(JobType), ids=lambda s: s.value)
def test_graph_answers_the_descendants_like_the_pipeline(step: JobType):
    graph = pipeline_registry.graph()
    assert graph.descendants([step]) == _descendants([step])
    job_steps = graph.job_steps(graph.job(step))
    assert graph.descendants(job_steps) == _descendants(job_steps)
