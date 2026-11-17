"""The artefact `image_caption` of image documents, carried by the metadata key
"caption"."""

from systems.artefact_system.artefact_registry import artefact
from systems.artefact_system.artefact_system_enum import StorageKind

IMAGE_CAPTION = artefact("image_caption", kind=StorageKind.METADATA, always=True)
