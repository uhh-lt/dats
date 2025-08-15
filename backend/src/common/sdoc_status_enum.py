from enum import Enum


class SDocStatus(int, Enum):
    erroneous = -100
    processing = 0
    finished = 1
