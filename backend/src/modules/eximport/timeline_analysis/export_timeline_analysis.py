from pathlib import Path

import pandas as pd
import srsly
from fastapi.encoders import jsonable_encoder
from loguru import logger
from sqlalchemy.orm import Session

from modules.eximport.export_exceptions import NoDataToExportError
from modules.eximport.timeline_analysis.timeline_analysis_export_schema import (
    TimelineAnalysisExportCollection,
    TimelineAnalysisExportSchema,
)
from modules.eximport.timeline_analysis.timeline_analysis_transformations import (
    transform_concept_for_export,
    transform_settings_for_export,
)
from modules.timeline_analysis.timeline_analysis_crud import crud_timeline_analysis
from modules.timeline_analysis.timeline_analysis_dto import TimelineAnalysisRead
from modules.timeline_analysis.timeline_analysis_orm import TimelineAnalysisORM
from repos.filesystem_repo import FilesystemRepo


def export_selected_timeline_analyses(
    db: Session,
    fsr: FilesystemRepo,
    project_id: int,
    timeline_analysis_ids: list[int],
) -> Path:
    """
    Export selected timeline analyses to a CSV file.

    Args:
        db: Database session
        fsr: Filesystem repository service for file operations
        project_id: ID of the project
        timeline_analysis_ids: List of timeline analysis IDs to export

    Returns:
        Path to the exported file

    Raises:
        NoDataToExportError: If no timeline analyses are found
    """
    timeline_analyses = crud_timeline_analysis.read_by_ids(
        db=db, ids=timeline_analysis_ids
    )
    return __export_timeline_analyses(
        db=db,
        fsr=fsr,
        fn=f"project_{project_id}_selected_timeline_analyses",
        timeline_analyses=timeline_analyses,
    )


def export_all_timeline_analyses(
    db: Session,
    fsr: FilesystemRepo,
    project_id: int,
) -> Path:
    """
    Export all timeline analyses from a project to a CSV file.

    Args:
        db: Database session
        fsr: Filesystem repository service for file operations
        project_id: ID of the project

    Returns:
        Path to the exported file

    Raises:
        NoDataToExportError: If no timeline analyses are found
    """
    timeline_analyses = crud_timeline_analysis.read_by_project(
        db=db, project_id=project_id
    )
    return __export_timeline_analyses(
        db=db,
        fsr=fsr,
        fn=f"project_{project_id}_all_timeline_analyses",
        timeline_analyses=timeline_analyses,
    )


def __export_timeline_analyses(
    db: Session,
    fsr: FilesystemRepo,
    fn: str,
    timeline_analyses: list[TimelineAnalysisORM],
) -> Path:
    """
    Export timeline analyses to a CSV file.

    Args:
        db: Database session
        fsr: Filesystem repository service for file operations
        fn: Filename for the export
        timeline_analyses: List of timeline analysis ORMs to export

    Returns:
        Path to the exported file

    Raises:
        NoDataToExportError: If no timeline analyses are found
    """
    if len(timeline_analyses) == 0:
        raise NoDataToExportError("No timeline analyses to export.")

    export_data = __generate_export_df_for_timeline_analyses(
        db=db, timeline_analyses=timeline_analyses
    )
    return fsr.write_df_to_temp_file(
        df=export_data,
        fn=fn,
    )


def __generate_export_df_for_timeline_analyses(
    db: Session,
    timeline_analyses: list[TimelineAnalysisORM],
) -> pd.DataFrame:
    """
    Generate a DataFrame for exporting timeline analyses.

    Args:
        db: Database session
        timeline_analyses: List of timeline analysis ORMs to export

    Returns:
        DataFrame containing the timeline analysis data
    """
    logger.info(f"Exporting {len(timeline_analyses)} Timeline Analyses ...")

    timeline_analysis_export_items = []
    for ta in timeline_analyses:
        ta_dto = TimelineAnalysisRead.model_validate(ta)

        # Transform concepts for export - resolving IDs to names
        transformed_concepts = [
            transform_concept_for_export(db=db, concept=concept)
            for concept in ta_dto.concepts
        ]

        # Transform settings for export
        transformed_settings = transform_settings_for_export(
            db=db, settings=ta_dto.settings
        )

        timeline_analysis_export_items.append(
            TimelineAnalysisExportSchema(
                name=ta.name,
                type=ta.timeline_analysis_type,
                settings=transformed_settings.model_dump_json(),
                concepts=srsly.json_dumps(jsonable_encoder(transformed_concepts)),
            )
        )

    collection = TimelineAnalysisExportCollection(
        timeline_analyses=timeline_analysis_export_items
    )
    return collection.to_dataframe()
