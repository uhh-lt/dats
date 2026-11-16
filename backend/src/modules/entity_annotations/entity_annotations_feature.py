from common.feature_enum import FeatureArea
from modules.entity_annotations.ner_artefact import NER_SPANS
from systems.feature_system.feature_registry import register_feature

ENTITY_ANNOTATIONS = register_feature(
    "entity_annotations",
    title="Automatic Entity Annotations",
    description="Annotate named entities (persons, organizations, places, ...) in all text automatically.",
    area=FeatureArea.AUTOMATIC_ANNOTATION,
    requires_artefacts={NER_SPANS},
)
