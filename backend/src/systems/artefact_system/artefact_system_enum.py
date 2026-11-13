from enum import StrEnum


class StorageKind(StrEnum):
    """Where an artefact is stored; an own store needs an archive of its own."""

    DOCUMENT_DATA = "document_data"  # the source document data row
    METADATA = "metadata"  # source document metadata
    ANNOTATIONS = "annotations"  # span or bbox annotations with codes
    OWN_STORE = "own_store"  # a table, index or file of its own
