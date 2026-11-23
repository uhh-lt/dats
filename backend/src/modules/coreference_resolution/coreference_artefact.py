"""The coreference clusters of a document: span annotations of the system user
with the code MENTION, one span group "coref" per cluster."""

from core.code.system_codes import SystemCode
from systems.artefact_system.artefact_registry import artefact
from systems.artefact_system.stores.system_annotations_store import SystemSpans

MENTION_CODES = SystemCode("MENTION", "Co-reference mention")

COREFERENCES = artefact(
    "coreferences",
    title="Coreferences",
    store=SystemSpans(MENTION_CODES, group="coref"),
)
