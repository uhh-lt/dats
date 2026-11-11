from enum import Enum
from typing import Iterable


class SDocStatus(int, Enum):
    erroneous = -100
    processing = 0
    finished = 1

    @classmethod
    def of_steps(cls, statuses: Iterable["SDocStatus"]) -> "SDocStatus":
        """The overall status of a document from the status of its planned steps:
        erroneous if any is erroneous, else processing if any is processing, else
        finished (also if no step is planned)."""
        statuses = set(statuses)
        if cls.erroneous in statuses:
            return cls.erroneous
        if cls.processing in statuses:
            return cls.processing
        return cls.finished
