from pathlib import Path

import pandas as pd
import srsly
from fastapi.encoders import jsonable_encoder
from loguru import logger
from sqlalchemy.orm import Session

from modules.concept_over_time_analysis.cota_crud import (
    crud_cota,
)
from modules.concept_over_time_analysis.cota_dto import (
    COTARead,
)
from modules.concept_over_time_analysis.cota_orm import (
    ConceptOverTimeAnalysisORM,
)
from modules.eximport.cota.cota_export_schema import (
    COTAExportCollection,
    COTAExportSchema,
)
from modules.eximport.cota.cota_transformations import (
    transform_concept_for_export,
    transform_timeline_settings_for_export,
    transform_training_settings_for_export,
)
from modules.eximport.no_data_export_error import NoDataToExportError
from repos.filesystem_repo import FilesystemRepo


def export_selected_cota(
    db: Session,
    fsr: FilesystemRepo,
    project_id: int,
    cota_ids: list[int],
) -> Path:
    """
    Export selected concept over time analyses to a CSV file.

    Args:
        db: Database session
        fsr: Filesystem repository service for file operations
        project_id: ID of the project
        cota_ids: List of concept over time analysis IDs to export

    Returns:
        Path to the exported file

    Raises:
        NoDataToExportError: If no COTA analyses are found
    """
    cota_analyses = crud_cota.read_by_ids(db=db, ids=cota_ids)
    return __export_cota(
        db=db,
        fsr=fsr,
        fn=f"project_{project_id}_selected_cota",
        cota_analyses=cota_analyses,
    )


def export_all_cota(
    db: Session,
    fsr: FilesystemRepo,
    project_id: int,
) -> Path:
    """
    Export all concept over time analyses from a project to a CSV file.

    Args:
        db: Database session
        fsr: Filesystem repository service for file operations
        project_id: ID of the project

    Returns:
        Path to the exported file

    Raises:
        NoDataToExportError: If no COTA analyses are found
    """
    cota_analyses = crud_cota.read_by_project(db=db, project_id=project_id)
    return __export_cota(
        db=db,
        fsr=fsr,
        fn=f"project_{project_id}_all_cota",
        cota_analyses=cota_analyses,
    )


def __export_cota(
    db: Session,
    fsr: FilesystemRepo,
    fn: str,
    cota_analyses: list[ConceptOverTimeAnalysisORM],
) -> Path:
    """
    Export concept over time analyses to a CSV file.

    Args:
        db: Database session
        fsr: Filesystem repository service for file operations
        fn: Filename for the export
        cota_analyses: List of COTA ORMs to export

    Returns:
        Path to the exported file

    Raises:
        NoDataToExportError: If no COTA analyses are found
    """
    if len(cota_analyses) == 0:
        raise NoDataToExportError("No concept over time analyses to export.")

    export_data = __generate_export_df_for_cota(db=db, cota_analyses=cota_analyses)
    return fsr.write_df_to_temp_file(
        df=export_data,
        fn=fn,
    )


def __generate_export_df_for_cota(
    db: Session,
    cota_analyses: list[ConceptOverTimeAnalysisORM],
) -> pd.DataFrame:
    """
    Generate a DataFrame for exporting concept over time analyses.

    Args:
        db: Database session
        cota_analyses: List of COTA ORMs to export

    Returns:
        DataFrame containing the COTA data
    """
    logger.info(f"Exporting {len(cota_analyses)} Concept Over Time Analyses ...")

    cota_export_items = []
    for cota in cota_analyses:
        cota_dto = COTARead.model_validate(cota)

        # Transform concepts for export
        transformed_concepts = [
            transform_concept_for_export(db=db, concept=concept)
            for concept in cota_dto.concepts
        ]

        # Transform timeline settings for export
        transformed_timeline_settings = transform_timeline_settings_for_export(
            db=db, settings=cota_dto.timeline_settings
        )

        # Transform training settings for export
        transformed_training_settings = transform_training_settings_for_export(
            db=db, settings=cota_dto.training_settings
        )

        cota_export_items.append(
            COTAExportSchema(
                name=cota.name,
                timeline_settings=transformed_timeline_settings.model_dump_json(),
                training_settings=transformed_training_settings.model_dump_json(),
                concepts=srsly.json_dumps(jsonable_encoder(transformed_concepts)),
            )
        )

    collection = COTAExportCollection(cota_analyses=cota_export_items)
    return collection.to_dataframe()
