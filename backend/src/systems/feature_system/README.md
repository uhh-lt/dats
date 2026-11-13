# Feature system

The toggleable features: their declarations (`feature_registry.py`), the requirement resolution and the gating of routes and jobs (`feature_service.py`, `feature_dependency.py`), and the features of a project: their status and the actions Enable, Complete and Disable (`feature_endpoint.py`). The terms are in `GLOSSARY.md`.

The feature system talks to the artefact system (`systems/artefact_system`) in artefacts only; the artefact system never imports the feature system (`backend/lint/check_core.py`).

## Feature status

`FeatureService.read_project_features` derives the status from the availability of the feature's artefacts (`ArtefactService.read_availability`): the step statuses of the documents they apply to and the pending artefact computations. Nothing stores it.

| Status           | Meaning                                                                                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Disabled         | The project does not use the feature.                                                                                                               |
| Computing        | Work for the feature is queued or running: a step of it is processing, or an artefact computation of one of its artefacts is pending.               |
| Partly available | Nothing is running, and some documents lack the feature's data.                                                                                     |
| Fully available  | Every document has the feature's data.                                                                                                              |

## Actions

One endpoint per action: `POST /feature/project/{project_id}/{feature}/{enable|complete|disable}`.

| Action   | What it does                                                        | Allowed when              |
| -------- | ------------------------------------------------------------------- | ------------------------- |
| Enable   | Turns the feature on and computes its data for all documents.       | Disabled                  |
| Complete | Computes the data for the documents that lack it, failed steps too. | Partly available          |
| Disable  | Turns the feature off. The computed data stays.                     | Partly or fully available |

`FeatureService` carries out the actions after it locked the project. Enable and Complete pass the feature's artefacts (those of the features it requires included) to `ArtefactService.compute`, which starts an artefact computation job that plans and starts the steps in batches. The feature is computing from the request on; so is every feature that needs one of these artefacts. Disable only changes the enabled features and calls nothing in the artefact system. The upload of a document plans with the project's artefact demand (`FeatureService.read_artefact_demand`).

Disable is also rejected (400) while an enabled feature requires the feature. Disable never unplans a step, as it is rejected while the feature is computing.

There is no Restart and no cancel.

## Status by action

| Status \ Action  | Enable | Complete | Disable |
| ---------------- | ------ | -------- | ------- |
| Disabled         | yes    | 409      | 409     |
| Computing        | 409    | 409      | 409     |
| Partly available | 409    | yes      | yes     |
| Fully available  | 409    | 409      | yes     |

`ALLOWED_STATUSES` in `feature_service.py` is this table, and `FeatureService.assert_action_allowed` checks it after the action has locked the project. The Features tab shows only the allowed actions.

When a step fails, it becomes erroneous and the feature partly available: see the failure rule in [`systems/artefact_system/README.md`](../artefact_system/README.md).
