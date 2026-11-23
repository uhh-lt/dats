"""The artefact `file_metadata`, the metadata read from the uploaded file of
image, audio and video documents, in their metadata keys."""

from systems.artefact_system.artefact_registry import artefact
from systems.artefact_system.stores.metadata_value_store import MetadataValue

FILE_METADATA = artefact(
    "file_metadata",
    title="File metadata",
    always=True,
    store=MetadataValue(
        # images
        "width",
        "height",
        "format",
        "mode",
        # audio and video (ffprobe), and width and height of a video
        "duration",
        "format_name",
        "format_long_name",
        "size",
        "bit_rate",
        "tags",
    ),
)
