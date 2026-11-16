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
  - `core/`: the core concepts (project, user, doc, code, tag, annotation, memo, metadata, auth, ...) and the standard pipeline (`core/doc_processing`: the upload, the always-computed steps and the steps of artefacts several features read)
  - `modules/`: features built on `core` and `systems` (analysis, search, export/import, entity annotations, object detection, tag recommendation, ...); a step whose artefact only one feature reads lives with that feature (`modules/entity_annotations`, `modules/object_detection`, the image embeddings in `modules/simsearch`, the document embeddings in `modules/tag_recommendation`, the keywords in `modules/statistics`)
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
| `core` never imports from `modules`                                                   | `lint/check_core.py`       |
| `systems` never imports from `modules`, also not inside a function                    | `lint/check_core.py`       |
| `systems/artefact_system` never imports `systems.feature_system`                      | `lint/check_core.py`       |
| A module never imports another module, except the pairs of `MODULE_IMPORT_EXCEPTIONS` | `lint/check_core.py`       |
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
from common.job_type_enum import JobType
from repos.db.sql_repo import SQLRepo
from systems.job_system.job_dto import Job
from systems.job_system.job_system_enum import EndpointGeneration, JobTiming
from systems.job_system.job_register_decorator import register_job

sqlr = SQLRepo()


@register_job(
    job_type=JobType.TAG_RECOMMENDATION,
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

- Add the job type to `JobType` (`common/job_type_enum.py`, a `StrEnum` for the jobs that are no pipeline steps; a step names its job type as text) and its input/output DTOs to the module's `*_dto.py` (see `backend-dto.instructions.md`).
- `device` selects the worker queue (`"cpu"`, `"gpu"`, `"api"`). Services start jobs with `JobService().start_job(JobType.X, <X>JobInput(...))`.
- See [tag_recommendation_job.py](backend/src/modules/tag_recommendation/tag_recommendation_job.py) and `systems/job_system/README.md`.
- A job of a gated module checks its feature in its `validate_input` hook with `FeatureService().assert_enabled(...)` (`duplicate_finder_job.py`).

## Pipeline Steps

Add a step:

1. Declare new artefacts with `artefact(name, kind=..., always=..., uploaded_for=..., codes=..., archive=...)` in a file of their owner (`core/doc_processing/artefacts.py` for the artefacts every document or several features need, one `*_artefact.py` file next to its step per single-user artefact): `always=True` only if every document needs it whatever features its project enables; an own store (`StorageKind.OWN_STORE`) needs an `ArtefactArchive`, and the system code trees a project needs before the artefact is produced go into `codes` (`SystemCode` trees declared next to the artefact, shared ones in `core/code/system_codes.py`). See `systems/artefact_system/README.md`.
2. Write the step file (`<module>/<name>_job.py`): an input DTO that extends `SdocProcessingJobInput`, an enricher, and the handler registered with `@register_job(job_type="<step name>", input_type, enricher)` and declared with `@pipeline_step(requires, produces, doctypes)` above it (`systems/artefact_system/pipeline_step_decorator.py`), with the imported artefact objects. The step name is text and never changes without a data migration (it is stored in `sourcedocumentstepstatus`); among the ready steps the name breaks ties in the derived order.
3. Add the step to the step copy of the project doctor (`tools/project_doctor/doctor_stores.py`), which imports no DATS code, and the trees of an artefact that declares `codes` to its `tools/project_doctor/system_codes.yaml`; `test_project_doctor_steps.py` fails otherwise.
4. Regenerate the API client (`just update-api`) if the step adds an endpoint or a DTO the API uses.

Rules:

- The pipeline order, the steps per doctype, the planning, the health view and the export and import are derived from the declarations (`systems/artefact_system/pipeline_graph.py`); never list steps by hand.
- The job system knows no pipeline: the job handler calls the started and finished hooks and RQ's failure callback (`job_handler.rq_job_failed`, set as `on_failure` at enqueue) calls the failed hook; `bootstrap.register_jobs` registers them with the functions of `step_run.py` (`handle_job_started`, `handle_job_finished`, `handle_job_error`).
- Never call the failed hook anywhere else: RQ calls the failure callback once per failed job, also when its worker died, and `DATSWorker.handle_work_horse_killed` calls it for a killed job process.
- Start step jobs only with `step_run.start_steps` (document, steps, settings, an optional priority), which starts the job of each step with the bare input; never build an `SdocProcessingJobInput` or name a step's job to start it.
- A finished step starts each planned successor with a bare `SdocProcessingJobInput` (project, document, settings), and the successor's enricher loads the rest of its input from the database or filesystem, so a step stores all its output before its handler returns and never passes data to the next step in memory.
- Every step registers an enricher (`@pipeline_step` rejects a step without one); the same enricher serves the advancing, recompute and the artefact computation.
- One failure rule: whatever goes wrong (the job raises, its input cannot be built, the queue is unreachable, its worker died), the step and the pending steps after it become erroneous on every start path, and Complete or Recompute retries it (`systems/artefact_system/README.md`).
- A step applies to every doctype of the step it follows, as a step starts the same successors for every doctype (the startup check fails otherwise).
- A step has one direct predecessor: the steps producing its required artefacts must depend on each other (`NER_SPANS` and `SENTENCE_EMBEDDINGS` together are rejected), as no step waits for several inputs (the startup check fails otherwise).
- Only the jobs that create documents or fan out over files (the crawler, `extract_archive`, `doc_chunking`, `extract_html`, `sdoc_init`) start what follows them, at the end of their handlers; they build the input of the next job by hand, and a queue outage leaves them finished (`entrypoints/follower_utils.py`).
- One job per step: the job is named like its step and computes only that step; a step that needs spaCy calls spaCy itself (`ner_job.py`, `word_frequency_job.py`).
- The status of a step per document is a row of `sourcedocumentstepstatus`, no row means not planned, and only `crud_sdoc_step_status` (the generic reads and writes), `systems/artefact_system/source_document_status_rules.py` and the planning statements of `ArtefactService` (`systems/artefact_system/artefact_statements.py`) touch these rows.
- The overall status of a document is derived from its step rows (erroneous, else processing, else finished) and the status of the steps some artefacts need from theirs (processing, else failed, else not planned, else ready), both only in `source_document_status_rules.py`; never store them.
- `export_sdocs.py` and `import_sdocs.py` name no artefact: they iterate over `artefact_registry.archives()`, the export reads an artefact only if its step finished and keeps it only if its archive says it is complete, the import writes it only if its step was imported as finished.
- A new artefact archive needs its round-trip case in `test_feature_toggle_eximport.py` and the doctor's check of its store or an entry in `UNCHECKED_STORES` (`tools/project_doctor/doctor_stores.py`); both tests fail otherwise.
- The import rejects document archives without `step_status` (exported before the feature toggles).
- A step that cannot run because its input step failed is erroneous, never processing: a failed job fails its pending successors, and planning fails a step whose input is erroneous; recomputing the input starts them again.
- Code that needs the step of an artefact looks it up with `graph.producer(doctype, artefact)` instead of naming the step (`export_sdocs.py`, `import_sdocs.py`).
- `test_new_pipeline_step.py` declares a step in a test and follows it through the pipeline; keep it passing when the pipeline changes.

## Features

Add a feature:

1. Declare it in `<module>/<module>_feature.py` as a module constant: `FEATURE = register_feature("<name>", title=..., description=..., area=FeatureArea.X, requires_artefacts={...}, default_enabled=True)`.
2. Gate its routes and jobs with the imported constant (see "Feature Gating" in `backend-endpoint.instructions.md`).
3. Regenerate the API client; the frontend reads the feature from `GET /feature` and needs a change only for a page or a gate (`frontend.instructions.md`).

Rules:

- A toggleable feature is declared once with `register_feature` in a `<module>_feature.py` file of its module, which `import_by_suffix` loads; its text name never changes without a data migration (it is stored in `project.enabled_features`). Gated code imports the returned object.
- A name a request names is looked up strictly (`FeatureService.read_by_name`, 404 for an unknown name); a stored name is read tolerantly (an unregistered name is ignored and dropped at the next write).
- `default_enabled` says whether a new project (created without a feature list) and an archive without project details enable the feature; `GET /feature` lists the features ordered by area and title.
- A feature requires artefacts only (`requires_artefacts`), never another feature, and at least one of them is not a core artefact (`always`); a capability that needs only core artefacts is no feature and is always available.
- The startup check rejects unregistered artefacts and features without an on-demand artefact, so a new feature needs its artefacts first.
- Enable (and the project creation and the import) run the set up of the artefact system first (`ArtefactService.set_up`), which creates the system codes the feature's artefacts declare; a user code named like a declared code makes it fail with 409.
- `systems/feature_system` holds the declarations, the registry, `FeatureService.assert_enabled` and the `require_feature` dependencies, the status of the features of a project (`FeatureService.read_project_features`), the allowed actions (`ALLOWED_STATUSES`, `FeatureService.assert_action_allowed`) and all `/feature` endpoints with their DTOs (`ProjectFeatureRead`, `FeatureActivation`), and carries out the actions (`FeatureService.enable_feature`, `complete_feature`, `disable_feature`, `add_features` for an import); it talks to `systems/artefact_system` in artefacts only, and the artefact system never imports it.
- `systems/artefact_system` plans in artefacts: `PipelineGraph.steps_for` gives the steps of a doctype that some artefacts need, `PipelineGraph.applies` whether they apply to a doctype.
- Only `PipelineGraph` derives which step feeds which (`inputs`, `successors`, `descendants`, `steps_for`); never walk the `requires` and `produces` of the declarations elsewhere.
- Only the operations of `ArtefactService` (`systems/artefact_system/artefact_service.py`: `compute`, `plan_document`, `handle_artefact_computation_job` and `end_computation`) write planning rows and `project.artefact_computations` and start the `ARTEFACT_COMPUTATION` job, and only those of `FeatureService` write `project.enabled_features`; their SQL lives in `artefact_statements.py` and `feature_statements.py`, which only their service imports, and no CRUD offers it; the project lock is `crud_project.read_locked`; never plan steps by hand.
- Enabling or completing a feature computes the artefacts it requires: an artefact computation plans `steps_for(core artefacts) | steps_for(its artefacts)` (the latter only where they apply) and never the missing data of other artefacts.
- Enable and Complete plan nothing in the request: they store a pending artefact computation and start the `ARTEFACT_COMPUTATION` job before the commit, which plans the documents in batches (one transaction each, project share lock first) and removes the pending computation at the end or through its failure callback.
- An upload plans the steps of the core artefacts and of the artefact demand (`FeatureService.read_artefact_demand`, read under the project share lock) with `ArtefactService.plan_document`.
- Each action is allowed only in the feature statuses of `ALLOWED_STATUSES` (`systems/feature_system/feature_service.py`) (Enable when disabled, Complete when partly available, Disable when partly or fully available) and answers 409 otherwise, so every action is rejected while a feature is computing.
- The enabled features change only through `FeatureService.enable_feature` and `disable_feature` (called by the `/feature/project/...` endpoints and the project import), never through `ProjectUpdate`.
- Disabling a feature changes only the enabled features, calls nothing in the artefact system and never unplans a step.
- An import restores only what the archive holds, adds the archive's features to the project's with `FeatureService.add_features` (never disables one) and plans no steps; features whose data is missing are partly available until a user completes them.
