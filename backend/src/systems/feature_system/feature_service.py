from typing import Iterable

from sqlalchemy.orm import Session

from common.feature_enum import Feature
from common.singleton_meta import SingletonMeta
from core.project.project_crud import crud_project
from systems.feature_system.feature_dto import FeatureRead
from systems.feature_system.feature_exceptions import (
    FeatureDisabledError,
    FeatureStillRequiredError,
)
from systems.feature_system.feature_registry import feature_registry


class FeatureService(metaclass=SingletonMeta):
    """The toggleable features: which features exist, which features a set of
    features requires, and whether a project enables a feature. What the
    features of a project mean for its documents is in `StepPlanningService`
    (`modules/doc_processing`, the planning) and `ProjectFeatureService`
    (`modules/project_features`, the state of the features)."""

    def __new__(cls, *args, **kwargs):
        cls.registry = feature_registry
        return super(FeatureService, cls).__new__(cls)

    def read_all(self) -> list[FeatureRead]:
        """All toggleable features, in the order of the `Feature` enum."""
        return [
            FeatureRead(
                feature=d.feature,
                requires_features=[f for f in Feature if f in d.requires_features],
            )
            for d in self.registry.declarations()
        ]

    def resolve_enabled_features(
        self, *, requested: Iterable[Feature], current: Iterable[Feature] = ()
    ) -> list[Feature]:
        """The features to store as enabled when `requested` are asked for: they
        and the features they require. Rejects disabling a feature of `current`
        that a requested feature requires."""
        requested = frozenset(requested)
        for feature in frozenset(current) - requested:
            required_by = [
                f
                for f in Feature
                if f in requested and feature in self.registry.closure([f]) - {f}
            ]
            if required_by:
                raise FeatureStillRequiredError(
                    feature=feature, required_by=required_by
                )
        enabled = self.registry.closure(requested)
        return [f for f in Feature if f in enabled]

    def assert_enabled(self, *, db: Session, project_id: int, feature: Feature) -> None:
        """Raise a `FeatureDisabledError` (403) if the feature is not enabled in
        the project."""
        project = crud_project.read(db=db, id=project_id)
        if feature.value not in project.enabled_features:
            raise FeatureDisabledError(project_id=project_id, feature=feature)
