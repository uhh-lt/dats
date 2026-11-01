from enum import Enum


class ExperimentRunLogFormat(str, Enum):
    """The file format of an exported run log."""

    JSON = "json"
    CSV = "csv"
