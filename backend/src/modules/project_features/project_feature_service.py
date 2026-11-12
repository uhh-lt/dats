from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from common.feature_enum import Feature, FeatureStatus
from common.job_type_enum import JobType
from common.singleton_meta import SingletonMeta
from core.doc.source_document_status_rules import count_step_sets
from core.doc.source_document_step_status_crud import crud_sdoc_step_status
from core.project.project_crud import crud_project
from modules.doc_processing.pipeline.pipeline_graph import pipeline_registry
from modules.doc_processing.pipeline.step_planning import feature_steps
from modules.project_features.project_feature_dto import ProjectFeatureRead
from systems.feature_system.feature_registry import feature_registry


class ProjectFeatureService(metaclass=SingletonMeta):
    """The state of the features of a project: which features it enables and
    how far they are computed. `StepPlanningService` enables, restarts and
    disables them."""

    def __new__(cls, *args, **kwargs):
        return super(ProjectFeatureService, cls).__new__(cls)

    # --- state of the features

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
        activating = feature_registry.closure(
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
        graph = pipeline_registry.graph()
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
            missing = {s for c in per_doctype for s in c.missing_steps}
            result.append(
                ProjectFeatureRead(
                    feature=feature,
                    enabled=feature in enabled,
                    status=_status(
                        enabled=feature in enabled,
                        activating=feature in activating,
                        processing=processing,
                        lacking=failed + not_planned,
                    ),
                    ready=ready == total,
                    covered_documents=ready,
                    processing_documents=processing,
                    failed_documents=failed,
                    not_planned_documents=not_planned,
                    total_documents=total,
                    missing_steps=[s for s in JobType if s in missing],
                )
            )
        return result


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
