from datetime import datetime
from enum import Enum

from sqlalchemy.orm import QueryableAttribute

from core.metadata.source_document_metadata_orm import SourceDocumentMetadataORM
from systems.search_system.filtering_operators import FilterOperator


class MetaType(str, Enum):
    STRING = "STRING"
    NUMBER = "NUMBER"
    DATE = "DATE"
    BOOLEAN = "BOOLEAN"
    LIST = "LIST"

    def get_metadata_column(
        self,
    ) -> QueryableAttribute[str | int | bool | datetime | list[str] | None]:
        match self:
            case MetaType.STRING:
                return SourceDocumentMetadataORM.str_value
            case MetaType.NUMBER:
                return SourceDocumentMetadataORM.int_value
            case MetaType.DATE:
                return SourceDocumentMetadataORM.date_value
            case MetaType.BOOLEAN:
                return SourceDocumentMetadataORM.boolean_value
            case MetaType.LIST:
                return SourceDocumentMetadataORM.list_value

    def get_filter_operator(self) -> FilterOperator:
        match self:
            case MetaType.STRING:
                return FilterOperator.STRING
            case MetaType.NUMBER:
                return FilterOperator.NUMBER
            case MetaType.DATE:
                return FilterOperator.DATE
            case MetaType.BOOLEAN:
                return FilterOperator.BOOLEAN
            case MetaType.LIST:
                return FilterOperator.LIST

    def is_value_of_type(self, value) -> bool:
        match self:
            case MetaType.STRING:
                return isinstance(value, str)
            case MetaType.NUMBER:
                if isinstance(value, (int, float)):
                    return True
                if isinstance(value, str):
                    try:
                        float(value)
                        return True
                    except ValueError:
                        return False
                return False
            case MetaType.DATE:
                if isinstance(value, datetime):
                    return True
                if isinstance(value, str):
                    from dateutil.parser import parse

                    try:
                        parse(value)
                        return True
                    except Exception:
                        return False
                return False
            case MetaType.BOOLEAN:
                if isinstance(value, bool):
                    return True
                if isinstance(value, str):
                    return value.lower() in {"true", "false", "1", "0"}
                return False
            case MetaType.LIST:
                return isinstance(value, list) and all(
                    isinstance(item, str) for item in value
                )
        return False
