import json
from pathlib import Path

from loguru import logger
from pydantic import ValidationError
from sqlalchemy.orm import Session

from modules.eximport.import_exceptions import ImportProjectDetailsError
from modules.eximport.project.project_export_schema import (
    ProjectDetailsExportSchema,
)
from systems.feature_system.feature_registry import Feature, feature_registry
from systems.feature_system.feature_service import FeatureService

# The feature DATS no longer has: image captions are always computed. Archives
# of an earlier version may still enable it.
_REMOVED_FEATURE = "image_captions"


def read_project_details(path: Path) -> ProjectDetailsExportSchema:
    """Read and validate the project details file of a project archive."""
    try:
        with open(path) as f:
            return ProjectDetailsExportSchema.model_validate(json.load(f))
    except (ValueError, ValidationError) as e:
        raise ImportProjectDetailsError(errors=[f"Invalid project details: {e}"])


def archived_features(details: ProjectDetailsExportSchema | None) -> list[Feature]:
    """The features to enable for the archive's project details. Archives
    exported before the feature toggles have no project details: the features a
    new project enables are enabled (`default_enabled`). Drops features DATS no
    longer has and rejects features this DATS version does not know (e.g. of an
    archive exported by a newer version)."""
    if details is None:
        return feature_registry.defaults()

    archived = [f for f in details.enabled_features if f != _REMOVED_FEATURE]
    known = set(feature_registry.names())
    unknown = [f for f in archived if f not in known]
    if unknown:
        raise ImportProjectDetailsError(
            errors=[
                f"The archive enables features this DATS version does not know: "
                f"{', '.join(repr(f) for f in unknown)}. Known features: "
                f"{', '.join(sorted(known))}."
            ]
        )
    return [FeatureService().read_by_name(name=name) for name in archived]


def import_project_details_to_proj(
    db: Session,
    features: list[Feature],
    project_id: int,
) -> None:
    """Enable the features of the archive's project (`archived_features`) in addition to the features the project enables already: an import
    never disables a feature. The import plans no steps: features whose data the
    archive lacks are partly available until a user completes them in the project
    settings (`FeatureService.add_features`)."""
    enabled = FeatureService().add_features(
        db=db, project_id=project_id, features=features
    )
    logger.info(
        f"Enabled the features {[f.name for f in enabled]} in project {project_id}"
    )
