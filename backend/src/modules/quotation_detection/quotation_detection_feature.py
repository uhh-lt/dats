from common.feature_enum import FeatureArea
from modules.quotation_detection.quotation_artefact import QUOTATIONS
from systems.feature_system.feature_registry import register_feature

QUOTATION_DETECTION = register_feature(
    "quotation_detection",
    title="Quotation Detection",
    description="Annotate the quotations in German text documents with their type, speaker, addressee, cue and frame.",
    area=FeatureArea.AUTOMATIC_ANNOTATION,
    requires_artefacts={QUOTATIONS},
    default_enabled=False,
)
