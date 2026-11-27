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
router = project_router("/examples", tags=["example"], feature=EXAMPLE)

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

### HTTP Method Semantics

- **PUT = create, PATCH = update, DELETE = delete.** PUT, PATCH, and DELETE are _mutations_ and require sync (see below).
- **GET = read.** GET is a pure read and never syncs.
- **POST = computation or job start.** A computation is a one-time operation whose result is not persisted (search, statistics, exports, suggestions). Computations do **not** need sync.

### Project Routes

Every resource of a project lives under `/projects/{project_id}/...` (#928); `span_annotation_endpoint.py` is the example.

- **Router**: `router = project_router("/<resources>", tags=[...], feature=<FEATURE>)` (`common/project_router.py`) checks the membership and, for a feature module, the feature for every route; omit `feature` in core.
- **Routes outside projects**: a resource outside every project gets its own file with a plain `APIRouter(prefix=...)` (`me_endpoint.py` for `/users/me`, `info_endpoint.py`); the one exception is `project_endpoint.py`, whose `PUT /projects` (create) sits on a second router next to the project router.
- **Project from the path only**: every route takes `project_id: int`; request and create DTOs carry no `project_id`.
- **Paths**: plural kebab-case collections (`/span-annotations`), one resource at `/{<entity>_id}`, links at `/{<entity>_id}/<others>/{<other>_id}` (PUT adds, DELETE removes), bulk routes at `/bulk` declared before `/{<entity>_id}`, and every other path follows "Naming" under "REST Design".
- **Bulk links**: bulk links at `/bulk/<others>` (`/tags/bulk/source-documents`): PUT adds, DELETE removes, PATCH does both.
- **Filters**: optional query parameters on the collection (`GET /span-annotations?user_id=1&sdoc_id=2`), never one route per filter combination.
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

- **Methods**: `GET` reads, `PUT` creates, `PATCH` changes stored state, `DELETE` deletes and `POST` computes without storing or starts a job; an action takes the method of its effect (`PATCH /memos/{memo_id}/mark-recent`, `PUT /whiteboards/{whiteboard_id}/duplicate`).
- **GET or POST for a read**: a read whose input fits into a URL (scalars that filter, sort or page) is a `GET` (see "Read variants"), and a read whose input needs a body (id lists, filter trees) is a `POST` with one body DTO, a computation like every other (`POST /tags/count`, `POST /code-frequencies`).
- **Naming**: two questions decide every path, the prefix and the last segment.
- **Prefix**: does the thing carry the module's name? Yes, then the prefix is the thing (`/codes`, `/code-frequencies`, `/agreements`, `/document-samples`); no, then the module name is the namespace and the thing stands below it (`/perspectives/aspects`, `/llm-assistant/existing-annotation-counts`).
- **One router per module**: every route belongs to exactly one module, with one endpoint file and one router, and a module with several things that carry its name has the prefix `""` and names each thing in its paths (`/code-statistics` and `/tag-statistics` of the statistics module).
- **Last segment**: does the request return data, or does it do something? A request that returns data and stores nothing ends in a noun named after the result, also on one resource (`POST /code-frequencies`, `POST /perspectives/aspects/{aspect_id}/visualization`, `GET /source-documents/{sdoc_id}/siblings`).
- **Verbs**: a request that does something (changes stored state, starts a job, writes an export file and answers with its URL) ends in a verb that acts on what stands before it (`PUT /whiteboards/{whiteboard_id}/duplicate`, `PATCH /search-views/reorder`, `POST /agreements/export`), and a verb directly under a namespace acts on the module (`POST /doc-processing/upload`, `POST /authentication/login`).
- **Plain CRUD**: the create, read, update and delete of a collection, its items, its bulk routes and its links need no verb, the method names the effect (`PATCH /codes/{code_id}`, `DELETE /tags/bulk/source-documents`).
- **Noun number**: a result computed anew on every request is a plural noun like a collection (`/rag/answers`, `/memos/suggestions`, `/search-annotate/candidates`), one view or aggregate of a resource a singular noun (`/visualization`, `/count`).
- **Naming exceptions**: a job starts at `POST /jobs/<job-type>` without a verb, as the job reads share that path; the tag recommendation routes wait for #976; `GET /authentication/oidc/callback` is the redirect URI registered at the identity provider, and `/members` and `/virtual-users` stay on the user router.
- **Collections**: a resource is a plural kebab-case noun (`/span-annotations`) with one item at `/{<entity>_id}`, and every path segment is kebab-case.
- **Nested or flat**: does the child have exactly one owner, or does it point at several things? An owned child (it exists only inside one parent and is deleted with it) is nested one level under the parent and answers 404 for a child of another parent (`/experiments/{experiment_id}/runs/{run_id}`), while a resource that refers to several others stays flat with filters (`/span-annotations?sdoc_id=`).
- **Parts**: `GET /{<entity>_id}/<noun>` returns a part or a view of one resource (`/data`, `/urls`), never the rows of a resource with its own collection.
- **Links**: a link is `PUT` and `DELETE /{<entity>_id}/<others>/{<other>_id}`, its list `GET /{<entity>_id}/<others>`, bulk links `/bulk/<others>`.
- **Read variants**: a `GET` reads the items of a collection at the collection with query parameters (`GET /memos?recent=true`) and another shape at a noun sub-path declared before `/{<entity>_id}` (`GET /source-documents/count`, `/info`), and no path is `/by-<field>`.
- **Bulk**: a bulk route is `/bulk` with the method of the single route and a list body, answers in the order of the request, and a bulk action is `/bulk/<verb>` or `/bulk/<others>/<verb>` (`/tags/bulk/source-documents/replace`).
- **Jobs**: a job starts at `POST /jobs/<job-type>` or, when it works on one resource, at `POST /<resources>/{<entity>_id}/<verb>`, with its whole input in the body, is read at `GET /projects/{project_id}/jobs/<job-type>/{job_id}`, and every route under `/jobs` has the tag `job`.
- **me**: `/users/me` stands for the logged-in user, everything personal lives below it (`/users/me/api-keys`), and no route takes another user's id outside a project.
- **Status codes**: every route answers 200 with a body; 400 for a rule of the domain, 403 for a non-member or a disabled feature, 404 for an unknown path id or an id the route reads, 409 for a violated foreign key or unique constraint, 422 for an invalid request (`project_router` documents 400 to 409 once).
- **Errors in endpoints**: endpoint code raises domain exceptions from `*_exceptions.py`, never `ValueError`, `Exception` or `assert`.
- **Handler names**: the handler name is the method of the generated client; the main resource of a file uses `create`, `get_by_id`, `get_by_project`, `update_by_id`, `delete_by_id`, `create_bulk`, `update_bulk`, `delete_bulk`, `count` without the entity, a child resource in the same file keeps the entity (`create_run`, `update_cluster`), a request that does something is named like its path verb (`duplicate`, `refine`, `upload`) with the entity for a child resource (`refresh_run_scores`), and a request that returns data `<verb>_<result>` with the noun of its path (`compute_code_frequencies`, `search_memos`, `get_siblings`).
- **Path parameters**: a path id is `{<entity>_id}` with the entity's snake_case name, the same in every route, or one of the abbreviations `sdoc`, `sdoc_metadata`, `cota`, and a nested child drops its parent's name (`{run_id}` below `/experiments/{experiment_id}`).
- **Tags**: the first tag is the router prefix as a singular camelCase noun (`spanAnnotation`, `codeFrequency`), or the module name for the prefix `""` (`statistics`, `user`), and `mcp` is set on the router only.
- **Request shape**: the input of a create, an update, an action or a computation beyond its path is one body DTO from the module's `*_dto.py` (a bare list only on a bulk route), never loose `Body()` fields or query parameters next to a body.
- **Searches**: a `POST` search takes its filter, sorts and paging (`page_number`, `page_size`) in its body DTO (`QueryRequest`, `SourceDocumentSearchRequest`).
- **Acting user**: a request acts as the logged-in user without a `user_id`, and a create that may act as a virtual user has an optional `user_id` field in its body DTO (`SpanAnnotationCreate`).
- **Forms**: a file upload takes multipart form fields next to its files (`POST /doc-processing/upload`, `POST /jobs/import`), and `POST /authentication/login` keeps the OAuth2 password form.

## Examples

See:

- [backend/src/core/code/code_endpoint.py](backend/src/core/code/code_endpoint.py) — canonical CRUD with sync (create/get/update/delete).
- [backend/src/core/annotation/span_annotation_endpoint.py](backend/src/core/annotation/span_annotation_endpoint.py) — bulk create/update/delete through a service with one `emit_to_project` per batch.
- [backend/src/modules/concept_over_time_analysis/cota_endpoint.py](backend/src/modules/concept_over_time_analysis/cota_endpoint.py) — canonical section blocks including job operations.
- [backend/src/modules/word_frequency/word_frequency_endpoint.py](backend/src/modules/word_frequency/word_frequency_endpoint.py) — POST computations without sync.
