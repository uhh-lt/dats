from enum import Enum


class TableType(str, Enum):
    custom = "custom"
    situation = "situation"
    phenomenon = "phenomenon"
    interpretation = "interpretation"
