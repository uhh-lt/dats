# Step planning and failures

A project enables features; a feature needs pipeline steps per document. This module plans the steps (`step_planning_service.py`) and runs them (`step_run.py`). The feature statuses and the actions Enable, Complete and Disable are in [`systems/feature_system/README.md`](../../systems/feature_system/README.md); this file holds what goes wrong while the steps run. The terms are in `GLOSSARY.md`.

## Failures

One rule: whatever goes wrong, the step becomes erroneous, with the pending steps after it. Complete retries it; Recompute in the document health view does too.

| What goes wrong                                                 | The step becomes                                                                       | How the user recovers |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------- |
| A step job raises                                               | erroneous                                                                              | Complete or Recompute |
| A step job cannot start: its input data is missing              | erroneous                                                                              | Complete or Recompute |
| A step job cannot start: the queue (Redis) is down              | erroneous (activation, advancing and recompute alike)                                  | Complete or Recompute |
| A worker dies in the middle of a step                           | erroneous, once RQ notices (see below)                                                 | Complete or Recompute |
| A worker dies in the middle of a feature activation             | the activation ends, the documents it did not reach stay not planned: partly available | Complete              |
| The queue is down when Enable or Complete starts the activation | nothing changes; the request answers 503                                               | Try again             |

`start_steps` applies the rule for every start path. The failed hook (`step_run.handle_job_error`) applies it for every failed job; for a feature activation it removes the pending activation instead, so the feature leaves Computing.

Accepted gap: a process dies after it wrote "processing" and before it queued the job (the backend in an upload, a worker between an activation batch's commit and its starts, or between a finished step and its successors). The step stays processing without a job, and the feature stays Computing. Recompute in the document health view starts it.

## How a dead worker is noticed

DATS has no detector of its own. RQ reports a dead job through the job's failure callback, `job_handler.rq_job_failed`, which every job gets at enqueue (`on_failure`). It runs the failed hook once per failed job, also for an ordinary exception.

| Who dies                                     | Who calls the callback                                                                                                    | Delay (measured with RQ 2.12)                             |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| The job process of the forking GPU worker    | its worker, at once (`DATSWorker.handle_work_horse_killed`; RQ itself skips the callback there)                           | 0.15 s                                                    |
| A CPU or API worker (`SimpleWorker`)         | a live worker's maintenance (every 10 min) cleans the started jobs once the dead job's entry expired (job timeout + 60 s) | 13.3 min for a 60 s timeout; up to timeout + about 18 min |
| The GPU worker together with its job process | the same maintenance; the entry expires 90 s after the last heartbeat                                                     | 13.5 min                                                  |

Step jobs run on CPU and API workers with the default timeout of 1 hour, so a dead step worker is noticed after 1 to 1.3 hours. A feature activation has a timeout of 1 day. The GPU parent holds no database connection; it connects only while it runs the callback (`worker._sql_connection`).
