---
applyTo: "backend/src/**/*_service.py"
paths:
  - "backend/src/**/*_service.py"
---

# Backend Service Pattern

Services hold the business logic of a module: endpoints and job handlers stay thin and delegate to them. A service orchestrates CRUDs (SQL, Weaviate, Elasticsearch), repos (filesystem, LLM, Ray, ...), other services and the job system. Services are built the same way everywhere, so endpoints, jobs and other services can all access them the same way, and reviewers can see where the DB session, side effects and errors come from.

## File Structure

```python
# 1. Imports: sqlalchemy Session, SingletonMeta, crud_* singletons, own-module DTOs/ORMs/exceptions,
#    repos, other services, JobService / Job (if the service starts or runs jobs)
from sqlalchemy.orm import Session

from common.singleton_meta import SingletonMeta
from modules.example.example_crud import crud_example
from modules.example.example_dto import ExampleJobInput, ExampleJobOutput, ExampleRead
from modules.example.example_exceptions import UnsupportedExampleJobError
from repos.filesystem_repo import FilesystemRepo
from systems.job_system.job_dto import Job
from systems.job_system.job_service import JobService

# 2. Optional: module-level constants and private helper types (TypedDict / NamedTuple)
BATCH_SIZE = 32


# 3. The service singleton
class ExampleService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        # 3a. Dependencies as class attributes (repos, other services, dispatch tables)
        cls.fsr: FilesystemRepo = FilesystemRepo()
        cls.js = JobService()
        return super(ExampleService, cls).__new__(cls)

    # 4. Public methods: db session passed in as first argument after self
    def reset(self, *, db: Session, example_id: int) -> ExampleRead:
        db_obj = crud_example.read(db=db, id=example_id)  # raises NoSuchElementError
        ...
        return ExampleRead.model_validate(db_obj)

    # 5. Job handlers: called from the *_job.py handler, report progress on the job
    def handle_example_job(
        self, db: Session, job: Job, payload: ExampleJobInput
    ) -> ExampleJobOutput:
        job.update(current_step=0, status_message="Started ExampleJob!")
        match payload.task_type:
            case ...:
                ...
            case _:
                raise UnsupportedExampleJobError(payload.task_type)

    # 6. Private helpers: _single_underscore (or __double for name-mangled internals)
    def _helper(self, ...) -> ...: ...
```

## Rules

### Shape and Access

- **Singleton class**: A service is exactly one `class <Name>Service(metaclass=SingletonMeta)` in `<name>_service.py`, named after its file (`word_frequency_service.py` → `WordFrequencyService`). Callers get it with `<Name>Service()` at the call site or as a module-level variable in the endpoint (`cotas = COTAService()`). Never pass a service instance around or store one per request.
- **Dependencies in `__new__`**: Define `def __new__(cls, *args, **kwargs)`, assign dependencies as class attributes (`cls.fsr = FilesystemRepo()`, `cls.js = JobService()`, `cls.llm = LLMRepo()`, `cls.ray = RayRepo()`, `cls.weaviate = WeaviateRepo()`, `cls.es_repo = ElasticSearchRepo()`, other services such as `cls.sims = SimSearchService()`), then `return super(<Name>Service, cls).__new__(cls)`. Use these short attribute names.
- **No per-request state**: Singleton attributes hold only dependencies and static dispatch tables (`cls.export_method_for_job_type: dict[ExportJobType, Callable[..., Path]] = {...}`). Everything else is passed as a method argument.
- **No module functions**: Even stateless services are classes (`StatisticsService`); helpers become private methods. Module-level code is limited to constants, private helper types (`TypedDict` / `NamedTuple`) and `_private` functions.
- **No service for plain CRUD**: Endpoints that only call CRUD methods use the `crud_*` singletons directly; create a service only for logic beyond one CRUD call.
- **CRUDs are imported, not wrapped**: Use the `crud_*` module singletons directly (`crud_cota.read(db=db, id=...)`). Do not put them on the service.

### Database Session and Transactions

- **Session is a parameter**: Every method that touches SQL takes `db: Session` as an argument. Services never create sessions: endpoints inject one and job handlers open `sqlr.transaction()` and pass it in.
- **No commits**: Services never call `db.commit()`, `db.rollback()` or `db.add()`. Writes go through CRUD methods, which only flush; the session owner (`SQLRepo.transaction()`, used by `get_db_session` and job handlers) commits or rolls back.
- **Direct queries only for reads**: `db.query(...)` / `db.execute(select(...))` inside a service is allowed only for read/aggregate queries that no CRUD provides (statistics, health tables, timeline analysis). Look for a CRUD read first; a query that other code could use too (an entity by a field, by project, with its relations) becomes a read method on the entity's CRUD.
- **Keyword arguments**: Call CRUDs and other services with keyword arguments (`db=db, id=..., create_dto=...`). Multi-step methods number their steps in comments (`# 1) create the project`).
- **Other stores via clients**: Get Weaviate/Elasticsearch clients from the repo (`client = self.weaviate.get_client()`) and pass them to the embedding/elastic CRUDs.

### Errors

- **Existence checks via CRUD**: Check existence by calling `crud_x.read(db=db, id=...)` (raises `NoSuchElementError`) or `crud_x.exists(db=db, id=..., raise_error=True)`. Do not write `if obj is None` checks after `read`.
- **Invalid input**: Raise `ValueError` with a message naming the offending ids/values.
- **Domain errors**: Module-specific failures (unsupported job type, empty dataset, unsupported MIME type, ...) raise exception classes from `<module>_exceptions.py`; a dispatch `match`/dict lookup with no handler raises `Unsupported<X>Error`. Never `raise Exception(...)`.
- **No exception classes in services**: Define them in `<module>_exceptions.py`, never in the service (this holds for every backend file).
- **No HTTP in services**: Do not raise `HTTPException` or reference status codes; the HTTP status belongs on the exception class (`@exception_handler(status.HTTP_406_NOT_ACCEPTABLE)`).

### Jobs and Events

- **Starting jobs**: Start background work with `self.js.start_job(JobType.X, <X>JobInput(...))` and return the `Job` (or `list[Job]`) to the caller.
- **Running jobs**: Job-side entry points are named `handle_<x>_job(self, db, [job,] payload)` and return the job's `<X>JobOutput`. Report progress with `job.update(current_step=..., status_message=...)`; dispatch on the payload's enum with `match` or a dispatch table from `__new__`.
- **No websocket events**: Services do not emit `DATSEvent`s or call the `WebsocketService`; the endpoint emits after the service call returns.

### Return Types

- **Read DTOs for endpoints**: Public methods called by endpoints return the module's `<X>Read` DTO (`XRead.model_validate(db_obj)`) or another response DTO (`ChatSessionResponse`, `list[AnnoscalingResult]`), never ORM objects or tuples. The endpoint only calls the service, emits and returns the result (`result = ProjectService().create_project(...)`).
- **ORMs only privately**: Public methods return DTOs, also when another service, a job or a test fixture calls them; only private helpers (`_name`) return ORM objects. A caller that needs the ORM object reads it by the returned id (`crud_span_anno.read(db=db, id=dto.id)`).
- **Build DTOs from eager reads**: build Read DTOs from objects returned by a CRUD read method (which applies the CRUD's `_load_options()`). After `create_multi` / `update_multi`, re-read the objects with `read_by_ids` before converting them (`SpanAnnotationService._to_read_dtos`).
- **Batch methods keep input order**: a method that takes a list returns its results in the order of that list, and a delete returns the DTOs snapshotted (via `read_by_ids`) before it deletes (`SourceDocumentService.delete_multi`, `MemoService.delete_multi`).
- **Jobs**: Methods that start jobs return the `Job` (or `list[Job]`); job handlers return the `<X>JobOutput`.

## Variations

`backend/lint/check_services.py` knows these variations and skips the shape rules for them (the content rules still apply):

- **Systems singletons** (`JobService`, `WebsocketService`): hold per-process mutable state, so they set it in `__init__` and have explicit lifecycle methods (`initialize()`, `startup()`). Only use this for infrastructure in `systems/`.
- **Per-job service** (`PerspectivesService(job)`): a plain class created by the job handler for one job run when state (the `Job`, a device) is bound to a single execution.
- **Strategy hierarchy** (`classifier/models/*_class_model_service.py`): an `ABC` base (`TextClassificationModelService`) with `@abstractmethod` `train`/`eval`/`infer`; a singleton facade (`ClassifierService.get_model_service`) selects the implementation.

## Lint

`just lint backend` runs [check_services.py](backend/lint/check_services.py) (`--help` lists the rules: service class, `__new__` signature, no module functions, no HTTP, no bare `Exception`, no commits, no events, no exception classes) and [check_exceptions.py](backend/lint/check_exceptions.py) (exception classes only in `*_exceptions.py`).

## Examples

See:

- [cota_service.py](backend/src/modules/concept_over_time_analysis/cota_service.py) — singleton with repo + JobService dependencies, existence checks via CRUD, returns Read DTOs, job handler.
- [project_service.py](backend/src/core/project/project_service.py) — numbered orchestration across SQL CRUDs, filesystem, Elasticsearch, Weaviate and Redis jobs.
- [statistics_service.py](backend/src/modules/statistics/statistics_service.py) — stateless service with read-only aggregate queries.
