# Feature system

The toggleable features: their declarations (`feature_registry.py`), the requirement resolution and the gating of routes and jobs (`feature_service.py`, `feature_dependency.py`), and the features of a project: their status and the actions Enable, Complete and Disable (`feature_endpoint.py`). The terms are in `GLOSSARY.md`.

The feature system imports `modules/doc_processing`, which plans the steps of the documents (`StepPlanningService`) and knows which steps a feature needs (`pipeline/step_planning.py`). This is a temporary exemption of the layering lint (`backend/lint/check_core.py`) until document processing moves to `core` ([uhh-lt/dats#900](https://github.com/uhh-lt/dats/issues/900)).

## Feature status

`FeatureService.read_project_features` derives the status from the step statuses and the pending feature activations. Nothing stores it.

| Status           | Meaning                                                                                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Disabled         | The project does not use the feature.                                                                                                               |
| Computing        | Work for the feature is queued or running: a step of it is processing, or a feature activation of it (or of a feature that requires it) is pending. |
| Partly available | Nothing is running, and some documents lack the feature's data.                                                                                     |
| Fully available  | Every document has the feature's data.                                                                                                              |

## Actions

One endpoint per action: `POST /feature/project/{project_id}/{feature}/{enable|complete|disable}`.

| Action   | What it does                                                        | Allowed when              |
| -------- | ------------------------------------------------------------------- | ------------------------- |
| Enable   | Turns the feature on and computes its data for all documents.       | Disabled                  |
| Complete | Computes the data for the documents that lack it, failed steps too. | Partly available          |
| Disable  | Turns the feature off. The computed data stays.                     | Partly or fully available |

`StepPlanningService` (`modules/doc_processing`) carries out Enable and Complete: it starts a feature activation job, which plans and starts the steps in batches. The feature is computing from the request on.

Disable is also rejected (400) while an enabled feature requires the feature, and (409) while a step that only this feature makes possible is processing. So no step is ever unplanned while its job may run.

There is no Restart and no cancel.

## Status by action

| Status \ Action  | Enable | Complete | Disable |
| ---------------- | ------ | -------- | ------- |
| Disabled         | yes    | 409      | 409     |
| Computing        | 409    | 409      | 409     |
| Partly available | 409    | yes      | yes     |
| Fully available  | 409    | 409      | yes     |

`ALLOWED_STATUSES` in `feature_service.py` is this table, and `FeatureService.assert_action_allowed` checks it after `StepPlanningService` has locked the project. The Features tab shows only the allowed actions.

When a step fails, it becomes erroneous and the feature partly available: see the failure rule in [`systems/artefact_system/README.md`](../artefact_system/README.md).
