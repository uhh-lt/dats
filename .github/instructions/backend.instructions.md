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
| `modules/**`, `core/artefacts/**`         | `backend-module.instructions.md`         |
| `systems/{artefact,feature}_system/**`    | `backend-systems.instructions.md`        |

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
  - `common/`: shared enums and helpers (`DocType`, `MetaType`, `Crud` in `*_enum.py` files, `DATSEvent`, `SingletonMeta`, `exception_handler`, `NotFoundError`, FastAPI dependencies)
  - `core/`: the core concepts (project, user, doc, code, tag, annotation, memo, metadata, auth, ...), the search (`core/search`) and the standard pipeline: `core/artefacts` holds one folder per artefact every document or several features need, named like the artefact, with its `<name>_artefact.py`, its steps and its store (utils that steps of several folders use sit directly in `core/artefacts`), and `core/doc_processing` holds the upload (`entrypoints/`), the health view, retry and recompute; core declares no feature and checks no toggle
  - `modules/`: capabilities built on `core` and `systems` (code frequency, export/import, entity annotations, object detection, tag recommendation, ...), with or without a feature; a module never imports another module (small duplication is preferred over a shared service); a step whose artefact only one feature reads lives with that feature (`modules/entity_annotations`, `modules/object_detection`, the image embeddings in `modules/simsearch`, the document embeddings in `modules/tag_recommendation`, the keywords in `modules/keyword_statistics`)
  - `systems/`: reusable infrastructure (`job_system`, `artefact_system`, `feature_system`, `search_system`, `websocket_system`, `mcp_system`)
  - `repos/`: connections to external services (SQL, Weaviate, Elasticsearch, Redis, filesystem, LLM, Ray, Docling, mail); see `repos/README.md` for the repo lifecycle
  - `utils/`: process-level helpers (`import_by_suffix`, logger setup, image/GPU utils)
  - `migrations/`: Alembic migrations
  - `config.py`, `config_schema.py`, `bootstrap.py`: configuration and startup

### Layer Rules

| Rule                                                                                  | Script                     |
| ------------------------------------------------------------------------------------- | -------------------------- |
| CRUD conventions (see the three CRUD instruction files)                               | `lint/check_crud.py`       |
| DTO conventions (see backend-dto), incl. no ORM/CRUD/service/repo/endpoint imports    | `lint/check_dtos.py`       |
| ORM conventions (see backend-orm)                                                     | `lint/check_orm.py`        |
| Service conventions (see backend-service)                                             | `lint/check_services.py`   |
| Exception classes only in `*_exceptions.py`                                           | `lint/check_exceptions.py` |
| Enum classes only in `*_enum.py`, with a str or int value type                        | `lint/check_enums.py`      |
| `core` never imports from `modules`                                                   | `lint/check_layering.py`   |
| `systems` never imports from `modules`, also not inside a function                    | `lint/check_layering.py`   |
| `systems/artefact_system` never imports `systems.feature_system`                      | `lint/check_layering.py`   |
| A module never imports another module, except the pairs of `MODULE_IMPORT_EXCEPTIONS` | `lint/check_layering.py`   |
| `*_endpoint.py` imports `*_dto` modules from its own folder only                      | `lint/check_endpoints.py`  |
| `*_repo.py` lives in `repos/`, imports no `*_service`/`*_endpoint`, own DTOs only     | `lint/check_repos.py`      |

All checks except `check_endpoints.py` and `check_repos.py` run automatically (`just lint backend` and pre-commit). Run those two by hand from `backend/` (`uv run python lint/check_endpoints.py`); they still report some existing violations, so make sure you add no new ones.

## File Naming

The suffix states the role of a file. Several suffixes are auto-imported by `import_by_suffix` (`bootstrap.py`, `worker.py`, `sql_repo.py`), so new files of these kinds need no registration.

- `*_orm.py`: SQLAlchemy models
- `*_dto.py`: Pydantic models (API payloads, CRUD inputs, job inputs/outputs)
- `*_crud.py`: SQL CRUD
- `*_collection.py` / `*_embedding_dto.py` / `*_embedding_crud.py`: Weaviate collection, object identifier, CRUD
- `*_elastic_index.py` / `*_elastic_dto.py` / `*_elastic_crud.py`: Elasticsearch index, documents, CRUD
- `*_file_crud.py`: files of one kind on disk, one folder per entity (`FileCRUDBase` in `repos/filesystem`, see `repos/README.md`)
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

Every exception class lives in an exceptions module: `<module>_exceptions.py` in `core/` and `modules/` (`core/auth/auth_exceptions.py`, `modules/eximport/import_exceptions.py`), `<component>_exceptions.py` next to its repo or system (`repos/db/sql_exceptions.py`, `repos/filesystem/filesystem_exceptions.py`, `repos/vector/weaviate_exceptions.py`), and `common/common_exceptions.py` for shared ones (`NotFoundError`). There are no exceptions to this rule. Never define exception classes in services, CRUDs, jobs, repos or utilities, and raise a domain exception instead of a bare `Exception`. `backend/lint/check_exceptions.py` enforces this.

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

- Every enum class lives in an enum module, one per module, named like the module's exceptions file: `<module>_enum.py` in `core/` and `modules/` (`core/doc/folder_enum.py`, `modules/whiteboard/whiteboard_enum.py`, `modules/eximport/import_enum.py`), `<component>_enum.py` next to its repo or system (`repos/llm_enum.py`, `systems/job_system/job_system_enum.py`), and `common/<name>_enum.py` for shared ones (`doc_type_enum.py`, `meta_type_enum.py`, `crud_enum.py`). DTOs, ORMs, CRUDs and services import them from there, so an ORM never imports a DTO module for an enum.
- Exempt, because they are no plain value sets: `DATSEvent` (`common/dats_event.py`), the enums of `systems/search_system/` (operators, sorting, grouping) and the search columns (`*_columns.py`).
- Enums subclass `(str, Enum)` (or `StrEnum`) so they serialize as their value; `(int, Enum)` only where the values are ints (`common/sdoc_status_enum.py`). Keep enum methods small and free of business logic (`DateGroupBy`, `MetaType` map members to columns or expressions).
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
from repos.db.sql_repo import SQLRepo
from systems.job_system.job_dto import Job
from systems.job_system.job_system_enum import EndpointGeneration, JobTiming
from systems.job_system.job_register_decorator import register_job

sqlr = SQLRepo()


@register_job(
    job_type="tag_recommendation",
    input_type=TagRecommendationJobInput,
    validate_input=validate_tag_recommendation_input,
    generate_endpoints=EndpointGeneration.ALL,
    publish_updates=True,
    device="api",
    result_ttl=JobTiming.NINETY_DAYS,
)
def tag_recommendation_job(payload: TagRecommendationJobInput, job: Job) -> None:
    with sqlr.transaction() as db:
        TagRecommendationService().classify_untagged_documents(
            db=db, ml_job_id=job.get_id(), project_id=payload.project_id, ...
        )
```

- A job type is a string, written where the job is registered (`@register_job(job_type="doc_chunking")`) and where it is started, never a constant or an enum, and its input/output DTOs go to the module's `*_dto.py` (see `backend-dto.instructions.md`).
- `device` selects the worker queue (`"cpu"`, `"gpu"`, `"api"`). Services start jobs with `JobService().start_job("<x>", <X>JobInput(...))`.
- See [tag_recommendation_job.py](backend/src/modules/tag_recommendation/tag_recommendation_job.py) and `systems/job_system/README.md`.

## Modules, Artefacts and Features

- A module adds an artefact, a pipeline step, a feature or a job as `backend-module.instructions.md` says; the artefact and feature systems keep the invariants of `backend-systems.instructions.md`.
- The model (feature, artefact, pipeline step, job) and the three rules are explained in `docs/development/module-architecture.md` and the READMEs of `systems/job_system`, `systems/artefact_system` and `systems/feature_system`.
