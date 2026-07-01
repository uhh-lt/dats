from typing import Any

from evaluation.artifact_base import BaseArtifactBuilder
from evaluation.classification_artifacts import (
    MultiLabelClassificationReportArtifacts,
    MultiLabelConfusionMatrixArtifacts,
    SingleLabelClassificationReportArtifacts,
    SingleLabelConfusionMatrixArtifacts,
)
from evaluation.sequential_sentence_classification_artifacts import (
    SequentialSentenceClassificationReportArtifacts,
)
from evaluation.span_classification_artifacts import SpanClassificationReportArtifacts

ARTIFACT_REGISTRY: dict[str, type[BaseArtifactBuilder[Any, Any]]] = {
    "classification_confusion_matrix": SingleLabelConfusionMatrixArtifacts,
    "classification_report": SingleLabelClassificationReportArtifacts,
    "multilabel_confusion_matrices": MultiLabelConfusionMatrixArtifacts,
    "multilabel_classification_report": MultiLabelClassificationReportArtifacts,
    "span_classification_report": SpanClassificationReportArtifacts,
    "sequential_sentence_classification_report": SequentialSentenceClassificationReportArtifacts,
}


def get_artifact_builders(
    artifact_names: list[str],
) -> list[BaseArtifactBuilder[Any, Any]]:
    builders: list[BaseArtifactBuilder[Any, Any]] = []
    unknown_artifacts: list[str] = []

    for name in artifact_names:
        artifact_class = ARTIFACT_REGISTRY.get(name)
        if artifact_class is None:
            unknown_artifacts.append(name)
            continue
        builders.append(artifact_class())

    if unknown_artifacts:
        names = ", ".join(unknown_artifacts)
        raise ValueError(f"Unknown artifact(s): {names}")

    return builders
