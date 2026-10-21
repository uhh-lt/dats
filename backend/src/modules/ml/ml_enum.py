from enum import IntEnum, StrEnum


class MLJobType(StrEnum):
    QUOTATION_ATTRIBUTION = "QUOTATION_ATTRIBUTION"
    TAG_RECOMMENDATION = "TAG_RECOMMENDATION"
    COREFERENCE_RESOLUTION = "COREFERENCE_RESOLUTION"
    DOCUMENT_EMBEDDING = "DOCUMENT_EMBEDDING"
    SENTENCE_EMBEDDING = "SENTENCE_EMBEDDING"


class JobType(IntEnum):
    QUOTATION_ATTRIBUTION = 100
    COREFERENCE_RESOLUTION = 101
    DOCUMENT_EMBEDDING = 102
    SENTENCE_EMBEDDING = 103


class JobStatus(IntEnum):
    UNQUEUED = 0  # (not queued/planned)
    WAITING = 1  # (not started yet)
    RUNNING = 2  # (currently in progress)
    FINISHED = 3  # (successfully finished)
    ERROR = 4  # (failed to finish)
    ABORTED = 5  # (aborted by user)
