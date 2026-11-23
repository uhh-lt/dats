"""The artefact `image_caption` of image documents, in the metadata key
"caption"."""

from systems.artefact_system.artefact_registry import artefact
from systems.artefact_system.stores.metadata_value_store import MetadataValue

IMAGE_CAPTION = artefact(
    "image_caption",
    title="Image caption",
    always=True,
    store=MetadataValue("caption"),
)
