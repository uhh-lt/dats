# Artefact system

The artefacts and the pipeline steps that produce them: the step declarations (`@pipeline_step`, `artefact_registry.py`), the graph between them (`pipeline_graph.py`), the step planning and the availability of artefacts (`artefact_service.py`), the step runs (`step_run.py`) and the step statuses (`source_document_step_status_*.py`, `source_document_status_rules.py`). It knows artefacts and steps, never features: the feature system passes it artefacts. The terms are in `GLOSSARY.md`.

## What it is asked

| Call                                  | Caller                                    | What it does                                                                                                                         |
| ------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `ArtefactService.compute`             | Enable and Complete of a feature          | Stores a pending artefact computation of the feature's artefacts and starts its job, which plans and starts the steps in batches.   |
| `ArtefactService.read_availability`   | The feature status                        | Counts the documents per artefact set: ready, processing, failed, not planned; and whether a computation of them is pending.         |
| `ArtefactService.plan_document`       | The upload (`sdoc_init`)                  | Plans the steps of the core artefacts and of the project's artefact demand for a new document; returns its root steps to start.      |
| `start_steps`                         | Advancing, upload, computation, Recompute | Starts the jobs of some steps of a document.                                                                                         |

Disable calls nothing: the stored data and the step statuses stay. A computation plans the steps of the core artefacts and of its artefacts, if they apply to the doctype, and plans their erroneous steps again; it never plans the steps of other artefacts.

## Lock order

Every planning first locks the project row (`crud_project.read_locked`: FOR NO KEY UPDATE to change the enabled features or the pending computations, FOR SHARE to plan a new document or a batch of a computation), then the documents it plans per doctype in the order of `DocType`, ascending by id within a doctype (FOR NO KEY UPDATE). A change of the features waits for the batch in progress; an upload and a batch plan side by side (the upload plans a new document, which is not in the batch); a status change of a document waits for the planning of that document, so the planning never misses a step that finishes while it plans. The feature system only ever locks the project row. A writer outside this order could deadlock or lose a planning without any test failing.

The upload reads the artefact demand under the project share lock (`FeatureService.read_artefact_demand`) and plans with it in the same transaction, so a concurrent Enable waits for the upload and plans its steps for the new document too, or the upload plans them.

Enable and Complete start the computation job before their transaction commits: the job's first statement is a share lock on the project, which waits for the request's lock, so the job reads the committed state. If the enqueue fails, the request rolls back; if the request rolls back after the enqueue, the job finds no pending computation with its id and stops.

## Step runs

A step run is one run of a job for some of the steps of one document. A finished step starts its planned successors with a bare `SdocProcessingJobInput`, and the successor's enricher loads its input from the stored data. The jobs that create documents (the entry points `crawler`, `extract_archive`, `doc_chunking`, `extract_html` and `sdoc_init`) start what follows them themselves, at the end of their handlers.

## Failures

One rule: whatever goes wrong, the step becomes erroneous, with the pending steps after it. Complete retries it; Recompute in the document health view does too.

| What goes wrong                                                 | The step becomes                                                                         | How the user recovers |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------- |
| A step job raises                                               | erroneous                                                                                | Complete or Recompute |
| A step job cannot start: its input data is missing              | erroneous                                                                                | Complete or Recompute |
| A step job cannot start: the queue (Redis) is down              | erroneous (computation, advancing and recompute alike)                                   | Complete or Recompute |
| A worker dies in the middle of a step                           | erroneous, once RQ notices (see below)                                                   | Complete or Recompute |
| A worker dies in the middle of an artefact computation          | the computation ends, the documents it did not reach stay not planned: partly available  | Complete              |
| The queue is down when Enable or Complete starts the computation | nothing changes; the request answers 503                                                | Try again             |

`start_steps` applies the rule for every start path. The failed hook (`step_run.handle_job_error`) applies it for every failed job; for an artefact computation it removes the pending computation instead, so its artefacts are no longer pending.

Accepted gap: a process dies after it wrote "processing" and before it queued the job (the backend in an upload, a worker between a computation batch's commit and its starts, or between a finished step and its successors). The step stays processing without a job, and the feature stays Computing. Recompute in the document health view starts it.

Known gap: a step that commits finished just before a planning can start a successor that the planning starts too; it computes twice.

## How a dead worker is noticed

DATS has no detector of its own. RQ reports a dead job through the job's failure callback, `job_handler.rq_job_failed`, which every job gets at enqueue (`on_failure`). It runs the failed hook once per failed job, also for an ordinary exception.

| Who dies                                     | Who calls the callback                                                                                                    | Delay (measured with RQ 2.12)                             |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| The job process of the forking GPU worker    | its worker, at once (`DATSWorker.handle_work_horse_killed`; RQ itself skips the callback there)                           | 0.15 s                                                    |
| A CPU or API worker (`SimpleWorker`)         | a live worker's maintenance (every 10 min) cleans the started jobs once the dead job's entry expired (job timeout + 60 s) | 13.3 min for a 60 s timeout; up to timeout + about 18 min |
| The GPU worker together with its job process | the same maintenance; the entry expires 90 s after the last heartbeat                                                     | 13.5 min                                                  |

Step jobs run on CPU and API workers with the default timeout of 1 hour, so a dead step worker is noticed after 1 to 1.3 hours. An artefact computation has a timeout of 1 day. The GPU parent holds no database connection; it connects only while it runs the callback (`worker._sql_connection`).
