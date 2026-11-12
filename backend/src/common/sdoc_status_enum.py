from enum import Enum


class SDocStatus(int, Enum):
    """The status of a pipeline step of a document, and the overall status of a
    document derived from them (`source_document_status_rules`)."""

    erroneous = -100
    processing = 0
    finished = 1


class StepSetStatus(str, Enum):
    """The status of a set of steps (the steps of a feature) for one document
    (`source_document_status_rules.step_set_status`)."""

    processing = "processing"
    failed = "failed"
    not_planned = "not_planned"
    ready = "ready"
