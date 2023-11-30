from enum import Enum, EnumMeta
from typing import Generic, List, TypeVar, Union

from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.data.crud.project import crud_project
from app.core.data.doc_type import DocType
from app.core.data.dto.project_metadata import ProjectMetadataRead
from app.core.filters.filtering_operators import FilterOperator, FilterValueType


class AbstractColumns(Enum, metaclass=EnumMeta):
    def get_filter_column(self, **kwargs):
        raise NotImplementedError

    def get_sort_column(self, **kwargs):
        raise NotImplementedError

    def get_filter_operator(self) -> FilterOperator:
        raise NotImplementedError

    def get_label(self) -> str:
        raise NotImplementedError

    def get_filter_value_type(self) -> FilterValueType:
        raise NotImplementedError


T = TypeVar("T", bound=AbstractColumns)


class ColumnInfo(BaseModel, Generic[T]):
    label: str
    column: Union[T, int]  # TODO: Annotatoed[, SkipValidation] with pydantic 2.4
    sortable: bool
    operator: FilterOperator
    value: FilterValueType

    @classmethod
    def from_column(cls, column: T) -> "ColumnInfo[T]":
        return ColumnInfo(
            label=column.get_label(),
            column=column,
            sortable=column.get_sort_column() is not None,
            operator=column.get_filter_operator(),
            value=column.get_filter_value_type(),
        )


def create_metadata_column_info(
    db: Session, project_id: int, allowed_doctypes: List[DocType]
) -> List[ColumnInfo]:
    project_metadata = [
        ProjectMetadataRead.model_validate(pm)
        for pm in crud_project.read(db=db, id=project_id).metadata_
    ]
    project_metadata = [pm for pm in project_metadata if pm.doctype in allowed_doctypes]

    return [
        ColumnInfo(
            label=f"{pm.doctype.value}-{pm.key}",
            column=pm.id,
            sortable=False,
            operator=pm.metatype.get_filter_operator(),
            value=FilterValueType.INFER_FROM_OPERATOR,
        )
        for pm in project_metadata
    ]
