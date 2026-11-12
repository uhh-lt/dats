---
applyTo: "backend/**"
paths:
  - "backend/**"
---

# Backend

Cross-cutting rules for all backend code (Python, FastAPI). The patterns of a single file kind live in their own instruction files, which apply automatically by file suffix:

| File kind                                 | Instructions                             |
| ----------------------------------------- | ---------------------------------------- |
| `*_orm.py`                                | `backend-orm.instructions.md`            |
| `*_dto.py`                                | `backend-dto.instructions.md`            |
| `*_crud.py` (SQL)                         | `backend-crud.instructions.md`           |
| `*_embedding_crud.py` (Weaviate)          | `backend-embedding-crud.instructions.md` |
| `*_elastic_crud.py` (Elasticsearch)       | `backend-elastic-crud.instructions.md`   |
| `*_service.py` (incl. transactions)       | `backend-service.instructions.md`        |
| `*_endpoint.py` (incl. authz, deps, sync) | `backend-endpoint.instructions.md`       |
| `backend/test/**`                         | `backend-tests.instructions.md`          |

## Libraries

Dependencies are declared in `backend/pyproject.toml` and managed with uv. Use what is there:

- FastAPI (REST API), SQLAlchemy 2.0 (ORM), Alembic (migrations), Pydantic v2 (DTOs, config schema)
- OmegaConf (config loading), Loguru (logging), RQ (job queue)
- `weaviate` client (vectors), `elasticsearch` client (full-text search)

## Folder Structure

- `backend/configs/`: YAML config (`base.yaml`, `default.yaml`, `version.yaml`)
- `backend/lint/`: custom architecture lint scripts (see below)
- `backend/test/`: tests
- `backend/src/`: application code, every top-level folder is an import root (`from core.code.code_crud import crud_code`)
  - `common/`: shared enums and helpers (`DocType`, `JobType`, `Crud` in `*_enum.py` files, `DATSEvent`, `SingletonMeta`, `exception_handler`, `NotFoundError`, FastAPI dependencies)
  - `core/`: the core concepts (project, user, doc, code, tag, annotation, memo, metadata, auth, ...)
  - `modules/`: features built on `core` and `systems` (analysis, search, export/import, doc processing, ...)
  - `systems/`: reusable infrastructure (`job_system`, `feature_system`, `search_system`, `websocket_system`, `mcp_system`)
  - `repos/`: connections to external services (SQL, Weaviate, Elasticsearch, Redis, filesystem, LLM, Ray, Docling, mail); see `repos/README.md` for the repo lifecycle
  - `utils/`: process-level helpers (`import_by_suffix`, logger setup, image/GPU utils)
  - `migrations/`: Alembic migrations
  - `config.py`, `config_schema.py`, `bootstrap.py`: configuration and startup

### Layer Rules

| Rule                                                                               | Script                     |
| ---------------------------------------------------------------------------------- | -------------------------- |
| CRUD conventions (see the three CRUD instruction files)                            | `lint/check_crud.py`       |
| DTO conventions (see backend-dto), incl. no ORM/CRUD/service/repo/endpoint imports | `lint/check_dtos.py`       |
| ORM conventions (see backend-orm)                                                  | `lint/check_orm.py`        |
| Service conventions (see backend-service)                                          | `lint/check_services.py`   |
| Exception classes only in `*_exceptions.py`                                        | `lint/check_exceptions.py` |
| Enum classes only in `*_enum.py`, with a str or int value type                     | `lint/check_enums.py`      |
| `core` never imports from `modules`                                                | `lint/check_core.py`       |
| `systems` never imports from `modules`, also not inside a function                 | `lint/check_core.py`       |
| `*_endpoint.py` imports `*_dto` modules from its own folder only                   | `lint/check_endpoints.py`  |
| `*_repo.py` lives in `repos/`, imports no `*_service`/`*_endpoint`, own DTOs only  | `lint/check_repos.py`      |

All checks except `check_endpoints.py` and `check_repos.py` run automatically (`just lint backend` and pre-commit). Run those two by hand from `backend/` (`uv run python lint/check_endpoints.py`); they still report some existing violations, so make sure you add no new ones.

## File Naming

The suffix states the role of a file. Several suffixes are auto-imported by `import_by_suffix` (`bootstrap.py`, `worker.py`, `sql_repo.py`), so new files of these kinds need no registration.

- `*_orm.py`: SQLAlchemy models
- `*_dto.py`: Pydantic models (API payloads, CRUD inputs, job inputs/outputs)
- `*_crud.py`: SQL CRUD
- `*_collection.py` / `*_embedding_dto.py` / `*_embedding_crud.py`: Weaviate collection, object identifier, CRUD
- `*_elastic_index.py` / `*_elastic_dto.py` / `*_elastic_crud.py`: Elasticsearch index, documents, CRUD
- `*_service.py`: business logic
- `*_endpoint.py`: one FastAPI router (auto-mounted by `bootstrap.create_app`)
- `*_job.py`: background job handlers registered with `@register_job`
- `*_feature.py`: the module's toggleable feature, declared with `register_feature`
- `*_exceptions.py`: module-specific exceptions
- `*_enum.py`: the module's enums
- `*_repo.py`: external service connection (only in `repos/`)
- `*_utils.py`: helpers

## Code Style

Ruff formats and lints (`backend/ruff.toml`; `just format backend`, `just lint backend`), including import sorting and trailing whitespace / final newline.

- **Imports**: absolute imports from the `src` roots, grouped stdlib / third-party / first-party (ruff `I`). Import other ORMs for type hints under `if TYPE_CHECKING:`. To break a runtime import cycle, import inside the function.
- **Typing**: annotate every function signature (parameters and return). Use builtin generics and PEP 604 unions (`list[int]`, `dict[str, int]`, `T | None`), not `List`/`Optional`.
- **Naming**: `snake_case` functions and variables, `PascalCase` classes, `UPPER_SNAKE_CASE` constants, `_leading_underscore` for module- or class-private helpers. Project ids are `project_id`, never `proj_id`.
- **Singletons**: services and repos use `metaclass=SingletonMeta` (`common/singleton_meta.py`); CRUDs are module-level instances (`crud_code`).

## Error Handling

Every exception class lives in an exceptions module: `<module>_exceptions.py` in `core/` and `modules/` (`core/auth/auth_exceptions.py`, `modules/eximport/import_exceptions.py`), `<component>_exceptions.py` next to its repo or system (`repos/db/sql_exceptions.py`, `repos/filesystem_exceptions.py`, `repos/vector/weaviate_exceptions.py`), and `common/common_exceptions.py` for shared ones (`NotFoundError`). There are no exceptions to this rule. Never define exception classes in services, CRUDs, jobs, repos or utilities, and raise a domain exception instead of a bare `Exception`. `backend/lint/check_exceptions.py` enforces this.

`common/exception_handler.py` maps exceptions to HTTP responses (it defines no exception classes itself). Decorating an exception class with `@exception_handler(status.HTTP_...)` registers it; `bootstrap.create_app` installs all handlers, which log the error and return its message as plain text with that status. Undecorated exceptions become HTTP 500.

- **Not found (404)**: subclass `NotFoundError` from `common/common_exceptions.py`. Subclasses inherit the 404 mapping and need no decorator. Existing ones: `NoSuchElementError` (SQL, `repos/db/sql_exceptions.py`), `NoSuchObjectInElasticSearchError` (`repos/elastic/elastic_exceptions.py`), the `WeaviateObject*NotFoundException`s (`repos/vector/weaviate_exceptions.py`).
- **Forbidden (403)**: `ForbiddenError` (`core/auth/auth_exceptions.py`), raised by the `AuthzUser` assertions.
- **Bad request (400)**: `InvalidError` (`core/auth/auth_exceptions.py`) and the module-specific errors in `*_exceptions.py` files (folder, search system, export/import).
- **Duplicates and references (409)**: unique and foreign key violations need no own exception: `bootstrap.py` maps an `IntegrityError` caused by a `UniqueViolation` or a `ForeignKeyViolation` to 409.
- **Domain errors**: declare them in `<module>_exceptions.py`, decorated with `@exception_handler` when the client must see a specific status.
- **Messages**: the message is sent to the client, so never put secrets, tokens or credentials in it.

```python
from fastapi import status

from common.exception_handler import exception_handler


@exception_handler(status.HTTP_400_BAD_REQUEST)
class FolderMoveCycleError(Exception):
    """Raised when a folder is moved into itself or one of its descendants."""

    def __init__(self, folder_id: int, target_folder_id: int) -> None:
        super().__init__(
            f"Cannot move folder {folder_id} into itself or its descendants "
            f"(target folder {target_folder_id})."
        )
```

## Enums and Constants

- Every enum class lives in an enum module, one per module, named like the module's exceptions file: `<module>_enum.py` in `core/` and `modules/` (`core/doc/folder_enum.py`, `modules/whiteboard/whiteboard_enum.py`, `modules/eximport/import_enum.py`), `<component>_enum.py` next to its repo or system (`repos/llm_enum.py`, `systems/job_system/job_system_enum.py`), and `common/<name>_enum.py` for shared ones (`doc_type_enum.py`, `job_type_enum.py`, `meta_type_enum.py`, `crud_enum.py`). DTOs, ORMs, CRUDs and services import them from there, so an ORM never imports a DTO module for an enum.
- Exempt, because they are no plain value sets: `DATSEvent` (`common/dats_event.py`), the enums of `systems/search_system/` (operators, sorting, grouping) and the search columns (`*_columns.py`).
- Enums subclass `(str, Enum)` (or `StrEnum`) so they serialize as their value; `IntEnum` only where the values are ints (`modules/ml/ml_enum.py`). Keep enum methods small and free of business logic (`DateGroupBy`, `MetaType` map members to columns or expressions).
- `backend/lint/check_enums.py` enforces this (`enum-location`, `value-type`).
- Constants are module-level `UPPER_SNAKE_CASE` in the module that owns them (`SYSTEM_USER_ID`, `DEMO_USER_ID` in `core/user/user_crud.py`).
- Tunables (batch sizes, limits, timeouts) come from the config, not literals: `BATCH_SIZE = conf.postgres.batch_size`.

## Configuration

`config.py` merges `configs/base.yaml`, `configs/default.yaml` and `configs/version.yaml` with OmegaConf (environment values via `${oc.env:NAME, default}`) and validates the result into the Pydantic `BackendConfigSchema` (`config_schema.py`, `extra="forbid"`).

- Read config with `from config import conf` (`conf.postgres.batch_size`, `conf.api.max_upload_file_size`). Never load the YAML files yourself.
- A new config key needs an entry in the YAML file and a typed field in `config_schema.py`.
- Hosts, ports and secrets come from `backend/.env` through `${oc.env:...}`; never hard-code them.

## Logging

Use Loguru: `from loguru import logger`, never the stdlib `logging` module. Messages are f-strings (`logger.info(f"Created project {project_id}")`). Use `debug` for noisy details, `warning` for recoverable problems and `error` for failures; exceptions raised to the client are already logged by their handler.

## Background Jobs

Jobs are functions in `*_job.py` files, registered with the decorator from `systems/job_system`. The job opens its own transactions; it may call CRUDs directly for its own steps (e.g. status updates, see `experiment_run_job.py`) and delegates logic that endpoints or other jobs share to a service:

```python
from common.job_type_enum import JobType
from repos.db.sql_repo import SQLRepo
from systems.job_system.job_dto import Job
from systems.job_system.job_system_enum import EndpointGeneration, JobTiming
from systems.job_system.job_register_decorator import register_job

sqlr = SQLRepo()


@register_job(
    job_type=JobType.ML,
    input_type=MLJobInput,
    generate_endpoints=EndpointGeneration.ALL,
    publish_updates=True,
    device="api",
    result_ttl=JobTiming.NINETY_DAYS,
)
def ml_job(payload: MLJobInput, job: Job) -> None:
    with sqlr.transaction() as db:
        match payload.ml_job_type:
            case MLJobType.QUOTATION_ATTRIBUTION:
                QuoteService().perform_quotation_detection(db=db, project_id=payload.project_id, ...)
```

- Add the job type to `JobType` (`common/job_type_enum.py`) and its input/output DTOs to the module's `*_dto.py` (see `backend-dto.instructions.md`).
- `device` selects the worker queue (`"cpu"`, `"gpu"`, `"api"`). Services start jobs with `JobService().start_job(JobType.X, <X>JobInput(...))`.
- See [ml_job.py](backend/src/modules/ml/ml_job.py) and `systems/job_system/README.md`.
- A job of a gated module checks its feature in its `validate_input` hook with `FeatureService().assert_enabled(...)` (`duplicate_finder_job.py`).

## Pipeline Steps

Add a step:

1. Add its `JobType` value (`common/job_type_enum.py`); its position breaks ties in the derived step order.
2. Add new artefacts to `Artefact` (`common/artefact_enum.py`), and to `CORE_ARTEFACTS` only if every document needs them whatever features its project enables.
3. Write the step file (`<module>/<name>_job.py`): an input DTO that extends `SdocProcessingJobInput`, an enricher, and the handler registered with `@register_job(job_type, input_type, enricher)` and declared with `@pipeline_step(requires, produces, doctypes)` above it (`modules/doc_processing/pipeline/pipeline_step_decorator.py`).
4. Add the step to the step copy of the project doctor (`tools/project_doctor/doctor_stores.py`), which imports no DATS code; `test_project_doctor_steps.py` fails otherwise.
5. Regenerate the API client (`just update-api`), which adds the value to `JobType.ts`.

Rules:

- The pipeline order, the steps per doctype, the planning, the health view and the export and import are derived from the declarations (`modules/doc_processing/pipeline/pipeline_graph.py`); never list steps by hand.
- The job system knows no pipeline: the job handler calls the lifecycle hooks (started, finished, failed) that `bootstrap.register_jobs` registers with the functions of `doc_processing_pipeline.py`.
- A finished step starts each planned successor with a bare `SdocProcessingJobInput` (project, document, settings, steps), and the successor's enricher loads the rest of its input from the database or filesystem, so a step stores all its output before its handler returns and never passes data to the next step in memory.
- Every step registers an enricher (`@pipeline_step` rejects a step without one); the same enricher serves the advancing, recompute and feature activation.
- A step job that cannot start (its enricher fails) sets its steps and the pending steps after them to erroneous (`start_step_job`).
- A step applies to every doctype of the step it follows, as a step starts the same successors for every doctype (the startup check fails otherwise).
- A step has one direct predecessor: the steps producing its required artefacts must depend on each other (`NER_SPANS` and `SENTENCE_EMBEDDINGS` together are rejected), as no step waits for several inputs (the startup check fails otherwise).
- Only jobs that create documents or fan out over files (`ENTRY_POINTS` in `doc_processing_pipeline.py`) build the input of the next job by hand.
- A job that computes several steps in one run declares the others in the `further_steps` of `@pipeline_step` (step → produced artefacts) and computes only the steps in `SdocProcessingJobInput.steps` (`spacy_job.py`).
- The status of a step per document is a row of `sourcedocumentstepstatus`, no row means not planned, and only `crud_sdoc_step_status` (the generic reads and writes), `core/doc/source_document_status_rules.py` and the planning statements of `StepPlanningService` (`modules/doc_processing/step_planning_statements.py`) touch these rows.
- The overall status of a document is derived from its step rows (erroneous, else processing, else finished) and the status of a feature's steps from theirs (processing, else failed, else not planned, else ready), both only in `source_document_status_rules.py`; never store them.
- The project export writes an optional artefact only if its step finished, and the import writes it only if the archive holds it (`export_sdocs.py`, `import_sdocs.py`).
- A step that cannot run because its input step failed is erroneous, never processing: a failed job fails its pending successors, and planning fails a step whose input is erroneous; recomputing the input starts them again.
- Code that needs the step of an artefact looks it up with `graph.producer(doctype, artefact)` instead of naming the step (`export_sdocs.py`, `import_sdocs.py`).
- `test_new_pipeline_step.py` declares a step in a test and follows it through the pipeline; keep it passing when the pipeline changes.

## Features

Add a feature:

1. Add its `Feature` value (`common/feature_enum.py`).
2. Declare it with `register_feature(feature, requires_artefacts, requires_features)` in `<module>/<module>_feature.py`.
3. Gate its routes and jobs (see "Feature Gating" in `backend-endpoint.instructions.md`).
4. Regenerate the API client and add its entry to the frontend feature map `FEATURES` (`frontend.instructions.md`).

Rules:

- A toggleable feature is a `Feature` value (`common/feature_enum.py`) declared once with `register_feature` in a `<module>_feature.py` file of its module, which `import_by_suffix` loads.
- A feature declares the optional artefacts it reads in `requires_artefacts` and the features it builds on in `requires_features`; core artefacts and features that need only core data are not declared.
- The startup check rejects unknown artefacts, artefacts no step produces and cycles, so a new feature needs the steps of its artefacts first.
- `systems/feature_system` holds the generic part (declarations, registry, requirement resolution, `FeatureService.assert_enabled` and the `require_feature` dependencies, `GET /feature`); `modules/project_features` holds what knows projects and documents (`ProjectFeatureService`, the `/feature/project/...` endpoints, `ProjectFeatureRead` and `FeatureActivation`).
- The planner lives in the `pipeline` package: `PipelineGraph.plan` gives the steps of a doctype for the needed artefacts and `step_planning.py` the steps of enabled features (`planned_steps`, `feature_steps`).
- Only `PipelineGraph` derives which step feeds which (`inputs`, `successors`, `descendants`, `needed_steps`); never walk the `requires` and `produces` of the declarations elsewhere.
- Only the operations of `StepPlanningService` (`modules/doc_processing/step_planning_service.py`: `enable_feature`, `restart_feature`, `disable_feature`, `add_features` for an import, `plan_new_document`) take the planning locks, write planning rows and `project.enabled_features`, and start the `FEATURE_ACTIVATION` job; their SQL lives in `step_planning_statements.py`, which only the service imports, and no CRUD offers it; never plan steps by hand.
- Enabling or completing a feature plans `(plan(enabled) - plan(enabled without the feature)) | steps(feature) | core steps` and never the missing data of another feature.
- The enabled features change only through `StepPlanningService.enable_feature` and `disable_feature` (called by the `/feature/project/...` endpoints and the project import), never through `ProjectUpdate`.
- Disabling a feature sets its processing steps that no remaining feature plans to not planned, and `handle_job_started` skips steps that are not planned, so a disabled feature leaves no document processing.
- An import restores only what the archive holds, adds the archive's features to the project's with `StepPlanningService.add_features` (never disables one) and plans no steps; features whose data is missing are partly available until a user completes them.
