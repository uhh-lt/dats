from typing import List, Set

import pandas as pd
import srsly
from core.project.project_crud import crud_project
from fastapi.encoders import jsonable_encoder
from loguru import logger
from modules.analysis.cota.concept_over_time_analysis_crud import crud_cota
from modules.analysis.cota.concept_over_time_analysis_dto import (
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
from sqlalchemy.orm import Session


class ImportCOTAError(Exception):
    """Exception raised when COTA import fails."""

    def __init__(self, errors: List[str]) -> None:
        super().__init__(
            f"Errors occurred while importing concept over time analyses: {errors}"
        )
        self.errors = errors


def import_cota_to_proj(
    db: Session,
    df: pd.DataFrame,
    project_id: int,
) -> List[int]:
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

    # Get the project
    error_messages = []
    project = crud_project.read(db=db, id=project_id)

    # COTA analyses need Users. We need to check if they exist in the project:
    user_emails: Set[str] = set()
    for cota in cota_collection.cota_analyses:
        user_emails.add(cota.user_email)
    project_user_emails = {user.email: user for user in project.users}
    for email in user_emails:
        if email not in project_user_emails:
            error_messages.append(
                f"User '{email}' is not part of the project {project_id}"
            )

    # Transform the COTA analyses for import
    transformed_cotas: List[COTACreateIntern] = []
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
        user = project_user_emails.get(cota.user_email, None)
        if user is None:
            continue

        transformed_cotas.append(
            COTACreateIntern(
                name=cota.name,
                project_id=project_id,
                user_id=project_user_emails[cota.user_email].id,
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
    imported_cota_ids: List[int] = []
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
