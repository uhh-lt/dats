from enum import Enum
from typing import Generic, TypeVar, Union

from pydantic import BaseModel
from sqlalchemy import and_, not_, or_
from sqlalchemy.orm import Session

from systems.search_system.abstract_column import AbstractColumns
from systems.search_system.filtering_operators import (
    BooleanOperator,
    DateOperator,
    FilterValue,
    IDListOperator,
    IDListRecursiveOperator,
    IDOperator,
    ListOperator,
    NumberOperator,
    StringOperator,
)


def get_descendant_ids(
    db: Session, column: AbstractColumns, parent_id: int
) -> list[int]:
    from core.doc.folder_orm import FolderORM
    from core.tag.tag_orm import TagORM

    val = column.value if hasattr(column, "value") else str(column)
    # TODO: THIS IS HARDCODED AND NOT GOOD
    if "TAG_ID_LIST_RECURSIVE" in val:
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
    id: str
    column: T | int
    operator: (
        IDOperator
        | NumberOperator
        | StringOperator
        | IDListOperator
        | IDListRecursiveOperator
        | ListOperator
        | DateOperator
        | BooleanOperator
    )
    value: FilterValue

    def get_sqlalchemy_expression(self, subquery_dict):
        if isinstance(self.column, int):
            return self.operator.apply(
                subquery_dict[f"METADATA-{self.column}"], value=self.value
            )

        column = self.column.get_filter_column(subquery_dict)
        column_value = self.column.value if hasattr(self.column, "value") else ""
        if "CODE_ID" in str(column_value) and isinstance(self.value, str):
            from core.code.code_filter_service import (
                parse_code_concept_filter_value,
                parse_code_snapshot_filter_value,
            )
            from core.code.code_orm import CodeORM

            snapshot_id = parse_code_snapshot_filter_value(self.value)
            if snapshot_id is not None:
                is_direct_concept_column = (
                    getattr(column, "class_", None) is CodeORM
                    and getattr(column, "key", None) == "concept_id"
                )
                target_column = CodeORM.id if is_direct_concept_column else column
                return self.operator.apply(target_column, value=snapshot_id)

            selection = parse_code_concept_filter_value(self.value)
            if selection is not None:
                if not isinstance(self.operator, IDOperator):
                    raise ValueError(
                        "Code-concept filter was not resolved for a list column"
                    )
                scope_expression = CodeORM.branch_id.is_(None)
                if selection.branch_id is not None:
                    scope_expression = or_(
                        scope_expression,
                        CodeORM.branch_id == selection.branch_id,
                    )
                match_expression = and_(
                    CodeORM.concept_id == selection.concept_id,
                    scope_expression,
                )
                if self.operator == IDOperator.EQUALS:
                    return match_expression
                return not_(match_expression)

        return self.operator.apply(column, value=self.value)

    def resolve_ids(self, db: Session) -> "FilterExpression[T]":
        # We don't need to resolve IDs for metadata columns
        if isinstance(self.column, int):
            return self

        column_value = self.column.value if hasattr(self.column, "value") else ""
        if "CODE_ID" in str(column_value):
            from core.code.code_filter_service import code_filter_service

            if not isinstance(self.value, str):
                raise ValueError("Code filters require an explicit token")
            self.value = code_filter_service.export_filter_value(db, value=self.value)
            return self

        # Resolve IDs for IDOperator
        if self.operator == IDOperator.EQUALS or self.operator == IDOperator.NOT_EQUALS:
            assert isinstance(self.value, int), f"Expected int, got {type(self.value)}"
            resolved_ids = self.column.resolve_ids(db=db, ids=[int(self.value)])
            if len(resolved_ids) == 0:
                raise ValueError(
                    f"ID '{self.value}' not found for column {self.column}"
                )
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
                raise ValueError(f"IDs '{ids}' not found for column {self.column}")
            self.value = resolved_ids
            return self

        return self

    def resolve_names(self, db: Session, project_id: int) -> "FilterExpression[T]":
        # We don't need to resolve names for metadata columns
        if isinstance(self.column, int):
            return self

        column_value = self.column.value if hasattr(self.column, "value") else ""
        if "CODE_ID" in str(column_value):
            from core.code.code_filter_service import code_filter_service

            if not isinstance(self.value, str):
                raise ValueError("Code filters require a portable token")
            self.value = code_filter_service.import_filter_value(
                db, project_id=project_id, value=self.value
            )
            return self

        # Resolve names for IDOperator
        if self.operator == IDOperator.EQUALS or self.operator == IDOperator.NOT_EQUALS:
            assert isinstance(self.value, str), f"Expected str, got {type(self.value)}"
            resolved_names = self.column.resolve_names(
                db=db, project_id=project_id, names=[self.value]
            )
            if len(resolved_names) == 0:
                raise ValueError(f"'{self.value}' not found for column {self.column}")
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
                raise ValueError(
                    f"Names '{self.value}' not found for column {self.column}"
                )
            self.value = resolved_names
            return self

        return self


class Filter(BaseModel, Generic[T]):
    """A tree of column expressions for filtering on many database columns using various
    comparisons."""

    id: str
    items: list[Union[FilterExpression[T], "Filter[T]"]]
    logic_operator: LogicalOperator

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
            column_value = (
                item.column.value
                if not isinstance(item.column, int) and hasattr(item.column, "value")
                else ""
            )
            if "CODE_ID" in str(column_value):
                from core.code.code_filter_service import (
                    InvalidCodeFilterError,
                    code_filter_service,
                    parse_code_concept_filter_value,
                    parse_code_snapshot_filter_value,
                )

                if not isinstance(item.value, str):
                    raise InvalidCodeFilterError(
                        "Code filters require a concept or snapshot token"
                    )
                selection = parse_code_concept_filter_value(item.value)
                if selection is not None and not isinstance(item.operator, IDOperator):
                    expr = item.model_copy(deep=True)
                    expr.value = code_filter_service.resolve_concept_snapshot_ids(
                        db,
                        selection=selection,
                        include_descendants=(
                            item.operator == IDListRecursiveOperator.CONTAINS_RECURSIVE
                        ),
                    )
                    resolved_items.append(expr)
                    continue
                if (
                    selection is not None
                    or parse_code_snapshot_filter_value(item.value) is not None
                ):
                    resolved_items.append(item)
                    continue
                raise InvalidCodeFilterError("Invalid code filter token")
            if item.operator == IDListRecursiveOperator.CONTAINS_RECURSIVE:
                expr = item.model_copy(deep=True)
                if isinstance(expr.column, int):
                    raise ValueError(
                        "Metadata columns are not supported for recursive filtering!"
                    )

                if isinstance(expr.value, str):
                    parent_ids = [int(expr.value)]
                elif isinstance(expr.value, int):
                    parent_ids = [int(expr.value)]
                elif isinstance(expr.value, list):
                    parent_ids = []
                    for v in expr.value:
                        if isinstance(v, list):
                            raise ValueError(
                                "Nested lists are not supported for IDListRecursiveOperator!"
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
