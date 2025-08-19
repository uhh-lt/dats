from sqlalchemy.orm import Session

from modules.concept_over_time_analysis.cota_dto import (
    COTAConcept,
    COTATimelineSettings,
    COTATrainingSettings,
)


def transform_timeline_settings_for_export(
    db: Session, settings: COTATimelineSettings
) -> COTATimelineSettings:
    """
    Transform COTA timeline settings for export.

    Args:
        db: Database session
        settings: The settings to transform

    Returns:
        Transformed settings
    """
    # For COTA we only need to return a copy of the settings without the date_metadata_id
    # since that needs to be resolved after import
    return COTATimelineSettings(
        group_by=settings.group_by,
        threshold=settings.threshold,
        # Note: date_metadata_id is excluded as it's project-specific
    )


def transform_timeline_settings_for_import(
    db: Session, settings: COTATimelineSettings
) -> COTATimelineSettings:
    """
    Transform COTA timeline settings for import.

    Args:
        db: Database session
        settings: The settings to transform

    Returns:
        Transformed settings
    """
    return COTATimelineSettings(
        group_by=settings.group_by,
        threshold=settings.threshold,
        date_metadata_id=None,  # Will be set by the user after import
    )


def transform_training_settings_for_export(
    db: Session, settings: COTATrainingSettings
) -> COTATrainingSettings:
    """
    Transform COTA training settings for export.

    Args:
        db: Database session
        settings: The settings to transform

    Returns:
        Transformed settings
    """
    # Training settings don't require any transformation for export
    return COTATrainingSettings(
        search_space_topk=settings.search_space_topk,
        search_space_threshold=settings.search_space_threshold,
        min_required_annotations_per_concept=settings.min_required_annotations_per_concept,
        dimensionality_reduction_algorithm=settings.dimensionality_reduction_algorithm,
        layers=settings.layers,
        dimensions=settings.dimensions,
        epochs=settings.epochs,
    )


def transform_training_settings_for_import(
    db: Session, settings: COTATrainingSettings
) -> COTATrainingSettings:
    """
    Transform COTA training settings for import.

    Args:
        db: Database session
        settings: The settings to transform

    Returns:
        Transformed settings
    """
    # Training settings don't require any transformation for import
    return COTATrainingSettings(
        search_space_topk=settings.search_space_topk,
        search_space_threshold=settings.search_space_threshold,
        min_required_annotations_per_concept=settings.min_required_annotations_per_concept,
        dimensionality_reduction_algorithm=settings.dimensionality_reduction_algorithm,
        layers=settings.layers,
        dimensions=settings.dimensions,
        epochs=settings.epochs,
    )


def transform_concept_for_export(db: Session, concept: COTAConcept) -> COTAConcept:
    """
    Transform a single COTA concept for export.

    Args:
        db: Database session
        concept: The concept to transform

    Returns:
        Transformed concept
    """
    # Create a copy to avoid modifying the original
    return COTAConcept(
        id=concept.id,
        name=concept.name,
        description=concept.description,
        color=concept.color,
        visible=concept.visible,
    )


def transform_concept_for_import(
    db: Session,
    project_id: int,
    concept: COTAConcept,
) -> COTAConcept:
    """
    Transform a single COTA concept for import.

    Args:
        db: Database session
        project_id: Project ID
        concept: The concept to transform

    Returns:
        Transformed concept
    """
    # Create a copy to avoid modifying the original
    return COTAConcept(
        id=concept.id,
        name=concept.name,
        description=concept.description,
        color=concept.color,
        visible=concept.visible,
    )
