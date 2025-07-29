from datetime import datetime
from enum import Enum

from core.metadata.source_document_metadata_orm import SourceDocumentMetadataORM
from sqlalchemy.orm import QueryableAttribute
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
