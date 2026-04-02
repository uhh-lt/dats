from evaluation.base import BaseMetricWrapper
from evaluation.classification import StandardClassificationMetrics

METRIC_REGISTRY: dict[str, type[BaseMetricWrapper]] = {
    "classification_macro_metrics": StandardClassificationMetrics,
}


def get_metric_evaluators(
    metric_names: list[str], label_field: str = "label"
) -> list[BaseMetricWrapper]:
    evaluators: list[BaseMetricWrapper] = []
    unknown_metrics: list[str] = []

    for name in metric_names:
        metric_class = METRIC_REGISTRY.get(name)
        if metric_class is None:
            unknown_metrics.append(name)
            continue
        evaluators.append(metric_class(label_field=label_field))

    if unknown_metrics:
        names = ", ".join(unknown_metrics)
        raise ValueError(f"Unknown metric(s): {names}")

    return evaluators
