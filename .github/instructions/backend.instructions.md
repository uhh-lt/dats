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
  - `common/`: shared enums and helpers (`DocType`, `JobType`, `Crud`, `DATSEvent`, `SingletonMeta`, `exception_handler`, FastAPI dependencies)
  - `core/`: the core concepts (project, user, doc, code, tag, annotation, memo, metadata, auth, ...)
  - `modules/`: features built on `core` and `systems` (analysis, search, export/import, doc processing, ...)
  - `systems/`: reusable infrastructure (`job_system`, `event_system`, `search_system`, `websocket_system`, `mcp_system`)
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
| `core` never imports from `modules`                                                | `lint/check_core.py`       |
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
- `*_exceptions.py`: module-specific exceptions
- `*_repo.py`: external service connection (only in `repos/`)
- `*_utils.py`: helpers

## Code Style

Ruff formats and lints (`backend/ruff.toml`; `just format backend`, `just lint backend`), including import sorting and trailing whitespace / final newline.

- **Imports**: absolute imports from the `src` roots, grouped stdlib / third-party / first-party (ruff `I`). Import other ORMs for type hints under `if TYPE_CHECKING:`. To break a runtime import cycle, import inside the function.
- **Typing**: annotate every function signature (parameters and return). Use builtin generics and PEP 604 unions (`list[int]`, `dict[str, int]`, `T | None`), not `List`/`Optional`.
- **Naming**: `snake_case` functions and variables, `PascalCase` classes, `UPPER_SNAKE_CASE` constants, `_leading_underscore` for module- or class-private helpers. Project ids are `project_id`, never `proj_id`.
- **Singletons**: services and repos use `metaclass=SingletonMeta` (`common/singleton_meta.py`); CRUDs are module-level instances (`crud_code`).

## Error Handling

Every exception class lives in an exceptions module: `<module>_exceptions.py` in `core/` and `modules/` (`core/auth/auth_exceptions.py`, `modules/eximport/import_exceptions.py`), and `<component>_exceptions.py` next to its repo or system (`repos/db/sql_exceptions.py`, `repos/filesystem_exceptions.py`, `repos/vector/weaviate_exceptions.py`). Only `common/exception_handler.py` (the handler infrastructure with `NotFoundError`) defines exceptions elsewhere. Never define exception classes in services, CRUDs, jobs, repos or utilities, and raise a domain exception instead of a bare `Exception`. `backend/lint/check_exceptions.py` enforces this.

`common/exception_handler.py` maps exceptions to HTTP responses. Decorating an exception class with `@exception_handler(status.HTTP_...)` registers it; `bootstrap.create_app` installs all handlers, which log the error and return its message as plain text with that status. Undecorated exceptions become HTTP 500.

- **Not found (404)**: subclass `NotFoundError` from `common/exception_handler.py`. Subclasses inherit the 404 mapping and need no decorator. Existing ones: `NoSuchElementError` (SQL, `repos/db/sql_exceptions.py`), `NoSuchObjectInElasticSearchError` (`repos/elastic/elastic_exceptions.py`), the `WeaviateObject*NotFoundException`s (`repos/vector/weaviate_exceptions.py`).
- **Forbidden (403)**: `ForbiddenError` (`core/auth/auth_exceptions.py`), raised by the `AuthzUser` assertions.
- **Bad request (400)**: `InvalidError` (`core/auth/auth_exceptions.py`) and the module-specific errors in `*_exceptions.py` files (folder, search system, export/import).
- **Duplicates (409)**: unique violations need no own exception: `bootstrap.py` maps an `IntegrityError` caused by a `UniqueViolation` to 409.
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

- Enums that cross the API subclass `(str, Enum)` (or `StrEnum`) so they serialize as their value. Shared enums live in `common/` (`DocType`, `JobType`, `MetaType`, `Crud`); module enums live in the module's `*_dto.py`.
- Constants are module-level `UPPER_SNAKE_CASE` in the module that owns them (`SYSTEM_USER_ID`, `ASSISTANT_ZEROSHOT_ID`, ... in `core/user/user_crud.py`).
- Tunables (batch sizes, limits, timeouts) come from the config, not literals: `BATCH_SIZE = conf.postgres.batch_size`.

## Configuration

`config.py` merges `configs/base.yaml`, `configs/default.yaml` and `configs/version.yaml` with OmegaConf (environment values via `${oc.env:NAME, default}`) and validates the result into the Pydantic `BackendConfigSchema` (`config_schema.py`, `extra="forbid"`).

- Read config with `from config import conf` (`conf.postgres.batch_size`, `conf.api.max_upload_file_size`). Never load the YAML files yourself.
- A new config key needs an entry in the YAML file and a typed field in `config_schema.py`.
- Hosts, ports and secrets come from `backend/.env` through `${oc.env:...}`; never hard-code them.

## Logging

Use Loguru: `from loguru import logger`, never the stdlib `logging` module. Messages are f-strings (`logger.info(f"Created project {project_id}")`). Use `debug` for noisy details, `warning` for recoverable problems and `error` for failures; exceptions raised to the client are already logged by their handler.

## Background Jobs

Jobs are functions in `*_job.py` files, registered with the decorator from `systems/job_system`. The job opens its own transaction and delegates to a service:

```python
from common.job_type import JobType
from repos.db.sql_repo import SQLRepo
from systems.job_system.job_dto import EndpointGeneration, Job, JobTiming
from systems.job_system.job_register_decorator import register_job

sqlr = SQLRepo()


@register_job(
    job_type=JobType.ML,
    input_type=MLJobInput,
    generate_endpoints=EndpointGeneration.ALL,
    device="api",
    result_ttl=JobTiming.NINETY_DAYS,
)
def ml_job(payload: MLJobInput, job: Job) -> None:
    with sqlr.transaction() as db:
        match payload.ml_job_type:
            case MLJobType.QUOTATION_ATTRIBUTION:
                QuoteService().perform_quotation_detection(db=db, project_id=payload.project_id, ...)
```

- Add the job type to `JobType` (`common/job_type.py`) and its input/output DTOs to the module's `*_dto.py` (see `backend-dto.instructions.md`).
- `device` selects the worker queue (`"cpu"`, `"gpu"`, `"api"`). Services start jobs with `JobService().start_job(JobType.X, <X>JobInput(...))`.
- See [ml_job.py](backend/src/modules/ml/ml_job.py) and `systems/job_system/README.md`.
