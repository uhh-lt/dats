---
applyTo: "backend/src/**/*_endpoint.py"
---

# Endpoint Pattern

Endpoint modules define the REST API surface of the backend. Each file owns exactly one `APIRouter` for one resource or module and groups its routes into labeled sections. Consistency matters because the frontend API client is generated from these routes, and the websocket sync protocol (which keeps all connected clients up to date) is driven entirely by conventions in these files.

## File Structure

```python
# 1. Imports: fastapi, sqlalchemy, common.*, core.auth.authz_user,
#    own-folder DTOs (never DTOs from other modules), own-folder service/crud,
#    plus DATSEvent / WebsocketEmitter if the file has mutations.
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from modules.example.example_dto import ExampleCreate, ExampleRead, ExampleUpdate
from systems.event_system.datsevent import DATSEvent
from systems.event_system.websocket_emitter import WebsocketEmitter

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

- **PUT = create, GET = read, PATCH = update, DELETE = delete.** These four are _mutations_ and require sync (see below).
- **POST = computation or job start.** A computation is a one-time operation whose result is not persisted (search, statistics, exports, suggestions). Computations do **not** need sync.
- Known legacy deviations (do not copy): `folder_endpoint.py` and `search_view_endpoint.py` use POST for create; `api_key_endpoint.py` uses POST `/create` and DELETE `/delete/{key_id}`.

### Mutation & Sync

- **Inject the emitter**: Every mutation route takes `ws: WebsocketEmitter = Depends()`.
- **Emit after mutating**: Call `ws.emit_to_project(DATSEvent.<ENTITY>_<CREATED|UPDATED|DELETED>, result, project_id=...)` after the crud/service call. Use `ws.emit_to_user(...)` instead for user-scoped entities (e.g. search views, API keys).
- **Return the mutated object**: Every mutation (and every sync event) returns the mutated object as its read DTO — the emitted payload _is_ the returned value. Convert ORM objects with `XRead.model_validate(db_obj)`.
- **Deletes return the pre-delete DTO**: Snapshot `XRead.model_validate(db_obj)` and `project_id` _before_ calling delete, then emit and return the snapshot.
- **Bulk mutations**: Emit a single `DATSEvent.<ENTITY>_..._BATCH` event with the list of results, guarded by `if results:`.

### Function Naming

- **CRUD prefixes are fixed**: `create_*` (never `add_*`, never `create_new_*`), `get_*` (never `read_*`), `update_*`, `delete_*`. No mixing.
- **Canonical names**: `get_by_id`, `get_by_project`, `update_by_id`, `delete_by_id`; bulk variants end in `*_bulk`.
- **Computations/jobs** use descriptive verbs, e.g. `search_sdocs`, `word_frequency_analysis`, `suggest`.

### Endpoint Anatomy

- **Decorator**: Always set `response_model` and `summary`; the path uses `{resource_id}` path params for single-entity routes.
- **Signature**: Keyword-only parameters (`*` first); `db: Session = Depends(get_db_session)` and `authz_user: AuthzUser = Depends()`; mutations add `ws`.
- **Authz first**: The first statement of the body is `authz_user.assert_in_project(project_id)` or `authz_user.assert_in_same_project_as(Crud.X, id)`.
- **Thin body**: Delegate to `crud_*` / service functions; no business logic in the route. Return type annotation matches `response_model`.

### Imports

- **Own-folder DTOs only**: An endpoint may only import `*_dto` modules from its own folder — enforced by `backend/lint/check_endpoints.py`.

## Examples

See:

- [backend/src/core/code/code_endpoint.py](../../../backend/src/core/code/code_endpoint.py) — canonical CRUD with sync (create/get/update/delete + bulk).
- [backend/src/modules/concept_over_time_analysis/cota_endpoint.py](../../../backend/src/modules/concept_over_time_analysis/cota_endpoint.py) — canonical section blocks including job operations.
- [backend/src/modules/word_frequency/word_frequency_endpoint.py](../../../backend/src/modules/word_frequency/word_frequency_endpoint.py) — POST computations without sync.
