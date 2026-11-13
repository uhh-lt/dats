from typing import Iterable

from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from common.feature_enum import Feature, FeatureAction, FeatureStatus
from common.job_type_enum import JobType
from common.singleton_meta import SingletonMeta
from core.project.project_crud import crud_project
from modules.doc_processing.pipeline.step_planning import feature_steps
from systems.artefact_system.artefact_registry import artefact_registry
from systems.artefact_system.source_document_status_rules import count_step_sets
from systems.artefact_system.source_document_step_status_crud import (
    crud_sdoc_step_status,
)
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
    features of a project and which actions it allows (see the README next
    to this file). `StepPlanningService` (`modules/doc_processing`) carries
    out the actions: it plans the steps of the documents."""

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
        """The state of every feature in the project. Per feature, each document
        it applies to counts once, by the status of the feature's steps
        (`step_set_status`: processing, else failed, else not planned, else
        ready). The counts are computed in one aggregate query. A feature with a
        pending activation, or required by one, is computing until the
        activation job has planned all documents."""
        project = crud_project.read(db=db, id=project_id)
        enabled = {Feature(f) for f in project.enabled_features}
        activating = self.registry.closure(
            Feature(f) for f in project.feature_activations
        )

        # 1) the steps of each feature per doctype it applies to
        steps = {
            feature: {
                doctype: step_set
                for doctype in DocType
                if (
                    step_set := frozenset(
                        feature_steps(doctype=doctype, feature=feature, enabled=enabled)
                    )
                )
            }
            for feature in Feature
        }

        # 2) the documents per doctype by the status of these steps
        graph = artefact_registry.graph()
        counts = count_step_sets(
            combinations=crud_sdoc_step_status.count_by_project(
                db=db,
                project_id=project_id,
                steps=[s for s in JobType if s in graph.all_steps()],
            ),
            step_sets={
                doctype: {s[doctype] for s in steps.values() if doctype in s}
                for doctype in DocType
            },
        )

        # 3) sum up per feature
        result: list[ProjectFeatureRead] = []
        for feature in Feature:
            per_doctype = [
                counts[doctype][step_set]
                for doctype, step_set in steps[feature].items()
            ]
            total = sum(c.total for c in per_doctype)
            ready = sum(c.ready for c in per_doctype)
            processing = sum(c.processing for c in per_doctype)
            failed = sum(c.failed for c in per_doctype)
            not_planned = sum(c.not_planned for c in per_doctype)
            lacking = failed + not_planned
            missing = {s for c in per_doctype for s in c.missing_steps}
            result.append(
                ProjectFeatureRead(
                    feature=feature,
                    enabled=feature in enabled,
                    status=_status(
                        enabled=feature in enabled,
                        activating=feature in activating,
                        processing=processing,
                        lacking=lacking,
                    ),
                    ready=ready == total,
                    covered_documents=ready,
                    processing_documents=processing,
                    failed_documents=failed,
                    not_planned_documents=not_planned,
                    lacking_documents=lacking,
                    total_documents=total,
                    missing_steps=[s for s in JobType if s in missing],
                )
            )
        return result

    def assert_action_allowed(
        self, *, db: Session, project_id: int, feature: Feature, action: FeatureAction
    ) -> None:
        """Raise a `FeatureActionNotAllowedError` (409) if the action is not
        allowed in the feature's status (`ALLOWED_STATUSES`). The caller locks
        the project first (`StepPlanningService`)."""
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


def _status(
    *, enabled: bool, activating: bool, processing: int, lacking: int
) -> FeatureStatus:
    """The status of a feature from its pending activation and the counts of
    its documents."""
    if not enabled:
        return FeatureStatus.DISABLED
    if activating or processing > 0:
        return FeatureStatus.COMPUTING
    if lacking > 0:
        return FeatureStatus.PARTLY_AVAILABLE
    return FeatureStatus.FULLY_AVAILABLE
