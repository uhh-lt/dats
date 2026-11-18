---
applyTo: "backend/src/systems/artefact_system/**,backend/src/systems/feature_system/**"
paths:
  - "backend/src/systems/artefact_system/**"
  - "backend/src/systems/feature_system/**"
---

# Backend Artefact and Feature Systems

The invariants of the two systems; `systems/artefact_system/README.md` and `systems/feature_system/README.md` explain them, and `backend-module.instructions.md` says how modules use them.

## Boundaries

- The artefact system knows artefacts and steps, never features, and never imports the feature system, which talks to it in artefacts only.
- The job system knows no pipeline: the job handler calls the started and finished hooks, RQ's failure callback (`job_handler.rq_job_failed`) calls the failed hook, and `bootstrap.register_jobs` registers the functions of `step_execution.py` for them.
- Never call the failed hook anywhere else, as RQ calls the failure callback once per failed job, also when its worker died, and `DATSWorker` calls it for a job process that died or that it stopped (`handle_work_horse_killed`, `handle_job_failure`).
- Only `PipelineGraph` derives which step feeds which (`inputs`, `successors`, `descendants`, `steps_for`, `producer`); never walk the `requires` and `produces` of the declarations elsewhere.

## Who writes what

- Only `crud_sdoc_step_status` (the generic reads and writes), `source_document_status_rules.py` and the planning statements of `ArtefactService` in `artefact_statements.py` touch the rows of `sourcedocumentstepstatus`, where no row means not planned.
- The status of a document and of the steps some artefacts need are derived from the step rows in `source_document_status_rules.py` only and never stored.
- Only the operations of `ArtefactService` write planning rows and `project.artefact_computations` and start the artefact computation job, with their SQL in `artefact_statements.py`, which only that service imports and no CRUD offers.
- Only `FeatureService` writes `project.enabled_features` (its private `_update_enabled_features`, called by Enable, Disable and `add_features`), never `ProjectUpdate`.
- Every action locks the project with `crud_project.read_locked` first, and the computation batches and the upload take the project share lock before they plan, in the lock order of the artefact system README.

## Rules

- One failure rule: whatever goes wrong (the job raises, its input cannot be built, the queue is unreachable, its worker died), the step and the pending steps after it become erroneous on every start path, and Complete or Recompute retries it.
- A step that cannot run because its input failed is erroneous, never processing: a failed job fails its pending successors, and planning fails a step whose input is erroneous.
- Enable and Complete plan nothing in the request: they store a pending artefact computation and start its job before the commit, and the job plans in batches of one transaction each and removes the pending computation at its end or in its failure callback.
- A computation plans the steps of the core artefacts and of its own artefacts where they apply, and never the missing data of other artefacts.
- Each action is allowed only in the statuses of `ALLOWED_STATUSES` and answers 409 otherwise, so every action is rejected while a feature is computing.
- Disable changes only the enabled features, calls nothing in the artefact system and never unplans a step.
- Set up (Enable, project creation, import) creates the system codes the artefacts declare first, failing with 409 on a user code of a declared name, and then runs the feature's `set_up` hook.
- A name in a request is looked up strictly (404 for an unknown one), and a stored name of something no longer registered is ignored and dropped at the next write.
- The export reads an artefact only if its step finished and keeps it only if its archive says it is complete, the import writes it only if its step was imported as finished, and neither names an artefact (`artefact_registry.archives()`).
- An import restores only what the archive holds, rejects document archives without `step_status`, adds the archive's features with `FeatureService.add_features` (never disabling one) and plans no steps.
- Keep `test_new_pipeline_step.py`, which declares a step in a test and follows it through the pipeline, passing when the pipeline changes.
