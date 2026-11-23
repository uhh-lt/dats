"""The artefact `language`, every document's language, in the metadata key
"language"."""

from systems.artefact_system.artefact_registry import artefact
from systems.artefact_system.stores.metadata_value_store import MetadataValue

LANGUAGE = artefact(
    "language", title="Language", always=True, store=MetadataValue("language")
)
