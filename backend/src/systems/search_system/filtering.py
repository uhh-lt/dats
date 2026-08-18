from enum import Enum
from typing import Generic, TypeVar, Union

from pydantic import BaseModel, Field, model_validator
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from systems.search_system.abstract_column import AbstractColumns
from systems.search_system.filtering_operators import (
    AttachedObjectOperator,
    AttachedObjectTypeOperator,
    BooleanOperator,
    DateOperator,
    FilterValue,
    IDListOperator,
    IDListRecursiveOperator,
    IDOperator,
    ListOperator,
    NumberOperator,
    SpanAnnotationOperator,
    StringOperator,
)
from systems.search_system.search_system_exceptions import (
    FilterValueNotFoundError,
    InvalidFilterValueError,
    OperatorNotCompatibleWithColumnError,
)


def get_descendant_ids(
    db: Session, column: AbstractColumns, parent_id: int
) -> list[int]:
    from core.code.code_orm import CodeORM
    from core.doc.folder_orm import FolderORM
    from core.tag.tag_orm import TagORM

    val = column.value if hasattr(column, "value") else str(column)
    # TODO: THIS IS HARDCODED AND NOT GOOD
    if "CODE_ID_LIST_RECURSIVE" in val:
        orm_class = CodeORM
    elif "TAG_ID_LIST_RECURSIVE" in val:
        orm_class = TagORM
    elif "FOLDER_ID_LIST_RECURSIVE" in val:
        orm_class = FolderORM
    else:
        return [parent_id]

    cte = (
        db.query(orm_class.id)
        .filter(orm_class.id == parent_id)
        .cte(name="descendant_items", recursive=True)
    )
    cte_alias = cte.alias()
    cte = cte.union_all(
        db.query(orm_class.id).join(cte_alias, orm_class.parent_id == cte_alias.c.id)  # type: ignore
    )
    return [row[0] for row in db.query(cte).all()]


T = TypeVar("T", bound=AbstractColumns)


class LogicalOperator(str, Enum):
    """This tells our filter how to combine multiple column expressions."""

    or_ = "or"
    and_ = "and"

    def get_sqlalchemy_operator(self):
        match self:
            case LogicalOperator.or_:
                return or_
            case LogicalOperator.and_:
                return and_


class FilterExpression(BaseModel, Generic[T]):
    id: str = Field(description="Unique id of this expression within the filter tree")
    column: T | int = Field(
        description="The column to filter on: an enum member, or an int id "
        "referring to a project-metadata column"
    )
    operator: (
        IDOperator
        | NumberOperator
        | StringOperator
        | IDListOperator
        | IDListRecursiveOperator
        | ListOperator
        | DateOperator
        | BooleanOperator
        | AttachedObjectTypeOperator
        | AttachedObjectOperator
        | SpanAnnotationOperator
    ) = Field(description="The comparison operator applied to the column")
    value: FilterValue = Field(description="The value the column is compared against")

    @model_validator(mode="after")
    def check_operator_matches_column(self) -> "FilterExpression[T]":
        """Validate that the operator's family matches the column's declared family.

        For enum columns this compares ``self.operator.get_filter_operator()`` against
        ``self.column.get_filter_operator()`` and raises
        ``OperatorNotCompatibleWithColumnError`` (HTTP 400) on mismatch.

        IMPORTANT: metadata columns (``column: int``) are NOT validated here. Their
        operator family is stored on the ``ProjectMetadata`` database row
        (``metatype``) and resolving it requires a DB session, which is not available
        at request-validation time. As a result, a mismatched operator on a metadata
        column is currently NOT caught by this validator and will only fail (or
        silently misbehave) at query-execution time.
        """
        # Metadata columns (int) cannot be validated without a DB session; see docstring.
        if isinstance(self.column, int):
            return self

        expected = self.column.get_filter_operator()
        actual = self.operator.get_filter_operator()
        if actual != expected:
            raise OperatorNotCompatibleWithColumnError(
                operator_value=self.operator.value,
                operator_family=actual,
                column=self.column,
                column_family=expected,
            )
        return self

    def get_sqlalchemy_expression(self, subquery_dict):
        if isinstance(self.column, int):
            return self.operator.apply(
                subquery_dict[f"METADATA-{self.column}"], value=self.value
            )

        else:
            return self.operator.apply(
                self.column.get_filter_column(subquery_dict), value=self.value
            )

    def resolve_ids(self, db: Session) -> "FilterExpression[T]":
        # We don't need to resolve IDs for metadata columns
        if isinstance(self.column, int):
            return self

        # Resolve IDs for AtachedObjectOperator [type, id] pairs back to a name
        if (
            self.operator == AttachedObjectOperator.EQUALS
            or self.operator == AttachedObjectOperator.NOT_EQUALS
        ):
            from common.crud_enum import attached_object_type_to_crud
            from core.memo.memo_dto import AttachedObjectType

            assert isinstance(self.value, list) and len(self.value) == 2, (
                f"Expected [type, id], got {self.value}"
            )
            type_value, id_value = self.value
            assert isinstance(type_value, str) and isinstance(id_value, str)
            crud = attached_object_type_to_crud[AttachedObjectType(type_value)]
            resolved = self.column.resolve_ids(db=db, ids=[int(id_value)], types=[crud])  # type: ignore
            if len(resolved) == 0:
                raise FilterValueNotFoundError(self.value, self.column)
            self.value = [type_value, resolved[0]]
            return self

        # Resolve IDs for IDOperator
        if self.operator == IDOperator.EQUALS or self.operator == IDOperator.NOT_EQUALS:
            assert isinstance(self.value, int), f"Expected int, got {type(self.value)}"
            resolved_ids = self.column.resolve_ids(db=db, ids=[int(self.value)])
            if len(resolved_ids) == 0:
                raise FilterValueNotFoundError(self.value, self.column)
            self.value = resolved_ids[0]
            return self

        # Resolve IDs for IDListOperator and IDListRecursiveOperator
        if (
            self.operator == IDListOperator.CONTAINS
            or self.operator == IDListOperator.NOT_CONTAINS
            or self.operator == IDListRecursiveOperator.CONTAINS
            or self.operator == IDListRecursiveOperator.NOT_CONTAINS
            or self.operator == IDListRecursiveOperator.CONTAINS_RECURSIVE
        ):
            if isinstance(self.value, str):
                ids = [int(self.value)]
            elif isinstance(self.value, int):
                ids = [int(self.value)]
            elif isinstance(self.value, list):
                ids = []
                for id in self.value:
                    assert isinstance(id, int), f"Expected int, got {type(id)}"
                    ids.append(int(id))
            else:
                ids = []

            resolved_ids = self.column.resolve_ids(db=db, ids=ids)
            if len(ids) > 1 and len(resolved_ids) == 0:
                raise FilterValueNotFoundError(ids, self.column)
            self.value = resolved_ids
            return self

        return self

    def resolve_names(self, db: Session, project_id: int) -> "FilterExpression[T]":
        # We don't need to resolve names for metadata columns
        if isinstance(self.column, int):
            return self

        # Resolve names for AtachedObjectOperator [type, name]
        if (
            self.operator == AttachedObjectOperator.EQUALS
            or self.operator == AttachedObjectOperator.NOT_EQUALS
        ):
            # Local imports: see resolve_ids above (circular import guard).
            from common.crud_enum import attached_object_type_to_crud
            from core.memo.memo_dto import AttachedObjectType

            assert isinstance(self.value, list) and len(self.value) == 2, (
                f"Expected [type, name], got {self.value}"
            )
            type_value, name_value = self.value
            assert isinstance(type_value, str) and isinstance(name_value, str)
            crud = attached_object_type_to_crud[AttachedObjectType(type_value)]
            resolved = self.column.resolve_names(
                db=db,
                project_id=project_id,
                names=[name_value],
                types=[crud],  # type: ignore
            )
            if len(resolved) == 0:
                raise FilterValueNotFoundError(self.value, self.column)
            self.value = [type_value, str(resolved[0])]
            return self

        # Resolve names for IDOperator
        if self.operator == IDOperator.EQUALS or self.operator == IDOperator.NOT_EQUALS:
            assert isinstance(self.value, str), f"Expected str, got {type(self.value)}"
            resolved_names = self.column.resolve_names(
                db=db, project_id=project_id, names=[self.value]
            )
            if len(resolved_names) == 0:
                raise FilterValueNotFoundError(self.value, self.column)
            self.value = resolved_names[0]
            return self

        # Resolve names for IDListOperator and IDListRecursiveOperator
        if (
            self.operator == IDListOperator.CONTAINS
            or self.operator == IDListOperator.NOT_CONTAINS
            or self.operator == IDListRecursiveOperator.CONTAINS
            or self.operator == IDListRecursiveOperator.NOT_CONTAINS
            or self.operator == IDListRecursiveOperator.CONTAINS_RECURSIVE
        ):
            if isinstance(self.value, str):
                names = [self.value]
            elif isinstance(self.value, list):
                names = []
                for name in self.value:
                    assert isinstance(name, str), f"Expected str, got {type(name)}"
                    names.append(name)
            else:
                names = []

            resolved_names_ids = self.column.resolve_names(
                db=db, project_id=project_id, names=names
            )

            resolved_names = [str(id) for id in resolved_names_ids]
            if len(names) > 0 and len(resolved_names) == 0:
                raise FilterValueNotFoundError(self.value, self.column)
            self.value = resolved_names
            return self

        return self


class Filter(BaseModel, Generic[T]):
    """A tree of column expressions for filtering on many database columns using various
    comparisons."""

    id: str = Field(description="Unique id of this node within the filter tree")
    items: list[Union[FilterExpression[T], "Filter[T]"]] = Field(
        description="Child expressions and/or nested filter nodes"
    )
    logic_operator: LogicalOperator = Field(
        description="How the child items are combined (and/or)"
    )

    def get_sqlalchemy_expression(self, subquery_dict):
        op = self.logic_operator.get_sqlalchemy_operator()
        return op(*[f.get_sqlalchemy_expression(subquery_dict) for f in self.items])

    @classmethod
    def resolve_ids(cls, filter: "Filter[T]", db: Session) -> "Filter[T]":
        """
        Resolve IDs for all FilterExpressions in the filter tree.
        Args:
            db: Database session
        Returns:
            Filter: A new Filter instance with resolved IDs.
        """

        resolved = filter.model_copy(deep=True)
        resolved_items: list[Union[FilterExpression[T], "Filter[T]"]] = []

        # Resolve IDs for each FilterExpression in the filter
        for item in filter.items:
            if isinstance(item, FilterExpression):
                resolved_items.append(item.resolve_ids(db=db))
            else:
                resolved_items.append(Filter.resolve_ids(item, db=db))
        resolved.items = resolved_items

        return resolved

    @classmethod
    def resolve_names(
        cls, filter: "Filter[T]", db: Session, project_id: int
    ) -> "Filter[T]":
        """
        Resolve names for all FilterExpressions in the filter tree.
        (This is the opposite of resolve_ids)
        Args:
            db: Database session
        Returns:
            Filter: A new Filter instance with resolved names.
        """

        resolved = filter.model_copy(deep=True)
        resolved_items: list[Union[FilterExpression[T], "Filter[T]"]] = []

        # Resolve names for each FilterExpression in the filter
        for item in filter.items:
            if isinstance(item, FilterExpression):
                resolved_items.append(item.resolve_names(db=db, project_id=project_id))
            else:
                resolved_items.append(
                    Filter.resolve_names(item, db=db, project_id=project_id)
                )
        resolved.items = resolved_items

        return resolved


Filter.model_rebuild()


def resolve_recursive_filter(filter: Filter[T], db: Session) -> Filter[T]:
    resolved = filter.model_copy(deep=True)
    resolved_items = []
    for item in filter.items:
        if isinstance(item, FilterExpression):
            if item.operator == IDListRecursiveOperator.CONTAINS_RECURSIVE:
                expr = item.model_copy(deep=True)
                if isinstance(expr.column, int):
                    raise InvalidFilterValueError(
                        "IDListRecursiveOperator",
                        "a non-metadata column (recursive filtering)",
                        expr.column,
                    )

                if isinstance(expr.value, str):
                    parent_ids = [int(expr.value)]
                elif isinstance(expr.value, int):
                    parent_ids = [int(expr.value)]
                elif isinstance(expr.value, list):
                    parent_ids = []
                    for v in expr.value:
                        if isinstance(v, list):
                            raise InvalidFilterValueError(
                                "IDListRecursiveOperator",
                                "flat list[str] or list[int]",
                                expr.value,
                            )
                        parent_ids.append(int(v))
                else:
                    parent_ids = []

                expanded_ids = []
                for parent_id in parent_ids:
                    descendant_ids = get_descendant_ids(db, expr.column, parent_id)
                    expanded_ids.extend(descendant_ids)

                expr.value = list(set(expanded_ids))
                resolved_items.append(expr)
            else:
                resolved_items.append(item)
        else:
            resolved_items.append(resolve_recursive_filter(item, db))
    resolved.items = resolved_items
    return resolved


def apply_filtering(
    query,
    filter: Filter,
    subquery_dict,
):
    resolved_filter = resolve_recursive_filter(filter, query.session)
    return query.filter(resolved_filter.get_sqlalchemy_expression(subquery_dict))


def get_columns_affected_by_filter(filter: Filter[T]) -> set[T | int]:
    columns: set[T | int] = set()
    for item in filter.items:
        if isinstance(item, FilterExpression):
            columns.add(item.column)
        else:
            columns.update(get_columns_affected_by_filter(item))
    return columns
