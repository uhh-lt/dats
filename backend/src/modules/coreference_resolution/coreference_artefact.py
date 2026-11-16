"""The coreference clusters of a document: span annotations of the system user
with the code MENTION, one span group "coref" per cluster."""

from core.code.system_codes import MENTION_CODES
from systems.artefact_system.artefact_registry import artefact
from systems.artefact_system.artefact_system_enum import StorageKind

COREFERENCES = artefact(
    "coreferences", kind=StorageKind.ANNOTATIONS, codes=(MENTION_CODES,)
)
