from sqlalchemy.orm import Session

from core.metadata.project_metadata_orm import ProjectMetadataORM
from systems.search_system.column_info import AbstractColumns
from systems.search_system.filtering_operators import FilterOperator, FilterValueType
from systems.search_system.search_builder import SearchBuilder


class ProjectMetadataColumns(str, AbstractColumns):
    KEY = "PM_KEY"
    METATYPE = "PM_METATYPE"
    READ_ONLY = "PM_READ_ONLY"
    DOCTYPE = "PM_DOCTYPE"
    DESCRIPTION = "PM_DESCRIPTION"

    def get_filter_column(self, subquery_dict):
        match self:
            case ProjectMetadataColumns.KEY:
                return ProjectMetadataORM.key
            case ProjectMetadataColumns.METATYPE:
                return ProjectMetadataORM.metatype
            case ProjectMetadataColumns.READ_ONLY:
                return ProjectMetadataORM.read_only
            case ProjectMetadataColumns.DOCTYPE:
                return ProjectMetadataORM.doctype
            case ProjectMetadataColumns.DESCRIPTION:
                return ProjectMetadataORM.description

    def get_filter_operator(self) -> FilterOperator:
        match self:
            case ProjectMetadataColumns.KEY:
                return FilterOperator.STRING
            case ProjectMetadataColumns.METATYPE:
                return FilterOperator.STRING
            case ProjectMetadataColumns.READ_ONLY:
                return FilterOperator.BOOLEAN
            case ProjectMetadataColumns.DOCTYPE:
                return FilterOperator.STRING
            case ProjectMetadataColumns.DESCRIPTION:
                return FilterOperator.STRING

    def get_filter_value_type(self) -> FilterValueType:
        match self:
            case ProjectMetadataColumns.KEY:
                return FilterValueType.INFER_FROM_OPERATOR
            case ProjectMetadataColumns.METATYPE:
                return FilterValueType.INFER_FROM_OPERATOR
            case ProjectMetadataColumns.READ_ONLY:
                return FilterValueType.INFER_FROM_OPERATOR
            case ProjectMetadataColumns.DOCTYPE:
                return FilterValueType.INFER_FROM_OPERATOR
            case ProjectMetadataColumns.DESCRIPTION:
                return FilterValueType.INFER_FROM_OPERATOR

    def get_sort_column(self):
        match self:
            case ProjectMetadataColumns.KEY:
                return ProjectMetadataORM.key
            case ProjectMetadataColumns.METATYPE:
                return ProjectMetadataORM.metatype
            case ProjectMetadataColumns.READ_ONLY:
                return ProjectMetadataORM.read_only
            case ProjectMetadataColumns.DOCTYPE:
                return ProjectMetadataORM.doctype
            case ProjectMetadataColumns.DESCRIPTION:
                return ProjectMetadataORM.description

    def get_label(self) -> str:
        match self:
            case ProjectMetadataColumns.KEY:
                return "Key"
            case ProjectMetadataColumns.METATYPE:
                return "Metatype"
            case ProjectMetadataColumns.READ_ONLY:
                return "Read only"
            case ProjectMetadataColumns.DOCTYPE:
                return "Document type"
            case ProjectMetadataColumns.DESCRIPTION:
                return "Description"

    def add_query_filter_statements(self, query_builder: SearchBuilder):
        pass

    def add_subquery_filter_statements(self, query_builder: SearchBuilder):
        pass

    def resolve_ids(self, db: Session, ids: list[int]):
        pass

    def resolve_names(self, db: Session, project_id: int, names: list[str]):
        pass
