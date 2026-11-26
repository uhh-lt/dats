---
applyTo: "backend/src/**/*_endpoint.py"
paths:
  - "backend/src/**/*_endpoint.py"
---

# Endpoint Pattern

Endpoint modules define the REST API surface of the backend. Each file owns exactly one `APIRouter` for one resource or module and groups its routes into labeled sections. Consistency matters because the frontend API client is generated from these routes, and the websocket sync protocol (which keeps all connected clients up to date) is driven entirely by conventions in these files.

## File Structure

```python
# 1. Imports: fastapi, sqlalchemy, common.*, core.auth.authz_user,
#    own-folder DTOs (never DTOs from other modules), own-folder service/crud,
#    plus DATSEvent / WebsocketEmitter if the file has mutations.
from fastapi import APIRouter, Depends

from common.dats_event import DATSEvent
from common.dependencies import DBSession, get_current_user
from core.auth.authz_user import AuthzUser
from modules.example.example_dto import ExampleCreate, ExampleRead, ExampleUpdate
from systems.websocket_system.websocket_dependency import WebsocketEmitter

# 2. Router: one per file, prefix = resource name, auth enforced router-wide.
router = APIRouter(
    prefix="/example",
    dependencies=[Depends(get_current_user)],
    tags=["example"],
)

# 3. Optional: service singletons used by the routes below.
# es: ExampleService = ExampleService()


# --- create operations
# @router.put("", ...) -> create_*

# --- read operations
# @router.get("/{example_id}", ...) -> get_*

# --- update operations
# @router.patch("/{example_id}", ...) -> update_*

# --- delete operations
# @router.delete("/{example_id}", ...) -> delete_*

# --- job operations (only if the module starts background jobs)
# @router.post("/start_job", ...) -> *_job

# --- other operations (computations, exports, etc.)
# @router.post("/compute", ...) -> descriptive verb names
```

## Rules

### Section Blocks

- **Section headers**: Group routes with comment blocks in this exact order: `# --- create operations`, `# --- read operations`, `# --- update operations`, `# --- delete operations`, `# --- job operations` (only if any), `# --- other operations` (computations most likely).
- **Omit empty sections**: Only write a header for sections that actually contain routes.

### HTTP Method Semantics

- **PUT = create, PATCH = update, DELETE = delete.** PUT, PATCH, and DELETE are _mutations_ and require sync (see below).
- **GET = read.** GET is a pure read and never syncs.
- **POST = computation or job start.** A computation is a one-time operation whose result is not persisted (search, statistics, exports, suggestions). Computations do **not** need sync.

### Project Routes

Resources of a project move under `/projects/{project_id}/...` module group by module group (#928); `span_annotation_endpoint.py` is the example.

- **Router**: `router = project_router("/<resources>", tags=[...], feature=FEATURE)` (`common/project_router.py`) checks the membership and, for a feature module, the feature for every route; omit `feature` in core.
- **Project from the path only**: every route takes `project_id: int`; request and create DTOs carry no `project_id`.
- **Paths**: plural kebab-case collections (`/span-annotations`), one resource at `/{<entity>_id}`, links at `/{<entity>_id}/<others>/{<other>_id}` (PUT adds, DELETE removes), bulk routes at `/bulk` declared before `/{<entity>_id}`, computations at `POST /<verb>`.
- **Bulk links**: bulk links at `/bulk/<others>` (`/tags/bulk/source-documents`): PUT adds, DELETE removes, PATCH does both.
- **Filters**: optional query parameters on the collection (`GET /span-annotations?user_id=1&sdoc_id=2`), never one route per filter combination.
- **Path ids**: read every id of the path within the project (`crud_x.read(db=db, project_id=project_id, id=...)`), so an id of another project answers 404; no `assert_in_same_project_as` or `get_project_id()`.
- **Body ids**: a reference in the body of a write (`code_id`, `sdoc_id`) is left to the composite foreign key, so an id of another project answers 409; services do not pre-check body references.
- **Query ids**: a filter id of another project matches nothing.
- **Emit to the path's project**: `ws.emit_to_project(event, result, project_id=project_id)`, also for batch events.

### Mutation & Sync

- **Inject the emitter**: Every mutation route takes `ws: WebsocketEmitter = Depends()`.
- **Emit after mutating**: Call `ws.emit_to_project(DATSEvent.<ENTITY>_<CREATED|UPDATED|DELETED>, result, project_id=...)` after the crud/service call. Use `ws.emit_to_user(...)` instead for user-scoped entities (e.g. search views, API keys).
- **Return the mutated object**: Every mutation (and every sync event) returns the mutated object as its read DTO — the emitted payload _is_ the returned value. Convert ORM objects with `XRead.model_validate(db_obj)`.
- **Deletes return the pre-delete DTO**: Snapshot `XRead.model_validate(db_obj)` and `project_id` _before_ calling delete, then emit and return the snapshot.
- **Bulk mutations**: Emit a single `DATSEvent.<ENTITY>_..._BATCH` event with the list of results, guarded by `if results:`. Service results are read DTOs: emit them with `ws.emit_dtos_to_projects(event, results)`, which groups by their `project_id`. Return the results in the order of the request.

### Function Naming

- **CRUD prefixes are fixed**: `create_*` (never `add_*`, never `create_new_*`), `get_*` (never `read_*`), `update_*`, `delete_*`. No mixing.
- **Handlers vs. CRUDs**: route handlers use `get_*`, while the CRUDs they call use `read_*` (see `backend-crud.instructions.md`).
- **Canonical names**: `get_by_id`, `get_by_project`, `update_by_id`, `delete_by_id`; bulk variants end in `*_bulk`.
- **Computations/jobs** use descriptive verbs, e.g. `search_sdocs`, `word_frequency_analysis`, `suggest`.

### Endpoint Anatomy

- **Decorator**: Always set `response_model` and `summary`; the path uses `{resource_id}` path params for single-entity routes.
- **Signature**: Keyword-only parameters (`*` first); `db: DBSession` (commits before the response and the websocket events) and `authz_user: AuthzUser = Depends()`; mutations add `ws`.
- **Authz first**: outside a project router, the first statement of the body is `authz_user.assert_in_project(project_id)` or `authz_user.assert_in_same_project_as(Crud.X, id)`.
- **Thin body**: Delegate to `crud_*` / service functions; no business logic in the route. Return type annotation matches `response_model`.

### Feature Gating

- **Project router**: a project router of a feature gates every route (`project_router(..., feature=FEATURE)`, with the object `register_feature` returned, imported from the module's `*_feature.py`).
- **Generated job routes**: jobs with generated endpoints (`/projects/{project_id}/jobs/<job-type>`) are gated by their `validate_input` hook, not by a dependency.
- **Job routes**: a hand-written route that reads or controls a job lives under `/projects/{project_id}/jobs/<job-type>` and reads the job with `JobService().read_project_job(...)` (404 for a job of another project); a job that a module route starts generates its reads with `EndpointGeneration.READ`.
- **Enabled, not ready**: gating checks only that the feature is enabled; never reject a request because its data is still being computed.

### Imports

- **Own-folder DTOs only**: An endpoint may only import `*_dto` modules from its own folder. The rule is checked by `backend/lint/check_endpoints.py`, but the script does not run automatically yet and still reports existing violations.

## Examples

See:

- [backend/src/core/code/code_endpoint.py](backend/src/core/code/code_endpoint.py) — canonical CRUD with sync (create/get/update/delete).
- [backend/src/core/annotation/span_annotation_endpoint.py](backend/src/core/annotation/span_annotation_endpoint.py) — bulk create/update/delete through a service with `emit_dtos_to_projects`.
- [backend/src/modules/concept_over_time_analysis/cota_endpoint.py](backend/src/modules/concept_over_time_analysis/cota_endpoint.py) — canonical section blocks including job operations.
- [backend/src/modules/word_frequency/word_frequency_endpoint.py](backend/src/modules/word_frequency/word_frequency_endpoint.py) — POST computations without sync.
