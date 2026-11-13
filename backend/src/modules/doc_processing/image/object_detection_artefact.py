"""The object boxes of an image, bbox annotations of the system user."""

from systems.artefact_system.artefact_registry import artefact
from systems.artefact_system.artefact_system_enum import StorageKind

OBJECT_BBOXES = artefact("object_bboxes", kind=StorageKind.ANNOTATIONS)
