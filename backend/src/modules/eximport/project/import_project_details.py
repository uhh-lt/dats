import json
from pathlib import Path

from loguru import logger
from pydantic import ValidationError
from sqlalchemy.orm import Session

from common.feature_enum import Feature
from core.project.project_crud import crud_project
from core.project.project_dto import ProjectUpdate
from modules.eximport.import_exceptions import ImportProjectDetailsError
from modules.eximport.project.project_export_schema import (
    ProjectDetailsExportSchema,
)
from systems.feature_system.feature_service import FeatureService


def read_project_details(path: Path) -> ProjectDetailsExportSchema:
    """Read and validate the project details file of a project archive."""
    try:
        with open(path) as f:
            return ProjectDetailsExportSchema.model_validate(json.load(f))
    except (ValueError, ValidationError) as e:
        raise ImportProjectDetailsError(errors=[f"Invalid project details: {e}"])


def archived_features(details: ProjectDetailsExportSchema | None) -> list[Feature]:
    """The features to enable for the archive's project details. Archives exported
    before the feature toggles have no project details: all features are enabled,
    as in a project of that time. Rejects features this DATS version does not know
    (e.g. of an archive exported by a newer version)."""
    if details is None:
        return list(Feature)

    known = {f.value for f in Feature}
    unknown = [f for f in details.enabled_features if f not in known]
    if unknown:
        raise ImportProjectDetailsError(
            errors=[
                f"The archive enables features this DATS version does not know: "
                f"{', '.join(repr(f) for f in unknown)}. Known features: "
                f"{', '.join(sorted(known))}."
            ]
        )
    return [Feature(f) for f in details.enabled_features]


def import_project_details_to_proj(
    db: Session,
    details: ProjectDetailsExportSchema | None,
    project_id: int,
) -> None:
    """Restore the enabled features of the archive's project, and the features
    they require. The steps of the features are planned after the import (see
    `ImportService.plan_missing_steps`), once the documents are committed."""
    features = FeatureService().resolve_enabled_features(
        requested=archived_features(details)
    )
    crud_project.update(
        db=db,
        id=project_id,
        update_dto=ProjectUpdate(enabled_features=features),
    )
    logger.info(
        f"Enabled the features {[f.value for f in features]} in project {project_id}"
    )
