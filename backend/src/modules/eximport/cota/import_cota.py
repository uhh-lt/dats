import pandas as pd
import srsly
from fastapi.encoders import jsonable_encoder
from loguru import logger
from sqlalchemy.orm import Session

from modules.concept_over_time_analysis.cota_crud import (
    crud_cota,
)
from modules.concept_over_time_analysis.cota_dto import (
    COTAConcept,
    COTACreateIntern,
    COTATimelineSettings,
    COTATrainingSettings,
)
from modules.eximport.cota.cota_export_schema import COTAExportCollection
from modules.eximport.cota.cota_transformations import (
    transform_concept_for_import,
    transform_timeline_settings_for_import,
    transform_training_settings_for_import,
)


class ImportCOTAError(Exception):
    """Exception raised when COTA import fails."""

    def __init__(self, errors: list[str]) -> None:
        super().__init__(
            f"Errors occurred while importing concept over time analyses: {errors}"
        )
        self.errors = errors


def import_cota_to_proj(
    db: Session,
    df: pd.DataFrame,
    project_id: int,
) -> list[int]:
    """
    Import concept over time analyses from a DataFrame into a project.
    Validates input data and ensures all required references (user) exist.

    Args:
        db: Database session
        df: DataFrame with COTA data
        project_id: ID of the project to import analyses into

    Returns:
        List of imported COTA IDs

    Raises:
        ImportCOTAError: If validation fails or any required references are missing
    """
    # Validate input data using our schema
    try:
        cota_collection = COTAExportCollection.from_dataframe(df)
    except ValueError as e:
        logger.error(f"Failed to load COTA import data: {e}")
        raise ImportCOTAError(
            errors=[f"Invalid data format for concept over time analyses: {e}"]
        )

    logger.info(
        f"Importing {len(cota_collection.cota_analyses)} concept over time analyses..."
    )

    error_messages = []

    # Transform the COTA analyses for import
    transformed_cotas: list[COTACreateIntern] = []
    for cota in cota_collection.cota_analyses:
        try:
            # 1. Transform concepts for import
            concepts = srsly.json_loads(cota.concepts)
            assert isinstance(concepts, list), "Concepts should be a list"
            concepts = [COTAConcept.model_validate(concept) for concept in concepts]
            transformed_concepts = [
                transform_concept_for_import(
                    db=db, project_id=project_id, concept=concept
                )
                for concept in concepts
            ]

            # 2. Transform timeline settings for import
            timeline_settings = COTATimelineSettings.model_validate_json(
                cota.timeline_settings
            )
            transformed_timeline_settings = transform_timeline_settings_for_import(
                db=db, settings=timeline_settings
            )

            # 3. Transform training settings for import
            training_settings = COTATrainingSettings.model_validate_json(
                cota.training_settings
            )
            transformed_training_settings = transform_training_settings_for_import(
                db=db, settings=training_settings
            )

        except Exception as e:
            error_messages.append(
                f"An error occurred for concept over time analysis '{cota.name}': {e}"
            )
            continue

        # 4. Create a COTACreateIntern object for each analysis
        transformed_cotas.append(
            COTACreateIntern(
                name=cota.name,
                project_id=project_id,
                concepts=srsly.json_dumps(jsonable_encoder(transformed_concepts)),
                timeline_settings=transformed_timeline_settings.model_dump_json(),
                training_settings=transformed_training_settings.model_dump_json(),
            )
        )

    # Raise an error if any of the checks failed
    if len(error_messages) > 0:
        logger.error(
            "The following errors occurred while importing concept over time analyses:\n"
            + "\n".join(error_messages)
        )
        raise ImportCOTAError(errors=error_messages)

    # Everything is fine, we can create the COTA analyses
    imported_cota_ids: list[int] = []
    for cota in transformed_cotas:
        created_analysis = crud_cota.create(
            db=db,
            create_dto=cota,
        )
        imported_cota_ids.append(created_analysis.id)
        logger.info(
            f"Successfully imported concept over time analysis: {created_analysis.name}"
        )

    logger.info(
        f"Successfully imported {len(imported_cota_ids)} concept over time analyses into project {project_id}"
    )
    return imported_cota_ids
