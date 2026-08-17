from typing import TYPE_CHECKING

from fastapi import status

from common.exception_handler import exception_handler

if TYPE_CHECKING:
    from systems.search_system.filtering_operators import FilterOperator


@exception_handler(status.HTTP_400_BAD_REQUEST)
class OperatorNotCompatibleWithColumnError(Exception):
    """Raised when a filter operator's family does not match the column's family.

    NOTE: this is only raised for enum columns. Metadata columns (``column: int``)
    are NOT validated, because their operator family is stored on the
    ``ProjectMetadata`` database row (``metatype``) and resolving it requires a DB
    session that is not available at request-validation time.
    """

    def __init__(
        self,
        operator_value: str,
        operator_family: "FilterOperator",
        column: object,
        column_family: "FilterOperator",
    ) -> None:
        super().__init__(
            f"Operator '{operator_value}' (family {operator_family.value}) is not "
            f"compatible with column '{column}' (family {column_family.value})!"
        )


@exception_handler(status.HTTP_400_BAD_REQUEST)
class ColumnNotGroupableError(Exception):
    """Raised when grouping or drill-down is requested on a non-groupable column.

    A column is groupable iff `AbstractColumns.is_groupable()` returns True; such a
    column must also return a non-None `GroupExpressions` from
    `get_group_expressions`. Requesting grouping/drill-down on any other column
    raises this error.
    """

    def __init__(self, column: object) -> None:
        super().__init__(f"Column '{column}' does not support grouping!")


@exception_handler(status.HTTP_400_BAD_REQUEST)
class InvalidFilterValueError(Exception):
    """Raised when a filter value has the wrong type or format for its operator.

    Pydantic validates that a filter ``value`` is a bool/str/int/list, but NOT that
    its type matches the operator. A wrong-typed or malformed value therefore reaches
    ``*Operator.apply()``, which raises this error (HTTP 400).
    """

    def __init__(self, operator: object, requirement: str, value: object) -> None:
        super().__init__(
            f"Invalid value type for {operator} (requires {requirement}), "
            f"got {type(value).__name__}: {value!r}!"
        )


@exception_handler(status.HTTP_400_BAD_REQUEST)
class InvalidFilterValueFormatError(Exception):
    """Raised when a filter value has the right type but an unparseable format.

    For example a date string that cannot be parsed, or an enum value string that
    is not a member of the expected enum.
    """

    def __init__(self, message: str) -> None:
        super().__init__(message)


@exception_handler(status.HTTP_400_BAD_REQUEST)
class FilterValueNotFoundError(Exception):
    """Raised when a filter value references an ID or name that does not exist.

    Raised during ``resolve_ids``/``resolve_names`` when the referenced entity
    cannot be resolved for the given column.
    """

    def __init__(self, value: object, column: object) -> None:
        super().__init__(f"'{value}' not found for column {column}!")
