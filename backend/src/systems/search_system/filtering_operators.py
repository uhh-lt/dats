from enum import Enum
from typing import cast

from sqlalchemy import and_, not_
from sqlalchemy.orm import QueryableAttribute

from core.memo.memo_dto import AttachedObjectType
from systems.search_system.search_system_exceptions import (
    InvalidFilterValueError,
    InvalidFilterValueFormatError,
)

FilterValue = bool | str | int | list[str] | list[list[str]]


class FilterValueType(Enum):
    ATTACHED_OBJECT_TYPE = "ATTACHED_OBJECT_TYPE"
    ATTACHED_OBJECT = "ATTACHED_OBJECT"
    SDOC_ID = "SDOC_ID"
    CODE_ID = "CODE_ID"
    USER_ID = "USER_ID"
    TAG_ID = "TAG_ID"
    FOLDER_ID = "FOLDER_ID"
    SPAN_ANNOTATION = "SPAN_ANNOTATION"
    DOC_TYPE = "DOC_TYPE"
    INFER_FROM_OPERATOR = "INFER_FROM_OPERATOR"


class FilterOperator(Enum):
    BOOLEAN = "BOOLEAN"
    STRING = "STRING"
    ID = "ID"
    NUMBER = "NUMBER"
    ID_LIST = "ID_LIST"
    ID_LIST_RECURSIVE = "ID_LIST_RECURSIVE"
    LIST = "LIST"
    DATE = "DATE"
    ATTACHED_OBJECT_TYPE = "ATTACHED_OBJECT_TYPE"
    ATTACHED_OBJECT = "ATTACHED_OBJECT"


class BooleanOperator(Enum):
    EQUALS = "BOOLEAN_EQUALS"
    NOT_EQUALS = "BOOLEAN_NOT_EQUALS"

    def get_filter_operator(self) -> FilterOperator:
        return FilterOperator.BOOLEAN

    def apply(self, column: QueryableAttribute, value: FilterValue):
        if not isinstance(value, bool):
            raise InvalidFilterValueError("BooleanOperator", "bool", value)

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

    def get_filter_operator(self) -> FilterOperator:
        return FilterOperator.STRING

    def apply(self, column: QueryableAttribute, value: FilterValue):
        if not isinstance(value, str):
            raise InvalidFilterValueError("StringOperator", "str", value)

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

    def get_filter_operator(self) -> FilterOperator:
        return FilterOperator.ID

    def apply(
        self,
        column: QueryableAttribute,
        value: FilterValue,
    ):
        if not isinstance(value, (int, str)):
            raise InvalidFilterValueError("IDOperator", "int or str", value)

        match self:
            case IDOperator.EQUALS:
                return column == value
            case IDOperator.NOT_EQUALS:
                return column != value


class AttachedObjectTypeOperator(Enum):
    """Filters on the attached object's type (a single AttachedObjectType value)."""

    EQUALS = "ATTACHED_OBJECT_TYPE_EQUALS"
    NOT_EQUALS = "ATTACHED_OBJECT_TYPE_NOT_EQUALS"

    def get_filter_operator(self) -> FilterOperator:
        return FilterOperator.ATTACHED_OBJECT_TYPE

    def apply(
        self,
        column: QueryableAttribute,
        value: FilterValue,
    ):
        if not isinstance(value, str):
            raise InvalidFilterValueError("AttachedObjectTypeOperator", "str", value)
        if value not in AttachedObjectType._value2member_map_:
            raise InvalidFilterValueFormatError(
                f"Invalid value for AttachedObjectTypeOperator: '{value}' is not a valid AttachedObjectType!"
            )

        match self:
            case AttachedObjectTypeOperator.EQUALS:
                return column == value
            case AttachedObjectTypeOperator.NOT_EQUALS:
                return column != value


class AttachedObjectOperator(Enum):
    """Compares an attached object as a (type, id) pair.

    The column is a tuple ``(type_expr, id_expr)`` and the value is a two-element
    list ``[type, id]`` (e.g. ``["tag", "5"]``). Filtering by the raw id alone is
    meaningless because ids collide across entity types (tag 5, code 5, sdoc 5 are
    different objects), so the type is always part of the comparison.
    """

    EQUALS = "ATTACHED_OBJECT_EQUALS"
    NOT_EQUALS = "ATTACHED_OBJECT_NOT_EQUALS"

    def get_filter_operator(self) -> FilterOperator:
        return FilterOperator.ATTACHED_OBJECT

    def apply(self, column, value: FilterValue):
        if not isinstance(column, tuple) or len(column) != 2:
            raise ValueError(
                "AttachedObjectOperator requires a (type, id) tuple column!"
            )
        if (
            not isinstance(value, list)
            or len(value) != 2
            or not all(isinstance(v, str) for v in value)
        ):
            raise InvalidFilterValueError(
                "AttachedObjectOperator", "list[str] of [type, id]", value
            )

        # The guard above proves value is a two-element list[str].
        type_value, id_value = cast(list[str], value)
        if type_value not in AttachedObjectType._value2member_map_:
            raise InvalidFilterValueFormatError(
                f"Invalid value for AttachedObjectOperator: '{type_value}' is not a "
                "valid AttachedObjectType!"
            )
        try:
            object_id = int(id_value)
        except ValueError as e:
            raise InvalidFilterValueFormatError(
                f"Invalid value for AttachedObjectOperator: '{id_value}' is not an "
                "integer id!"
            ) from e

        type_expr, id_expr = column
        match self:
            case AttachedObjectOperator.EQUALS:
                return and_(type_expr == type_value, id_expr == object_id)
            case AttachedObjectOperator.NOT_EQUALS:
                return not_(and_(type_expr == type_value, id_expr == object_id))


class NumberOperator(Enum):
    EQUALS = "NUMBER_EQUALS"
    NOT_EQUALS = "NUMBER_NOT_EQUALS"
    GT = "NUMBER_GT"
    LT = "NUMBER_LT"
    GTE = "NUMBER_GTE"
    LTE = "NUMBER_LTE"

    def get_filter_operator(self) -> FilterOperator:
        return FilterOperator.NUMBER

    def apply(self, column: QueryableAttribute, value: FilterValue):
        if not isinstance(value, int):
            raise InvalidFilterValueError("NumberOperator", "int", value)

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

    def get_filter_operator(self) -> FilterOperator:
        return FilterOperator.ID_LIST

    def apply(self, column, value: FilterValue):
        if not isinstance(value, (str, list, int)):
            raise InvalidFilterValueError(  # pyright: ignore[reportUnreachable]
                "IDListOperator", "str, list[str], or int", value
            )
        if isinstance(value, list) and len(value) > 0 and not isinstance(value[0], str):
            raise InvalidFilterValueError("IDListOperator", "list[str]", value)

        # value should be str | list[str]
        if isinstance(column, tuple):
            if isinstance(value, (str, int)) and (len(column) == 2):
                # Column is tuple of ORMs, e.g. (SourceDocumentORM.tags, TagORM.id)
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
                # Column is aggregated list of IDs, e.g. subquery_dict.CODE_ID_LIST_RECURSIVE
                match self:
                    case IDListOperator.CONTAINS:
                        return column.contains([int(value)])
                    case IDListOperator.NOT_CONTAINS:
                        return not_(column.contains([int(value)]))


class IDListRecursiveOperator(Enum):
    CONTAINS = "IDLR_CONTAINS"
    NOT_CONTAINS = "IDLR_NOT_CONTAINS"
    CONTAINS_RECURSIVE = "IDLR_CONTAINS_RECURSIVE"

    def get_filter_operator(self) -> FilterOperator:
        return FilterOperator.ID_LIST_RECURSIVE

    def apply(self, column, value: FilterValue):
        if self == IDListRecursiveOperator.CONTAINS_RECURSIVE:
            if not isinstance(value, list):
                value_list = [value]
            else:
                value_list = value

            resolved_ints: list[int] = []
            for v in value_list:
                if isinstance(v, list):
                    raise InvalidFilterValueError(
                        "IDListRecursiveOperator", "flat list[str] or list[int]", value
                    )
                if isinstance(v, (str, int)):
                    resolved_ints.append(int(v))
                else:
                    raise InvalidFilterValueError(
                        "IDListRecursiveOperator", "str or int", v
                    )

            if isinstance(column, tuple):
                if len(column) == 2:
                    return column[0].any(column[1].in_(resolved_ints))
                else:
                    raise ValueError(
                        "Invalid column or value for IDListRecursiveOperator!"
                    )
            else:
                if len(resolved_ints) == 0:
                    from sqlalchemy import false

                    return false()
                from sqlalchemy import or_

                return or_(*[column.contains([v]) for v in resolved_ints])
        else:
            standard_value = self.value.replace("IDLR_", "ID_LIST_")
            mapped_operator = IDListOperator(standard_value)
            return mapped_operator.apply(column, value)


class ListOperator(Enum):
    CONTAINS = "LIST_CONTAINS"
    NOT_CONTAINS = "LIST_NOT_CONTAINS"

    def get_filter_operator(self) -> FilterOperator:
        return FilterOperator.LIST

    def apply(self, column: QueryableAttribute, value: FilterValue):
        if not isinstance(value, list):
            raise InvalidFilterValueError("ListOperator", "list[str]", value)
        if len(value) > 0 and not isinstance(value[0], str):
            raise InvalidFilterValueError("ListOperator", "list[str]", value)

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

    def get_filter_operator(self) -> FilterOperator:
        return FilterOperator.DATE

    def apply(self, column: QueryableAttribute, value: FilterValue):
        if not isinstance(value, str):
            raise InvalidFilterValueError("DateOperator", "str", value)

        from dateutil.parser import parse
        from sqlalchemy import Date, cast

        try:
            parsed_date = parse(value).date()
        except Exception as e:
            raise InvalidFilterValueFormatError(f"Invalid date format: {value}") from e

        match self:
            case DateOperator.EQUALS:
                return cast(column, Date) == parsed_date
            case DateOperator.GT:
                return cast(column, Date) > parsed_date
            case DateOperator.LT:
                return cast(column, Date) < parsed_date
            case DateOperator.GTE:
                return cast(column, Date) >= parsed_date
            case DateOperator.LTE:
                return cast(column, Date) <= parsed_date
