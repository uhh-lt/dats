# Feature system

The toggleable features: their declarations (`feature_registry.py`), the requirement resolution and the gating of routes and jobs (`feature_service.py`, `feature_dependency.py`), and the features of a project: their status and the actions Enable, Complete and Disable (`feature_endpoint.py`). The terms are in `GLOSSARY.md`.

The feature system talks to the artefact system (`systems/artefact_system`) in artefacts only; the artefact system never imports the feature system (`backend/lint/check_layering.py`).

## Declaring a feature

A module declares each of its features once, in its `*_feature.py`, and keeps the returned object as a module constant:

```python
WORD_FREQUENCY = register_feature(
    "word_frequency",
    title="Word Frequency Analysis",
    description="Count and compare the words of the documents.",
    area=FeatureArea.ANALYSIS,
    requires_artefacts={WORD_FREQUENCIES},
    default_enabled=True,
)
```

| Argument             | Meaning                                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| name                 | The text name, stored in `project.enabled_features` and named in the URLs; it never changes without a migration. |
| `title`, `description` | Shown by the frontend, which reads them from `GET /feature`, with the titles of the artefacts the feature requires besides the core artefacts (what enabling it computes). |
| `area`               | `FeatureArea`; features are listed by area, then by title.                                                     |
| `requires_artefacts` | The artefacts the feature reads; at least one of them is not a core artefact (`always`).                        |
| `default_enabled`    | Whether a new project without a feature list enables it.                                                       |
| `set_up`             | Optional hook `(db, project_id) -> None` that sets up what else the feature needs in a project (see below).      |

A feature requires artefacts only, never another feature, and exists only if it requires an artefact outside the core preprocessing pipeline: enabling it means more processing. Core declares no feature and checks no toggle.

Gated routes and jobs import the object (`project_router("/word-frequencies", ..., feature=WORD_FREQUENCY)`). The startup check rejects an unregistered artefact and a feature that requires only core artefacts, all problems in one error.

Names: a name a request names is read strictly (`FeatureService.read_by_name`: an unknown name answers 404, for the three actions and for `ProjectCreate.enabled_features`); a stored name is read tolerantly (an unregistered name is ignored and dropped at the next write of the enabled features).

Enable, the project creation and the project import set up the feature first (`FeatureService.set_up`): the set up of the artefact system (`ArtefactService.set_up`) creates the system codes the feature's artefacts declare, then the feature's `set_up` hook runs. A user code named like one of the codes makes Enable fail with 409 until it is renamed. Complete and Disable run no set up; Disable keeps the codes.

The `set_up` hook may create anything else the module needs in the project (metadata keys, tags, collections, rows of its own tables) before anything is computed; Keyword Statistics creates the metadata key `keywords` (`create_keywords_metadata` in `modules/keyword_statistics/keywords_artefact.py`). Its contract: it must be safe to run twice (Enable after a Disable runs it again), and Disable does not undo it. It runs in the complete project, on creation as on Enable (the metadata, the search index and the Weaviate tenants exist); a hook that raises at project creation leaves the project's directory, index and tenants behind. System codes are never created there: they stay declared on the artefacts (`Artefact.codes`), where the import and the startup check read them. The feature system calls the hook; the artefact system knows no features.

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

`FeatureService` carries out the actions after it locked the project. Enable and Complete pass the feature's artefacts to `ArtefactService.compute`, which starts an artefact computation job that plans and starts the steps in batches. The feature is computing from the request on; so is every feature that needs one of these artefacts. Disable only changes the enabled features and calls nothing in the artefact system. The upload of a document plans with the project's artefact demand (`FeatureService.read_artefact_demand`).

Disable never unplans a step: it only changes the enabled features; the step statuses and the computed data stay.

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
