import enum


# See https://python-rq.org/docs/jobs/
class JobStatus(str, enum.Enum):
    QUEUED = "queued"
    FINISHED = "finished"
    FAILED = "failed"
    STARTED = "started"
    DEFERRED = "deferred"
    SCHEDULED = "scheduled"
    STOPPED = "stopped"
    CANCELED = "canceled"


class JobPriority(str, enum.Enum):
    LOW = "low"
    DEFAULT = "default"
    HIGH = "high"


class JobTiming(int, enum.Enum):
    TEN_MINUTES = 10 * 60
    ONE_HOUR = 60 * 60
    ONE_DAY = 24 * 60 * 60
    ONE_WEEK = 7 * 24 * 60 * 60
    THIRTY_DAYS = 30 * 24 * 60 * 60
    NINETY_DAYS = 90 * 24 * 60 * 60
    INFINITY = -1


class EndpointGeneration(str, enum.Enum):
    ALL = "all"  # Generate all endpoints
    MINIMAL = "minimal"  # Generate start and get_by_id endpoints
    NONE = "none"  # Do not generate any endpoints
