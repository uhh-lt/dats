"""The SQL statements of `FeatureService`, private to it: only
`feature_service.py` imports this file."""

from sqlalchemy.orm import Session

from common.feature_enum import Feature
from core.project.project_crud import crud_project
from core.project.project_orm import ProjectORM


def update_enabled_features(
    db: Session, *, project_id: int, features: list[Feature]
) -> ProjectORM:
    """Store the enabled features of the project. Only
    `FeatureService.resolve_enabled_features` decides them (it adds the
    required features and rejects invalid changes). The caller has locked the
    project (FOR NO KEY UPDATE)."""
    db_obj = crud_project.read(db=db, id=project_id)
    db_obj.enabled_features = list(features)
    db.add(db_obj)
    db.flush()
    return db_obj
