from evaluation.artifact_base import BaseArtifactBuilder
from evaluation.classification_artifacts import (
    MultiLabelClassificationReportArtifacts,
    MultiLabelConfusionMatrixArtifacts,
    SingleLabelClassificationReportArtifacts,
    SingleLabelConfusionMatrixArtifacts,
)

ARTIFACT_REGISTRY: dict[str, type[BaseArtifactBuilder]] = {
    "classification_confusion_matrix": SingleLabelConfusionMatrixArtifacts,
    "classification_report": SingleLabelClassificationReportArtifacts,
    "multilabel_confusion_matrices": MultiLabelConfusionMatrixArtifacts,
    "multilabel_classification_report": MultiLabelClassificationReportArtifacts,
}


def get_artifact_builders(
    artifact_names: list[str], label_field: str = "label"
) -> list[BaseArtifactBuilder]:
    builders: list[BaseArtifactBuilder] = []
    unknown_artifacts: list[str] = []

    for name in artifact_names:
        artifact_class = ARTIFACT_REGISTRY.get(name)
        if artifact_class is None:
            unknown_artifacts.append(name)
            continue
        builders.append(artifact_class(label_field=label_field))

    if unknown_artifacts:
        names = ", ".join(unknown_artifacts)
        raise ValueError(f"Unknown artifact(s): {names}")

    return builders
