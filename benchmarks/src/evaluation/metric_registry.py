from typing import Any

from evaluation.classification_metrics import (
    MultiLabelClassificationMetrics,
    StandardClassificationMetrics,
    WeightedClassificationMetrics,
)
from evaluation.extractive_qa_metrics import ExtractiveQASquad2Metrics
from evaluation.metric_base import BaseMetricWrapper
from evaluation.span_classification_metrics import SpanClassificationMetrics
from evaluation.template_filling_metrics import TemplateFillingMUC4Metrics

METRIC_REGISTRY: dict[str, type[BaseMetricWrapper[Any, Any]]] = {
    "classification_macro_metrics": StandardClassificationMetrics,
    "classification_weighted_metrics": WeightedClassificationMetrics,
    "multilabel_weighted_metrics": MultiLabelClassificationMetrics,
    "extractive_qa_squad2_metrics": ExtractiveQASquad2Metrics,
    "template_filling_muc4_metrics": TemplateFillingMUC4Metrics,
    "span_classification_metrics": SpanClassificationMetrics,
}


def get_metric_evaluators(
    metric_names: list[str],
) -> list[BaseMetricWrapper[Any, Any]]:
    evaluators: list[BaseMetricWrapper[Any, Any]] = []
    unknown_metrics: list[str] = []

    for name in metric_names:
        metric_class = METRIC_REGISTRY.get(name)
        if metric_class is None:
            unknown_metrics.append(name)
            continue
        evaluators.append(metric_class())

    if unknown_metrics:
        names = ", ".join(unknown_metrics)
        raise ValueError(f"Unknown metric(s): {names}")

    return evaluators
