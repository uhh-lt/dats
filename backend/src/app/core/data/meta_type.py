from enum import Enum

from sqlalchemy import Column

from app.core.data.orm.source_document_metadata import SourceDocumentMetadataORM
from app.core.filters.filtering_operators import FilterOperator


class MetaType(str, Enum):
    STRING = "STRING"
    NUMBER = "NUMBER"
    DATE = "DATE"
    BOOLEAN = "BOOLEAN"
    LIST = "LIST"

    # TODO: was ist der richtige typ?
    def get_metadata_column(self) -> Column:
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
