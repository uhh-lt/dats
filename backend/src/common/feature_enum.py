from enum import Enum, StrEnum


class FeatureArea(StrEnum):
    """The area a feature belongs to; features are listed by area, in this
    order, then by title."""

    SEARCH = "Search"
    ANALYSIS = "Analysis"
    AUTOMATIC_ANNOTATION = "Automatic Annotation"


class FeatureStatus(str, Enum):
    """The state of a feature in a project, derived from the step statuses of its
    documents."""

    DISABLED = "disabled"
    COMPUTING = "computing"  # enabled, some documents are still processing
    PARTLY_AVAILABLE = "partly_available"  # enabled, some documents lack the data and nothing runs for them
    FULLY_AVAILABLE = "fully_available"  # enabled, all documents have the data


class FeatureAction(str, Enum):
    """What a user can do with a feature of a project; each is allowed in some
    feature statuses only (`FeatureService`)."""

    ENABLE = "enable"  # turn it on and compute its data for all documents
    COMPLETE = "complete"  # compute its data for the documents that lack it
    DISABLE = "disable"  # turn it off; its computed data stays
