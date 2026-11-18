# Job System

The job system runs long-running background work (ML inference, imports,
exports, crawling, doc processing) on RQ (Redis Queue) workers, off the API
processes. Jobs are typed, registered centrally, and — for user-facing jobs —
push their progress to connected clients in real time over websockets.

It has two halves:

- **Execution** — jobs are declared with `@register_job`, enqueued via
  `JobService`, and executed by RQ workers through `rq_job_handler`.
- **Live updates** — every state change of a user-facing job is pushed to the
  project's members as a `JOB_UPDATED` websocket event, so the frontend can
  update progress bars and job lists without polling.

## Declaring a Job

Jobs are declared with the `@register_job` decorator
([job_register_decorator.py](job_register_decorator.py)) in a `*_job.py`
module (auto-imported at startup):

```python
@register_job(
    job_type="my_job",
    input_type=MyJobInput,
    output_type=MyJobOutput,
    device="cpu",                       # "cpu" | "gpu" | "api"
    generate_endpoints=EndpointGeneration.ALL,
    publish_updates=True,               # ← user-facing job: push JOB_UPDATED
)
def my_job(payload: MyJobInput, job: Job) -> MyJobOutput:
    job.update(status_message="Working...", current_step=1, steps=["a", "b"])
    ...
    return MyJobOutput(...)
```

Key decorator arguments:

| Argument             | Meaning                                                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `job_type`           | The text name identifying this job, declared by its owner: a module-level constant next to the handler if code starts or names the job, else a literal; a step uses its step name. |
| `input_type`         | Pydantic model of the job input (stored in the RQ job kwargs).                                                                                   |
| `output_type`        | Pydantic model of the result (optional).                                                                                                         |
| `device`             | Which queue the job lands on: `cpu`, `gpu`, or `api`.                                                                                            |
| `generate_endpoints` | `ALL` / `MINIMAL` / `NONE` — which REST endpoints are auto-generated.                                                                            |
| `publish_updates`    | Whether state changes are pushed over websockets (see below).                                                                                    |
| `read_model`         | Optional custom `JobRead` subclass for the event/REST payload.                                                                                   |
| `validate_input`     | Optional check `(db, payload)` the generated start endpoint runs before enqueueing; it raises to reject the input (e.g. ids of another project). |
| `validate_retry`     | Optional check `(db, payload)` the generated retry endpoint runs instead of `validate_input` before requeueing (e.g. data deleted meanwhile is no reason to refuse a retry). |

## Execution Lifecycle

1. **Enqueue** — `JobService.start_job(...)` builds the payload, enqueues on
   the queue matching `device`, and stores `type` / `project_id` in the RQ
   job meta.
2. **Run** — a worker picks the job up; `rq_job_handler`
   ([job_handler.py](job_handler.py)) wraps execution: it selects a CUDA
   device for GPU jobs, calls the handler, and manages the terminal states.
   While a job runs, its worker renews its heartbeat (a simple worker from a
   thread, with a TTL of ten minutes, see `DATSSimpleWorker`): once a worker
   died, the cleanup of the started jobs fails its job within minutes and runs
   its failure callback, so it can be retried.
3. **Progress** — inside the handler, `job.update(...)`
   ([job_dto.py](job_dto.py)) writes progress (`status_message`,
   `current_step`, `steps`, `finished`) into the RQ job meta.
4. **Stop** — `JobService.stop_job` sends RQ's stop command to the worker
   running a started job. A forking worker (`DATSWorker`, GPU) kills the job
   process; a simple worker (`DATSSimpleWorker`, CPU/API) runs the job itself
   and interrupts it with a signal, which raises `JobStoppedError` in the job
   until its handler returned. `JobStoppedError` is a `BaseException`, so no
   `except Exception` in the job swallows it; transactions roll back, and code
   that records a failure (e.g. `experiment_run_job.py`) catches it
   explicitly. Code that waits for other threads must not wait for them once
   stopped (`LLMRepo.llm_batch_chat` does not wait for its requests in
   flight). Either way the job runs its `failed` hook and ends as STOPPED
   in the failed job registry; RQ does not retry it, but
   `JobService.retry_job` retries it like a failed job.
5. **Checkpoint** — a job that works in batches can record what it finished
   with `job.save_checkpoint({key: value})` and read it back with
   `job.read_checkpoint()`, so a retry (`JobService.retry_job`: same job, same
   input) skips it. The checkpoint is a Redis hash next to the job: saving
   costs what the new entries cost. It never outlives its job: while the job
   runs, it expires a day after the job's timeout; `rq_job_failed` lets it
   expire with the failed or stopped job (its `failure_ttl`), and
   `rq_job_handler` a day after the job finished, so a retry still continues
   from it if the worker died before RQ saved the result.
6. **State** — job state lives in Redis (RQ meta), not Postgres. The REST
   polling endpoints (`/job/...`) read it from there and stay fully
   functional — they are used by MCP/agents and as the frontend's
   initial-load and websocket-disconnected fallback.

## Live Updates (websocket emission)

User-facing jobs push every state change to clients as a `JOB_UPDATED` event
carrying the **full per-type `JobRead`** (input, output, status, progress).
The frontend writes this directly into its react-query cache — no polling
while the websocket is connected.

### Which jobs publish

Only jobs registered with `publish_updates=True` emit events. Internal jobs
(e.g. the individual doc-processing pipeline steps) are registered with
`publish_updates=False` — they are an implementation detail, and their
user-visible status is conveyed through the sdoc-status polling instead.
`Job.publishes_updates()` is the guard checked before every emit.

> **Why sdoc processing still polls:** a dedicated per-step
> `SDOC_PROCESSING_STATUS_UPDATED` push event was designed but dropped —
> emitting correct per-step status events from the pipeline hooks turned out
> not to be feasible in the backend as designed. The frontend's
> `usePollProcessingSimpleSdocStatus` therefore keeps its `refetchInterval`
> polling. This is a deliberate workaround, not a settled design — it may be
> worth investigating again in the future.

### Where events are emitted

| Transition          | Emission site                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------- |
| Progress / meta     | `Job.update()` — after `save_meta()` (in-job progress)                                      |
| Started             | `rq_job_handler`, right after the job is picked up                                          |
| Finished (FINISHED) | `rq_job_handler`, after `handle_job_finished`, with `output_override` and `status_override` |
| Failed (FAILED)     | `rq_job_failed` (RQ's failure callback), after `handle_job_error`, with `status_override`   |
| Stopped (STOPPED)   | `rq_job_failed`, once the worker interrupted the job that `JobService.stop_job` stopped      |
| Enqueued (QUEUED)   | `JobService.start_job`                                                                      |
| Retried (QUEUED)    | `JobService.retry_job`                                                                      |

Every state change emits — there is no throttling or batching.

### How emission works from a sync worker

RQ workers are **sync** processes with no event loop and no websocket
connections — they cannot use the async `WebsocketService`. The bridge is
[job_events.py](job_events.py):

1. `publish_job_update(job, output_override=None, status_override=None)` builds the concrete
   per-type `JobRead` (via the registered `read_model`, NOT the generic
   union — union validation would fail), resolves the project's member ids,
   and wraps it in a `WebSocketEnvelope`.
2. `_publish_envelope_sync` publishes the envelope onto the websocket Redis
   fan-out channel (`conf.redis.ws_fanout_channel`) using a cached,
   module-level **sync** Redis client on the websocket DB (`ws_idx`).
3. The API workers' Redis listeners (see the
   [websocket system](../websocket_system/README.md)) receive the envelope
   and deliver it to their locally connected clients.

The worker is a **pure producer**: it never subscribes, never instantiates
`WebsocketService`, never touches `AsyncRedisRepo`.

Two invariants make this safe:

- **Emission never fails a job.** Every function in `job_events.py` swallows
  exceptions and only logs them.
- **The final event carries the terminal status and the output.** RQ only
  sets FINISHED / FAILED and persists the return value _after_ the handler
  returned or the failure callback ran. While they run, the RQ status is still
  STARTED, so the final emit passes the status explicitly via
  `status_override` (and the output via `output_override`). Without it,
  clients never see a job finish: they do not poll while the websocket is
  connected.

### The `JOB_UPDATED` event model

The event payload is a **per-job-type union** of concrete `JobRead` models,
built lazily by `build_job_event_models()` in
[common/dats_event.py](../../common/dats_event.py) (the static
`_DATS_EVENT_PAYLOADS` table cannot express it). It is called once at
startup — in `main.py` (after all `_job.py` modules are imported) and in
`worker.py` — and registers the union into `DATS_EVENT_TO_MODEL` so the
websocket system and OpenAPI webhooks pick it up like any other event.

## Interaction with the Websocket System

The job system does not reinvent delivery — it reuses the
[websocket system](../websocket_system/README.md)'s Redis Pub/Sub backplane:

- **Same channel, same envelope.** Job events are `WebSocketEnvelope`s on the
  same fan-out channel as endpoint-emitted events. API workers cannot tell
  the difference.
- **Different producer.** Endpoint events are emitted by the async
  `WebsocketEmitter` dependency (deferred to post-commit via background
  tasks, with actor exclusion). Job events are emitted by the sync
  `publish_job_update` from worker/API code — no commit to wait for (state is
  already in Redis), and **no actor exclusion** (a job has no human actor;
  the initiator wants the updates too).
- **Same event contract.** Both produce `DATSEvent`s consumed by the
  frontend's central cache-update brain.

## Adding a New Job

1. Define `MyJobInput` / `MyJobOutput` pydantic models and name the job type
   as a string in `@register_job`; code that starts the job writes the same
   string (`JobService().start_job("my_job", MyJobInput(...))`). The name is
   stored in Redis and never changes while jobs of it exist.
2. Write the handler in a `*_job.py` module with `@register_job(...)`; set
   `publish_updates=True` if users should see live progress.
3. Call `job.update(...)` inside the handler to report progress.
4. Run `just update-api` — the frontend's generated event union gains the new
   concrete `JobRead`, and the brain's `JOB_UPDATED` handler picks it up.

REST polling endpoints, websocket events, and OpenAPI schema are all derived
from the registration — no extra wiring.
