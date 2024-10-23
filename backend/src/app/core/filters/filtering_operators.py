from enum import Enum

from sqlalchemy import not_
from sqlalchemy.orm import QueryableAttribute

from app.core.filters.types import FilterValue


class FilterValueType(Enum):
    SDOC_ID = "SDOC_ID"
    CODE_ID = "CODE_ID"
    USER_ID = "USER_ID"
    TAG_ID = "TAG_ID"
    SPAN_ANNOTATION = "SPAN_ANNOTATION"
    DOC_TYPE = "DOC_TYPE"
    INFER_FROM_OPERATOR = "INFER_FROM_OPERATOR"


class FilterOperator(Enum):
    BOOLEAN = "BOOLEAN"
    STRING = "STRING"
    ID = "ID"
    NUMBER = "NUMBER"
    ID_LIST = "ID_LIST"
    LIST = "LIST"
    DATE = "DATE"


class BooleanOperator(Enum):
    EQUALS = "BOOLEAN_EQUALS"
    NOT_EQUALS = "BOOLEAN_NOT_EQUALS"

    def apply(self, column: QueryableAttribute, value: FilterValue):
        if not isinstance(value, bool):
            raise ValueError("Invalid value type for BooleanOperator (requires bool)!")

        match self:
            case BooleanOperator.EQUALS:
                return column == value
            case BooleanOperator.NOT_EQUALS:
                return column != value


class StringOperator(Enum):
    CONTAINS = "STRING_CONTAINS"
    EQUALS = "STRING_EQUALS"
    NOT_EQUALS = "STRING_NOT_EQUALS"
    STARTS_WITH = "STRING_STARTS_WITH"
    ENDS_WITH = "STRING_ENDS_WITH"

    def apply(self, column: QueryableAttribute, value: FilterValue):
        if not isinstance(value, str):
            raise ValueError("Invalid value type for StringOperator (requires str)!")

        match self:
            case StringOperator.EQUALS:
                return column == value
            case StringOperator.NOT_EQUALS:
                return column != value
            case StringOperator.STARTS_WITH:
                return column.startswith(value)
            case StringOperator.ENDS_WITH:
                return column.endswith(value)
            case StringOperator.CONTAINS:
                return column.contains(value)


class IDOperator(Enum):
    EQUALS = "ID_EQUALS"
    NOT_EQUALS = "ID_NOT_EQUALS"

    def apply(
        self,
        column: QueryableAttribute,
        value: FilterValue,
    ):
        if not isinstance(value, (int, str)):
            raise ValueError("Invalid value type for IDOperator (requires int or str)!")

        match self:
            case IDOperator.EQUALS:
                return column == value
            case IDOperator.NOT_EQUALS:
                return column != value


class NumberOperator(Enum):
    EQUALS = "NUMBER_EQUALS"
    NOT_EQUALS = "NUMBER_NOT_EQUALS"
    GT = "NUMBER_GT"
    LT = "NUMBER_LT"
    GTE = "NUMBER_GTE"
    LTE = "NUMBER_LTE"

    def apply(self, column: QueryableAttribute, value: FilterValue):
        if not isinstance(value, int):
            raise ValueError("Invalid value type for NumberOperator (requires int)!")

        match self:
            case NumberOperator.EQUALS:
                return column == value
            case NumberOperator.NOT_EQUALS:
                return column != value
            case NumberOperator.GT:
                return column > value
            case NumberOperator.LT:
                return column < value
            case NumberOperator.GTE:
                return column >= value
            case NumberOperator.LTE:
                return column <= value


class IDListOperator(Enum):
    CONTAINS = "ID_LIST_CONTAINS"
    NOT_CONTAINS = "ID_LIST_NOT_CONTAINS"

    def apply(self, column, value: FilterValue):
        if not isinstance(value, (str, list, int)):
            raise ValueError(
                "Invalid value type for IDListOperator (requires str, List[str], or int)!"
            )
        if isinstance(value, list) and len(value) > 0 and not isinstance(value[0], str):
            raise ValueError(
                "Invalid value type for IDListOperator (requires List[str])!"
            )

        # value should be Union[str, List[str]]
        if isinstance(column, tuple):
            if isinstance(value, (str, int)) and (len(column) == 2):
                # Column is tuple of ORMs, e.g. (SourceDocumentORM.document_tags, DocumentTagORM.id)
                match self:
                    case IDListOperator.CONTAINS:
                        return column[0].any(column[1] == int(value))
                    case IDListOperator.NOT_CONTAINS:
                        return not_(column[0].any(column[1] == int(value)))
            else:
                raise ValueError("Invalid column or value for IDListOperator!")

        else:
            if isinstance(value, list):
                if len(value) == 2:
                    # This is a special case only for span annotations! (this is bad...)
                    # Column is aggregated list of ["CODE_ID", "SPAN_TEXT"], e.g. subquery_dict.SPAN_ANNOTATIONS
                    match self:
                        case IDListOperator.CONTAINS:
                            return column.contains([value])
                        case IDListOperator.NOT_CONTAINS:
                            return not_(column.contains([value]))
                else:
                    raise ValueError("Invalid value for IDListOperator!")
            else:
                # Column is aggregated list of IDs, e.g. subquery_dict.CODE_ID_LIST
                match self:
                    case IDListOperator.CONTAINS:
                        return column.contains([int(value)])
                    case IDListOperator.NOT_CONTAINS:
                        return not_(column.contains([int(value)]))


class ListOperator(Enum):
    CONTAINS = "LIST_CONTAINS"
    NOT_CONTAINS = "LIST_NOT_CONTAINS"

    def apply(self, column: QueryableAttribute, value: FilterValue):
        if not isinstance(value, list):
            raise ValueError(
                "Invalid value type for ListOperator (requires List[str])!"
            )
        if len(value) > 0 and not isinstance(value[0], str):
            raise ValueError(
                "Invalid value type for ListOperator (requires List[str])!"
            )

        match self:
            case ListOperator.CONTAINS:
                return column.contains([value])
            case ListOperator.NOT_CONTAINS:
                return not_(column.contains([value]))


class DateOperator(Enum):
    EQUALS = "DATE_EQUALS"
    GT = "DATE_GT"
    LT = "DATE_LT"
    GTE = "DATE_GTE"
    LTE = "DATE_LTE"

    def apply(self, column: QueryableAttribute, value: FilterValue):
        if not isinstance(value, str):
            raise ValueError("Invalid value type for DateOperator (requires str)!")

        match self:
            case DateOperator.EQUALS:
                return column == value
            case DateOperator.GT:
                return column > value
            case DateOperator.LT:
                return column < value
            case DateOperator.GTE:
                return column >= value
            case DateOperator.LTE:
                return column <= value
