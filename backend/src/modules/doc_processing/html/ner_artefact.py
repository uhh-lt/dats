"""The named-entity spans of a document, span annotations of the system user."""

from systems.artefact_system.artefact_registry import artefact
from systems.artefact_system.artefact_system_enum import StorageKind

NER_SPANS = artefact("ner_spans", kind=StorageKind.ANNOTATIONS)
