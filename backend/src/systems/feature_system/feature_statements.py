"""The SQL statements of `FeatureService`, private to it: only
`feature_service.py` imports this file."""

from typing import Iterable

from sqlalchemy.orm import Session

from core.project.project_crud import crud_project
from core.project.project_orm import ProjectORM
from systems.feature_system.feature_registry import Feature


def update_enabled_features(
    db: Session, *, project_id: int, features: Iterable[Feature]
) -> ProjectORM:
    """Store the names of the enabled features of the project, sorted. The
    caller has locked the project (FOR NO KEY UPDATE)."""
    db_obj = crud_project.read(db=db, id=project_id)
    db_obj.enabled_features = sorted(f.name for f in features)
    db.add(db_obj)
    db.flush()
    return db_obj
