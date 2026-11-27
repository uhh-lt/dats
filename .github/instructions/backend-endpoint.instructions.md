---
applyTo: "backend/src/**/*_endpoint.py"
paths:
  - "backend/src/**/*_endpoint.py"
---

# Endpoint Pattern

Endpoint modules define the REST API surface of the backend. Each file owns exactly one router for one resource or module and groups its routes into labeled sections. Consistency matters because the frontend API client is generated from these routes, and the websocket sync protocol (which keeps all connected clients up to date) is driven entirely by conventions in these files.

## File Structure

```python
# 1. Imports: fastapi, sqlalchemy, common.*, core.auth.authz_user,
#    own-folder DTOs (never DTOs from other modules), own-folder service/crud,
#    plus DATSEvent / WebsocketEmitter if the file has mutations.
from fastapi import Depends

from common.dats_event import DATSEvent
from common.dependencies import DBSession
from common.project_router import project_router
from core.auth.authz_user import AuthzUser
from modules.example.example_dto import ExampleCreate, ExampleRead, ExampleUpdate
from modules.example.example_feature import EXAMPLE
from systems.websocket_system.websocket_dependency import WebsocketEmitter

# 2. Router: under /projects/{project_id}/<resources>; it checks the membership
#    (and the feature) for every route.
router = project_router("/examples", tags=["examples"], feature=EXAMPLE)

# 3. Optional: service singletons used by the routes below.
# es: ExampleService = ExampleService()


# --- create operations
# @router.put("", ...) -> create

# --- read operations
# @router.get("/{example_id}", ...) -> get_by_id

# --- update operations
# @router.patch("/{example_id}", ...) -> update_by_id

# --- delete operations
# @router.delete("/{example_id}", ...) -> delete_by_id

# --- job operations (only if the module starts background jobs)
# @router.post("/{example_id}/<verb>", ...) -> <verb>; read the job at
# /projects/{project_id}/jobs/<job-type>/{job_id}

# --- other operations (computations, exports, etc.)
# @router.post("/<noun>", ...) -> <verb>_<noun>, e.g. compute_<noun>
```

## Rules

### Section Blocks

- **Section headers**: Group routes with comment blocks in this exact order: `# --- create operations`, `# --- read operations`, `# --- update operations`, `# --- delete operations`, `# --- job operations` (only if any), `# --- other operations` (computations most likely).
- **Omit empty sections**: Only write a header for sections that actually contain routes.

### Sync by Method

- **Mutations sync**: `PUT`, `PATCH` and `DELETE` are mutations and sync (see "Mutation & Sync"); a `GET` and a `POST` computation never sync. What each method means is "Method" under "REST Design".

### Project Routes

Every resource of a project lives under `/projects/{project_id}/...` (#928); `span_annotation_endpoint.py` is the example.

- **Router**: `router = project_router("/<resources>", tags=[...], feature=<FEATURE>)` (`common/project_router.py`) checks the membership and, for a feature module, the feature for every route; omit `feature` in core.
- **Routes outside projects**: a resource outside every project gets its own file with a plain `APIRouter(prefix=...)` (`me_endpoint.py` for `/users/me`, `info_endpoint.py`); the one exception is `project_endpoint.py`, whose `PUT /projects` (create) sits on a second router next to the project router.
- **Project from the path only**: every route takes `project_id: int`; request and create DTOs carry no `project_id`.
- **Paths**: every path follows "Path" under "REST Design".
- **Path ids**: read every id of the path within the project (`crud_x.read(db=db, project_id=project_id, id=...)`), so an id of another project answers 404.
- **Body ids**: a reference in the body of a write (`code_id`, `sdoc_id`) is left to the composite foreign key, so an id of another project answers 409; an id that no foreign key holds (an id list, a JSON field) is read within the project by the route or service, so it answers 404.
- **Query ids**: a filter id of another project matches nothing.
- **Emit to the path's project**: `ws.emit_to_project(event, result, project_id=project_id)`, also for batch events.

### Mutation & Sync

- **Inject the emitter**: Every mutation route takes `ws: WebsocketEmitter = Depends()`.
- **Emit after mutating**: Call `ws.emit_to_project(DATSEvent.<ENTITY>_<CREATED|UPDATED|DELETED>, result, project_id=...)` after the crud/service call. Use `ws.emit_to_user(...)` instead for user-scoped entities (e.g. search views, API keys).
- **Return the mutated object**: Every mutation (and every sync event) returns the mutated object as its read DTO — the emitted payload _is_ the returned value. Convert ORM objects with `XRead.model_validate(db_obj)`.
- **Deletes return the pre-delete DTO**: Snapshot `XRead.model_validate(db_obj)` and `project_id` _before_ calling delete, then emit and return the snapshot.
- **Bulk mutations**: Emit a single `DATSEvent.<ENTITY>_..._BATCH` event with the list of results, guarded by `if results:`. Emit them with `ws.emit_to_project(event, results, project_id=project_id)`, the project of the path. Return the results in the order of the request.

### Function Naming

- **Handlers vs. CRUDs**: route handlers use `get_*`, while the CRUDs they call use `read_*` (see `backend-crud.instructions.md`); the names themselves follow "Handler names" under "REST Design".

### Endpoint Anatomy

- **Decorator**: Always set `response_model` and `summary`; the path uses `{resource_id}` path params for single-entity routes.
- **Signature**: Keyword-only parameters (`*` first); `db: DBSession` (commits before the response and the websocket events); `authz_user: AuthzUser = Depends()` only where the route needs the current user (`authz_user.user`, `assert_can_annotate_as`); mutations add `ws`.
- **Thin body**: Delegate to `crud_*` / service functions; no business logic in the route. Return type annotation matches `response_model`.

### Feature Gating

- **Project router**: a project router of a feature gates every route (`project_router(..., feature=WORD_FREQUENCY)`, with the object `register_feature` returned, imported from the module's `*_feature.py` and named after the feature).
- **Generated job routes**: jobs with generated endpoints (`/projects/{project_id}/jobs/<job-type>`) are gated by their `validate_input` hook, not by a dependency.
- **Job routes**: a hand-written route that reads or controls a job lives under `/projects/{project_id}/jobs/<job-type>` and reads the job with `JobService().read_project_job(...)` (404 for a job of another project); a job that a module route starts generates its reads with `EndpointGeneration.READ`.
- **Enabled, not ready**: gating checks only that the feature is enabled; never reject a request because its data is still being computed.

### Imports

- **Own-folder DTOs only**: An endpoint may only import `*_dto` modules from its own folder. The rule is checked by `backend/lint/check_endpoints.py`, but the script does not run automatically yet and still reports existing violations.

## REST Design

`docs/development/designing-endpoints.md` explains these rules for human developers with examples. A path is read from left to right: method, start, item, end; then come the input, the output, the special places and the names in the code.

### Method

- **Method**: the method says what happens: `GET` reads (`GET /codes/{code_id}`), `PUT` creates (`PUT /codes`), `PATCH` changes stored state (`PATCH /codes/{code_id}`, `PATCH /memos/{memo_id}/mark-recent`), `DELETE` deletes (`DELETE /codes/{code_id}`), and `POST` computes without storing (`POST /code-frequencies`) or starts a job (`POST /jobs/perspectives`).

### Path

- **Start**: a plural kebab-case noun, the thing itself if it carries the module's name (`/codes`, `/code-frequencies`), else the module namespace plus the thing (`/perspectives/aspects`, `/statistics/codes`, `/llm-assistant/existing-annotation-counts`), with one endpoint file and one router per module.
- **Item**: one thing is `/{<entity>_id}` (`/codes/{code_id}`), a child with exactly one owner is nested one level below it and answers 404 for a child of another parent (`/experiments/{experiment_id}/runs/{run_id}`), and a thing that refers to several others stays flat and is filtered by them in the query (`GET /span-annotations?sdoc_id=&code_id=&user_id=`), never deeper than one nested level.
- **End**: nothing for a plain create, read, update or delete (`PATCH /codes/{code_id}`); a noun if the request returns data, plural when the answer holds several results, which includes a list (`GET /source-documents/{sdoc_id}/siblings`), a page of results (`POST /search/memos`) and a map with one result per key (`POST /tags/counts`), and singular when it is one thing, one number (`GET /source-documents/count`) or one object (`POST /perspectives/aspects/{aspect_id}/visualization`); a verb if it does something to what stands before it (`PUT /whiteboards/{whiteboard_id}/duplicate`, `PATCH /search-views/reorder`, `POST /doc-processing/upload`); a sub-path of the collection is declared before `/{<entity>_id}`.
- **Bulk**: `/bulk` with the method of the single route and a list body, answering in the order of the request (`PUT /span-annotations/bulk`, `PATCH /codes/bulk`, `DELETE /memos/bulk`), and an action on many is `/bulk/<verb>` or `/bulk/<others>/<verb>` (`PATCH /tags/bulk/source-documents/replace`).
- **Links**: a link between two things lives under the thing that groups (a span group groups span annotations, a tag groups documents), and the other side reads it with a filter (`GET /span-groups?user_id=&span_annotation_id=`, `GET /tags?sdoc_id=`).
- **Link operations**: a link offers only the operations that have a caller, from these eight: add one (`PUT /span-groups/{span_group_id}/span-annotations/{span_annotation_id}`), remove one (`DELETE /span-groups/{span_group_id}/span-annotations/{span_annotation_id}`), list the members of a group (`GET /span-groups/{span_group_id}/span-annotations`), list from the other side (`GET /tags?sdoc_id=`), add every tag to every document (`PUT /tags/bulk/source-documents`), remove every tag from every document (`DELETE /tags/bulk/source-documents`), the same additions and removals on every document (`PATCH /tags/bulk/source-documents`) and replace the tags of each document (`PATCH /tags/bulk/source-documents/replace`).

### Input

- **GET**: everything in the query: filters, sorting and paging (`GET /tags?sdoc_id=`, `GET /memos?recent=true&limit=`, `GET /source-documents/count?status=`), as optional filters on the collection, never one route per filter combination or a `/by-<field>` path.
- **Everything else**: one body DTO from the module's `*_dto.py` and no query parameters, a bare list only on a bulk route: a create (`PUT /codes` with `CodeCreate`), a computation (`POST /code-frequencies/occurrences` with `CodeOccurrenceRequest`), a read whose input needs a body (`POST /tags/counts` with document ids), a search with its filter, sorts and paging (`POST /search/source-documents` with `page_number`, `page_size`).
- **Acting user**: a request acts as the logged-in user without a `user_id` (`PUT /codes`), and `user_id` is only a filter (`GET /span-annotations?user_id=`) or an optional body field where a virtual user may act (`PUT /span-annotations`).
- **Files**: an upload takes multipart form fields next to its files (`POST /doc-processing/upload`, `POST /jobs/import`).

### Output

- **Status codes**: every route answers 200 with a body (`DELETE /codes/{code_id}` returns the deleted code); 400 for a broken rule of the domain, 403 for a non-member or a disabled feature, 404 for an id in the path or one the route reads that is not in the project, 409 for a violated foreign key or unique constraint, 422 for a malformed request (`project_router` documents 400 to 409 once).
- **Order**: a list comes in a defined order: a bulk route in the order of its request, a read in the order of its CRUD's `ORDER BY`.
- **Errors in endpoints**: endpoint code raises domain exceptions from `*_exceptions.py`, never `ValueError`, `Exception` or `assert`.

### Special Places

- **Jobs**: a job starts at `POST /jobs/<job-type>` with its whole input in the body, or at `POST /<resources>/{<entity>_id}/<verb>` when it works on one resource, is read at `GET /jobs/<job-type>/{job_id}` and controlled at `POST /jobs/<job-type>/{job_id}/abort`.
- **me**: everything personal lives below `/users/me` (`GET /users/me`, `PUT /users/me/api-keys`, `GET /users/me/projects`), and no route takes another user's id outside a project.

### Names in the Code

- **Handler names**: the handler name is the method of the generated client; the main thing of a file uses `create`, `get_by_id`, `get_by_project`, `update_by_id`, `delete_by_id`, `create_bulk`, `update_bulk`, `delete_bulk`, `count` without the entity, a child in the same file keeps its entity (`create_run`, `update_cluster`, `add_span_annotation`), an action is named like its path verb (`duplicate`, `reorder`), and a computation is a verb plus the noun of its path (`compute_code_frequencies`, `search_memos`, `get_siblings`).
- **Path parameters**: `{<entity>_id}` with the entity's snake_case name, the same in every route (`{search_view_id}`), or one of the abbreviations `sdoc`, `sdoc_metadata`, `cota`, and a nested child drops its parent's name (`{run_id}` below `/experiments/{experiment_id}`).
- **Tags**: the first tag is the first path segment after `/projects/{project_id}` in camelCase, plural kept (`/span-annotations` → `spanAnnotations`, `/code-frequencies` → `codeFrequencies`, `/perspectives/aspects` → `perspectives`, `/jobs/…` → `jobs`, the project itself → `projects`), set on the router or, where the routes of a router start differently, on each route (`/members` and `/virtual-users`, `/heartbeat` and `/info`), followed by `mcp` for the routes of the MCP server.

### Kept Exceptions

- **Exceptions**: the tag recommendation routes wait for #976, `POST /authentication/login` keeps the OAuth2 password form, `GET /authentication/oidc/callback` keeps the redirect URI registered at the identity provider, and `PUT /members` takes the email of the invited user in its body instead of a user id in the path.

## Examples

See:

- [backend/src/core/code/code_endpoint.py](backend/src/core/code/code_endpoint.py) — canonical CRUD with sync (create/get/update/delete).
- [backend/src/core/annotation/span_annotation_endpoint.py](backend/src/core/annotation/span_annotation_endpoint.py) — bulk create/update/delete through a service with one `emit_to_project` per batch.
- [backend/src/modules/concept_over_time_analysis/cota_endpoint.py](backend/src/modules/concept_over_time_analysis/cota_endpoint.py) — canonical section blocks including job operations.
- [backend/src/modules/word_frequency/word_frequency_endpoint.py](backend/src/modules/word_frequency/word_frequency_endpoint.py) — POST computations without sync.
