from modules.coreference_resolution.coreference_artefact import COREFERENCES
from systems.feature_system.feature_registry import register_feature
from systems.feature_system.feature_system_enum import FeatureArea

COREFERENCE_RESOLUTION = register_feature(
    "coreference_resolution",
    title="Coreference Resolution",
    description="Annotate the mentions of the same entity in German texts and group them.",
    area=FeatureArea.AUTOMATIC_ANNOTATION,
    requires_artefacts={COREFERENCES},
    default_enabled=False,
)
