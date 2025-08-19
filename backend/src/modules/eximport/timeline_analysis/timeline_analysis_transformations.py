from sqlalchemy.orm import Session

from modules.timeline_analysis.timeline_analysis_dto import (
    TimelineAnalysisConcept,
    TimelineAnalysisConceptForExport,
    TimelineAnalysisSettings,
    TimelineAnalysisSettingsForExport,
)
from systems.search_system.filtering import Filter


def transform_settings_for_export(
    db: Session, settings: TimelineAnalysisSettings
) -> TimelineAnalysisSettingsForExport:
    """
    Transform timeline analysis settings for export.

    Args:
        db: Database session
        settings: The settings to transform

    Returns:
        Transformed settings
    """
    return TimelineAnalysisSettingsForExport(
        group_by=settings.group_by,
        annotation_aggregation_type=settings.annotation_aggregation_type,
    )


def transform_settings_for_import(
    db: Session, settings: TimelineAnalysisSettingsForExport
) -> TimelineAnalysisSettings:
    """
    Transform timeline analysis settings for import.

    Args:
        db: Database session
        settings: The settings to transform

    Returns:
        Transformed settings
    """
    return TimelineAnalysisSettings(
        group_by=settings.group_by,
        annotation_aggregation_type=settings.annotation_aggregation_type,
        date_metadata_id=None,
    )


def transform_concept_for_export(
    db: Session, concept: TimelineAnalysisConcept
) -> TimelineAnalysisConceptForExport:
    """
    Transform a single timeline analysis concept for export.

    Args:
        db: Database session
        concept: The concept to transform

    Returns:
        Transformed concept
    """
    # Create a copy to avoid modifying the original
    transformed = concept.model_copy()

    # Transform the ta_specific_filter: Resolve IDs to names
    transformed.ta_specific_filter.filter = Filter.resolve_ids(
        transformed.ta_specific_filter.filter, db=db
    )

    return TimelineAnalysisConceptForExport(
        timeline_analysis_type=transformed.timeline_analysis_type,
        id=transformed.id,
        name=transformed.name,
        description=transformed.description,
        color=transformed.color,
        visible=transformed.visible,
        ta_specific_filter=transformed.ta_specific_filter,
    )


def transform_concept_for_import(
    db: Session,
    project_id: int,
    concept: TimelineAnalysisConceptForExport,
) -> TimelineAnalysisConcept:
    """
    Transform a single timeline analysis concept for import.

    Args:
        db: Database session
        concept: The concept to transform

    Returns:
        Transformed concept
    """
    # Create a copy to avoid modifying the original
    transformed = concept.model_copy()

    # Transform the ta_specific_filter: Resolve IDs to names
    transformed.ta_specific_filter.filter = Filter.resolve_names(
        transformed.ta_specific_filter.filter, db=db, project_id=project_id
    )

    return TimelineAnalysisConcept(
        id=transformed.id,
        timeline_analysis_type=transformed.timeline_analysis_type,
        name=transformed.name,
        color=transformed.color,
        description=transformed.description,
        visible=transformed.visible,
        ta_specific_filter=transformed.ta_specific_filter,
        filter_hash=0,  # Placeholder, will be computed later
        results=[],  # Placeholder, will be populated later
    )
