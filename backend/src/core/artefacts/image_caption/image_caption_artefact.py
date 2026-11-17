"""The artefact `image_caption` of image documents, carried by the metadata key
"caption"."""

from systems.artefact_system.artefact_registry import artefact

IMAGE_CAPTION = artefact("image_caption", title="Image caption", always=True)
