"""The coreference clusters of a document: span annotations of the system user
with the code MENTION, one span group "coref" per cluster."""

from core.code.system_codes import SystemCode
from systems.artefact_system.artefact_registry import artefact
from systems.artefact_system.artefact_system_enum import StorageKind

MENTION_CODES = SystemCode("MENTION", "Co-reference mention")

COREFERENCES = artefact(
    "coreferences", kind=StorageKind.ANNOTATIONS, codes=(MENTION_CODES,)
)
