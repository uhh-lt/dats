import pandas as pd
import srsly
from fastapi.encoders import jsonable_encoder
from loguru import logger
from sqlalchemy.orm import Session

from modules.eximport.timeline_analysis.timeline_analysis_export_schema import (
    TimelineAnalysisExportCollection,
)
from modules.eximport.timeline_analysis.timeline_analysis_transformations import (
    transform_concept_for_import,
    transform_settings_for_import,
)
from modules.timeline_analysis.timeline_analysis_crud import (
    crud_timeline_analysis,
)
from modules.timeline_analysis.timeline_analysis_dto import (
    TimelineAnalysisConceptForExport,
    TimelineAnalysisCreateIntern,
    TimelineAnalysisSettingsForExport,
    TimelineAnalysisType,
)


class ImportTimelineAnalysisError(Exception):
    """Exception raised when timeline analysis import fails."""

    def __init__(self, errors: list[str]) -> None:
        super().__init__(f"Errors occurred while importing timeline analyses: {errors}")
        self.errors = errors


def import_timeline_analysis_to_proj(
    db: Session,
    df: pd.DataFrame,
    project_id: int,
) -> list[int]:
    """
    Import timeline analyses from a DataFrame into a project.
    Validates input data and ensures all required references (user) exist.

    Args:
        db: Database session
        df: DataFrame with timeline analysis data
        project_id: ID of the project to import analyses into

    Returns:
        List of imported timeline analysis IDs

    Raises:
        ImportTimelineAnalysisError: If validation fails or any required references are missing
    """
    # Validate input data using our schema
    try:
        analysis_collection = TimelineAnalysisExportCollection.from_dataframe(df)
    except ValueError as e:
        logger.error(f"Failed to load timeline analysis import data: {e}")
        raise ImportTimelineAnalysisError(
            errors=[f"Invalid data format for timeline analyses: {e}"]
        )

    logger.info(
        f"Importing {len(analysis_collection.timeline_analyses)} timeline analyses..."
    )

    # Get the project
    error_messages = []

    # Transform the timeline analyses for import
    transformed_tas: list[TimelineAnalysisCreateIntern] = []
    for ta in analysis_collection.timeline_analyses:
        try:
            # 1. Transform concepts for import - resolving names to IDs
            concepts = srsly.json_loads(ta.concepts)
            assert isinstance(concepts, list), "Concepts should be a list"
            concepts = [
                TimelineAnalysisConceptForExport.model_validate(concept)
                for concept in concepts
            ]
            transformed_concepts = [
                transform_concept_for_import(
                    db=db, project_id=project_id, concept=concept
                )
                for concept in concepts
            ]

            # 2. Transform settings for import
            settings = TimelineAnalysisSettingsForExport.model_validate_json(
                ta.settings
            )
            transformed_settings = transform_settings_for_import(
                db=db, settings=settings
            )

        except Exception as e:
            error_messages.append(
                f"An error occured for timeline analysis '{ta.name}': {e}"
            )
            continue

        # 3. Create a TimelineAnalysisCreateIntern object for each analysis
        transformed_tas.append(
            TimelineAnalysisCreateIntern(
                name=ta.name,
                project_id=project_id,
                timeline_analysis_type=TimelineAnalysisType(ta.type),
                concepts=srsly.json_dumps(jsonable_encoder(transformed_concepts)),
                settings=transformed_settings.model_dump_json(),
            )
        )

    # Raise an error if any of the checks failed
    if len(error_messages) > 0:
        logger.error(
            "The following errors occurred while importing timeline analyses:\n"
            + "\n".join(error_messages)
        )
        raise ImportTimelineAnalysisError(errors=error_messages)

    # Everything is fine, we can create the timeline analyses
    imported_timeline_analysis_ids: list[int] = []
    for ta in transformed_tas:
        created_analysis = crud_timeline_analysis.create(
            db=db,
            create_dto=ta,
        )
        imported_timeline_analysis_ids.append(created_analysis.id)
        logger.info(f"Successfully imported timeline analysis: {created_analysis.name}")

    logger.info(
        f"Successfully imported {len(imported_timeline_analysis_ids)} timeline analyses into project {project_id}"
    )
    return imported_timeline_analysis_ids
