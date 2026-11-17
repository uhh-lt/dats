"""The artefact `file_metadata`, the metadata read from the uploaded file of
image, audio and video documents, carried by their metadata keys."""

from systems.artefact_system.artefact_registry import artefact

FILE_METADATA = artefact("file_metadata", title="File metadata", always=True)
