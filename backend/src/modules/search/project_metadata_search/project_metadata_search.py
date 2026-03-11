from sqlalchemy.orm import Session

from core.metadata.project_metadata_dto import ProjectMetadataRead
from core.metadata.project_metadata_orm import ProjectMetadataORM
from modules.search.project_metadata_search.project_metadata_search_columns import (
    ProjectMetadataColumns,
)
from modules.search.search_dto import ProjectMetadataSearchResult
from systems.search_system.column_info import ColumnInfo
from systems.search_system.filtering import Filter
from systems.search_system.search_builder import SearchBuilder
from systems.search_system.sorting import Sort


def find_project_metadata_info(
    db: Session,
    project_id: int,
) -> list[ColumnInfo[ProjectMetadataColumns]]:
    return [
        ColumnInfo[ProjectMetadataColumns].from_column(column)
        for column in ProjectMetadataColumns
    ]


def find_project_metadata(
    db: Session,
    project_id: int,
    filter: Filter[ProjectMetadataColumns],
    sorts: list[Sort[ProjectMetadataColumns]],
) -> ProjectMetadataSearchResult:
    builder = SearchBuilder(db, filter, sorts)
    builder.init_query(
        db.query(ProjectMetadataORM)
        .filter(ProjectMetadataORM.project_id == project_id)
        .group_by(
            ProjectMetadataORM.id,
        )
    ).build_query()
    result_rows, total_results = builder.execute_query(
        page_number=None,
        page_size=None,
    )

    data = []
    for row in result_rows:
        data.append(
            ProjectMetadataRead(
                id=row[0],
                project_id=project_id,
                key=row[1],
                metatype=row[2],
                read_only=row[3],
                doctype=row[4],
                description=row[5],
            )
        )
    return ProjectMetadataSearchResult(total_results=total_results, data=data)
