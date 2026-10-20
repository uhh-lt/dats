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

- **Singleton class (default)**: A service is `class <Name>Service(metaclass=SingletonMeta)` in `<name>_service.py`. Callers get it with `<Name>Service()` at the call site or as a module-level variable in the endpoint (`cotas = COTAService()`). Never pass a service instance around or store one per request.
- **Dependencies in `__new__`**: Define `def __new__(cls, *args, **kwargs)`, assign dependencies as class attributes (`cls.fsr = FilesystemRepo()`, `cls.js = JobService()`, `cls.llm = LLMRepo()`, `cls.ray = RayRepo()`, `cls.weaviate = WeaviateRepo()`, `cls.es_repo = ElasticSearchRepo()`, other services such as `cls.sims = SimSearchService()`), then `return super(<Name>Service, cls).__new__(cls)`. Use these short attribute names.
- **No per-request state**: Singleton attributes hold only dependencies and static dispatch tables (`cls.export_method_for_job_type: dict[ExportJobType, Callable[..., Path]] = {...}`). Everything else is passed as a method argument.
- **Module functions (stateless alternative)**: Pure computation or query modules with no dependencies to hold may expose plain module-level functions instead of a class (`statistics_service.py`, `timeline_analysis_service.py`, `word_frequency_service.py`). Do not mix both styles in one file.
- **CRUDs are imported, not wrapped**: Use the `crud_*` module singletons directly (`crud_cota.read(db=db, id=...)`). Do not put them on the service.

### Database Session and Transactions

- **Session is a parameter**: Every method that touches SQL takes `db: Session` as an argument. Services never create sessions: endpoints inject one and job handlers open `sqlr.transaction()` and pass it in.
- **No commits**: Services never call `db.commit()`, `db.rollback()` or `db.add()`. Writes go through CRUD methods, which only flush; the session owner (`SQLRepo.transaction()`, used by `get_db_session` and job handlers) commits or rolls back.
- **Direct queries only for reads**: `db.query(...)` / `db.execute(select(...))` inside a service is allowed only for read/aggregate queries that no CRUD provides (statistics, health tables, timeline analysis).
- **Keyword arguments**: Call CRUDs and other services with keyword arguments (`db=db, id=..., create_dto=...`). Multi-step methods number their steps in comments (`# 1) create the project`).
- **Other stores via clients**: Get Weaviate/Elasticsearch clients from the repo (`client = self.weaviate.get_client()`) and pass them to the embedding/elastic CRUDs.

### Errors

- **Existence checks via CRUD**: Check existence by calling `crud_x.read(db=db, id=...)` (raises `NoSuchElementError`) or `crud_x.exists(db=db, id=..., raise_error=True)`. Do not write `if obj is None` checks after `read`.
- **Invalid input**: Raise `ValueError` with a message naming the offending ids/values.
- **Domain errors**: Module-specific failures (unsupported job type, empty dataset, ...) use exception classes from `<module>_exceptions.py`; a dispatch `match`/dict lookup with no handler raises `Unsupported<X>Error`.
- **No HTTP in services**: Do not raise `HTTPException` or reference status codes; HTTP mapping belongs in exception classes (`@exception_handler`) or the endpoint.

### Jobs and Events

- **Starting jobs**: Start background work with `self.js.start_job(JobType.X, <X>JobInput(...))` and return the `Job` (or `list[Job]`) to the caller.
- **Running jobs**: Job-side entry points are named `handle_<x>_job(self, db, [job,] payload)` and return the job's `<X>JobOutput`. Report progress with `job.update(current_step=..., status_message=...)`; dispatch on the payload's enum with `match` or a dispatch table from `__new__`.
- **No websocket events**: Services do not emit `DATSEvent`s or call the `WebsocketService`; the endpoint emits after the service call returns.

### Return Types

- Return either the ORM object (when the endpoint converts it, e.g. `ProjectService.create_project`) or the module's `<X>Read` DTO via `XRead.model_validate(db_obj)`. Return one or the other consistently within a service.

## Variations

- **Systems singletons** (`JobService`, `WebsocketService`): hold per-process mutable state, so they set it in `__init__` and have explicit lifecycle methods (`initialize()`, `startup()`). Only use this for infrastructure in `systems/`.
- **Per-job service** (`PerspectivesService(job)`): a plain class created by the job handler for one job run when state (the `Job`, a device) is bound to a single execution.
- **Strategy hierarchy** (`classifier/models/*_class_model_service.py`): an `ABC` base (`TextClassificationModelService`) with `@abstractmethod` `train`/`eval`/`infer`; a singleton facade (`ClassifierService.get_model_service`) selects the implementation.

## Examples

See:

- [cota_service.py](backend/src/modules/concept_over_time_analysis/cota_service.py) — singleton with repo + JobService dependencies, existence checks via CRUD, returns Read DTOs, job handler.
- [project_service.py](backend/src/core/project/project_service.py) — numbered orchestration across SQL CRUDs, filesystem, Elasticsearch, Weaviate and Redis jobs.
- [statistics_service.py](backend/src/modules/statistics/statistics_service.py) — module-function variant with read-only aggregate queries.
