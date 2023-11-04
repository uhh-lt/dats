from enum import Enum


class MetaType(str, Enum):
    string = "string"
    number = "number"
    date = "date"
    list = "list"
