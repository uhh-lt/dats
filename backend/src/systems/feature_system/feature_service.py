from typing import Iterable

from sqlalchemy.orm import Session

from common.artefact_enum import Artefact
from common.feature_enum import Feature, FeatureAction, FeatureStatus
from common.singleton_meta import SingletonMeta
from core.project.project_crud import crud_project
from core.project.project_dto import ProjectRead
from systems.artefact_system.artefact_dto import ProcessingSettings
from systems.artefact_system.artefact_service import ArtefactService
from systems.feature_system import feature_statements as statements
from systems.feature_system.feature_dto import FeatureRead, ProjectFeatureRead
from systems.feature_system.feature_exceptions import (
    FeatureActionNotAllowedError,
    FeatureDisabledError,
    FeatureStillRequiredError,
)
from systems.feature_system.feature_registry import feature_registry

# the feature statuses in which a user may take each action
ALLOWED_STATUSES = {
    FeatureAction.ENABLE: [FeatureStatus.DISABLED],
    FeatureAction.COMPLETE: [FeatureStatus.PARTLY_AVAILABLE],
    FeatureAction.DISABLE: [
        FeatureStatus.PARTLY_AVAILABLE,
        FeatureStatus.FULLY_AVAILABLE,
    ],
}


class FeatureService(metaclass=SingletonMeta):
    """The toggleable features: which features exist, which features a set of
    features requires, whether a project enables a feature, the status of the
    features of a project, which actions it allows and the actions Enable,
    Complete and Disable (see the README next to this file). It talks to the
    artefact system in artefacts only: Enable and Complete compute the
    artefacts of the feature, the upload plans with the artefact demand of the
    project (`read_artefact_demand`). Its operations are the only code that
    changes `project.enabled_features`; their SQL is private to it, in
    `feature_statements.py`. Every action first locks the project
    (FOR NO KEY UPDATE)."""

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

    # --- state of the features of a project

    def read_project_features(
        self, *, db: Session, project_id: int
    ) -> list[ProjectFeatureRead]:
        """The state of every feature in the project, from the availability of
        its artefacts (`ArtefactService.read_availability`): each document
        they apply to counts once, by the status of the steps they need. A
        feature whose artefacts a pending artefact computation computes is
        computing until the computation has planned all documents."""
        project = crud_project.read(db=db, id=project_id)
        enabled = {Feature(f) for f in project.enabled_features}
        artefacts = {
            feature: self.registry.required_artefacts([feature]) for feature in Feature
        }
        availability = ArtefactService().read_availability(
            db=db, project_id=project_id, artefact_sets=set(artefacts.values())
        )

        result: list[ProjectFeatureRead] = []
        for feature in Feature:
            a = availability[artefacts[feature]]
            lacking = a.failed + a.not_planned
            result.append(
                ProjectFeatureRead(
                    feature=feature,
                    enabled=feature in enabled,
                    status=_status(
                        enabled=feature in enabled,
                        computing=a.pending,
                        processing=a.processing,
                        lacking=lacking,
                    ),
                    ready=a.ready == a.total,
                    covered_documents=a.ready,
                    processing_documents=a.processing,
                    failed_documents=a.failed,
                    not_planned_documents=a.not_planned,
                    lacking_documents=lacking,
                    total_documents=a.total,
                )
            )
        return result

    def read_artefact_demand(
        self, *, db: Session, project_id: int
    ) -> frozenset[Artefact]:
        """The artefacts the project's enabled features require (its artefact
        demand). Takes the project share lock (FOR SHARE), so the caller plans
        with a demand no concurrent action can change until it commits."""
        project = crud_project.read_locked(db=db, id=project_id, shared=True)
        return self.registry.required_artefacts(
            Feature(f) for f in project.enabled_features
        )

    def assert_action_allowed(
        self, *, db: Session, project_id: int, feature: Feature, action: FeatureAction
    ) -> None:
        """Raise a `FeatureActionNotAllowedError` (409) if the action is not
        allowed in the feature's status (`ALLOWED_STATUSES`). The caller locks
        the project first (the actions below)."""
        status = next(
            f.status
            for f in self.read_project_features(db=db, project_id=project_id)
            if f.feature == feature
        )
        if status not in ALLOWED_STATUSES[action]:
            raise FeatureActionNotAllowedError(
                feature=feature,
                action=action,
                status=status,
                allowed=ALLOWED_STATUSES[action],
            )

    # --- the actions

    def enable_feature(
        self,
        *,
        db: Session,
        project_id: int,
        feature: Feature,
        settings: ProcessingSettings,
    ) -> ProjectRead:
        """Enable the disabled feature and the features it requires, and compute
        their artefacts for the documents that lack them
        (`ArtefactService.compute`) on the low-priority queue with these
        settings. Returns the project."""
        project = crud_project.read_locked(db=db, id=project_id)
        self.assert_action_allowed(
            db=db, project_id=project_id, feature=feature, action=FeatureAction.ENABLE
        )
        current = {Feature(f) for f in project.enabled_features}
        enabled = self.resolve_enabled_features(
            requested=current | {feature}, current=current
        )
        statements.update_enabled_features(
            db=db, project_id=project_id, features=enabled
        )
        ArtefactService().compute(
            db=db,
            project_id=project_id,
            artefacts=self.registry.required_artefacts([feature]),
            settings=settings,
        )
        return ProjectRead.model_validate(crud_project.read(db=db, id=project_id))

    def complete_feature(
        self,
        *,
        db: Session,
        project_id: int,
        feature: Feature,
        settings: ProcessingSettings,
    ) -> ProjectRead:
        """Complete the partly available feature: compute its artefacts for the
        documents that lack them, the erroneous steps included, like
        `enable_feature`. Returns the project."""
        crud_project.read_locked(db=db, id=project_id)
        self.assert_action_allowed(
            db=db,
            project_id=project_id,
            feature=feature,
            action=FeatureAction.COMPLETE,
        )
        ArtefactService().compute(
            db=db,
            project_id=project_id,
            artefacts=self.registry.required_artefacts([feature]),
            settings=settings,
        )
        return ProjectRead.model_validate(crud_project.read(db=db, id=project_id))

    def disable_feature(
        self, *, db: Session, project_id: int, feature: Feature
    ) -> ProjectRead:
        """Disable the partly or fully available feature: it is hidden and its
        artefacts are not computed for new documents anymore; the stored data
        and the step statuses are kept. Rejects disabling a feature that
        another enabled feature requires. Returns the project."""
        project = crud_project.read_locked(db=db, id=project_id)
        self.assert_action_allowed(
            db=db, project_id=project_id, feature=feature, action=FeatureAction.DISABLE
        )
        current = {Feature(f) for f in project.enabled_features}
        enabled = self.resolve_enabled_features(
            requested=current - {feature}, current=current
        )
        statements.update_enabled_features(
            db=db, project_id=project_id, features=enabled
        )
        return ProjectRead.model_validate(crud_project.read(db=db, id=project_id))

    def add_features(
        self, *, db: Session, project_id: int, features: list[Feature]
    ) -> list[Feature]:
        """Enable the features and the features they require in addition to the
        enabled ones, without computing any artefact (a project import:
        features whose data is missing are partly available until a user
        completes them). Returns the enabled features."""
        project = crud_project.read_locked(db=db, id=project_id)
        current = {Feature(f) for f in project.enabled_features}
        enabled = self.resolve_enabled_features(
            requested=current | set(features), current=current
        )
        statements.update_enabled_features(
            db=db, project_id=project_id, features=enabled
        )
        return enabled


def _status(
    *, enabled: bool, computing: bool, processing: int, lacking: int
) -> FeatureStatus:
    """The status of a feature from the pending computation of its artefacts
    and the counts of its documents."""
    if not enabled:
        return FeatureStatus.DISABLED
    if computing or processing > 0:
        return FeatureStatus.COMPUTING
    if lacking > 0:
        return FeatureStatus.PARTLY_AVAILABLE
    return FeatureStatus.FULLY_AVAILABLE
