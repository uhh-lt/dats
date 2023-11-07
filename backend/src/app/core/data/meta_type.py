from enum import Enum
from typing import Union

from app.core.data.orm.source_document_fact import SourceDocumentFactORM
from sqlalchemy import Column


class MetaType(str, Enum):
    STRING = "STRING"
    NUMBER = "NUMBER"
    DATE = "DATE"
    BOOLEAN = "BOOLEAN"
    LIST = "LIST"

    def is_correct_type(self, value: Union[str, int, bool, list]) -> bool:
        match self:
            case MetaType.STRING:
                return isinstance(value, str)
            case MetaType.NUMBER:
                return isinstance(value, int)
            case MetaType.DATE:
                return isinstance(value, str)
            case MetaType.BOOLEAN:
                return isinstance(value, bool)
            case MetaType.LIST:
                return isinstance(value, list)

    def get_metadata_column(self) -> Column:
        match self:
            case MetaType.STRING:
                return SourceDocumentFactORM.string_value
            case MetaType.NUMBER:
                return SourceDocumentFactORM.int_value
            case MetaType.DATE:
                return SourceDocumentFactORM.date_value
            case MetaType.BOOLEAN:
                return SourceDocumentFactORM.boolean_value
            case MetaType.LIST:
                return SourceDocumentFactORM.list_value
