from enum import Enum
from typing import Generic, List, TypeVar, Union

from pydantic import BaseModel
from sqlalchemy import asc, desc
from sqlalchemy.orm import QueryableAttribute, Session

from app.core.data.crud.project_metadata import crud_project_meta
from app.core.data.dto.project_metadata import ProjectMetadataRead
from app.core.filters.columns import AbstractColumns


class SortDirection(str, Enum):
    ASC = "asc"
    DESC = "desc"

    def apply(self, column: QueryableAttribute):
        match self:
            case SortDirection.ASC:
                return asc(column).nulls_last()
            case SortDirection.DESC:
                return desc(column).nulls_last()


T = TypeVar("T", bound=AbstractColumns)


class Sort(BaseModel, Generic[T]):
    """A sort expressions for sorting on many database columns"""

    column: Union[T, int]
    direction: SortDirection

    def get_sqlalchemy_expression(self, db: Session):
        if isinstance(self.column, int):
            # This is a metadata column, the column is the ProjectMetadataORM id
            project_metadata = ProjectMetadataRead.model_validate(
                crud_project_meta.read(db=db, id=self.column)
            )
            return self.direction.apply(project_metadata.metatype.get_metadata_column())

        # This is a regular column
        return self.direction.apply(self.column.get_sort_column())


def apply_sorting(query, sorts: List[Sort], db: Session):
    if len(sorts) == 0:
        return query
    return query.order_by(*[s.get_sqlalchemy_expression(db=db) for s in sorts])
