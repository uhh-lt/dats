from enum import Enum


class SDocStatus(str, Enum):
    unfinished_or_erroneous = "unfinished_or_erroneous"
    finished = "finished"  # preprocessing has finished
