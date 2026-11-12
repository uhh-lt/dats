from enum import Enum


class SDocStatus(int, Enum):
    """The status of a pipeline step of a document, and the overall status of a
    document derived from them (`source_document_status_rules`)."""

    erroneous = -100
    processing = 0
    finished = 1
