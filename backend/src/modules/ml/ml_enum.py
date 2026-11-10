from enum import IntEnum, StrEnum


class MLJobType(StrEnum):
    QUOTATION_ATTRIBUTION = "QUOTATION_ATTRIBUTION"
    TAG_RECOMMENDATION = "TAG_RECOMMENDATION"
    COREFERENCE_RESOLUTION = "COREFERENCE_RESOLUTION"


class MLJobTypeID(IntEnum):
    """Integer ID of an MLJobType in SourceDocumentJobStatusORM.type."""

    QUOTATION_ATTRIBUTION = 100
    COREFERENCE_RESOLUTION = 101
    # 102 and 103 were the document and sentence embeddings, now pipeline steps


class MLJobStatus(IntEnum):
    """Status of an ML job for one document (SourceDocumentJobStatusORM.status)."""

    UNQUEUED = 0  # (not queued/planned)
    WAITING = 1  # (not started yet)
    RUNNING = 2  # (currently in progress)
    FINISHED = 3  # (successfully finished)
    ERROR = 4  # (failed to finish)
    ABORTED = 5  # (aborted by user)
