# Designing Endpoints

This page explains how the REST API of DATS is shaped, so that a new endpoint looks like the ones that exist and other developers can guess its route, method and body without reading the code. The rules are short on purpose; every section shows real routes of DATS.

The same rules, as one-sentence bullets for coding agents, live in `.github/instructions/backend-endpoint.instructions.md` (section "REST Design"). If this page and that file ever disagree, fix the disagreement.

Unless a route starts with `/users`, `/authentication`, `/info` or `/projects` itself, every route on this page lives below `/projects/{project_id}`: the project is the tenant, and every row of a project is identified by `(project_id, id)` (see ADR 0013).

## Methods

DATS uses its own convention for the HTTP methods. Many public APIs use `POST` for every write; DATS picks the method by the effect:

| Method   | Meaning                                   | Example                                                 |
| -------- | ----------------------------------------- | ------------------------------------------------------- |
| `GET`    | reads, stores nothing                     | `GET /codes`, `GET /codes/{code_id}`                    |
| `PUT`    | creates                                   | `PUT /codes`, `PUT /span-annotations/bulk`              |
| `PATCH`  | changes stored state                      | `PATCH /codes/{code_id}`, `PATCH /search-views/reorder` |
| `DELETE` | deletes                                   | `DELETE /codes/{code_id}`                               |
| `POST`   | computes without storing, or starts a job | `POST /code-frequencies`, `POST /jobs/export`           |

An action takes the method of its effect: duplicating creates a row (`PUT /whiteboards/{whiteboard_id}/duplicate`), marking a memo as recent changes state (`PATCH /memos/{memo_id}/mark-recent`), refining a concept-over-time analysis starts a job (`POST /concept-over-time-analyses/{cota_id}/refine`).

### GET or POST for a read

Ask: **does the input of the read fit into a URL?**

- Yes, it is a few scalars that filter, sort or page: a `GET` (see [Read variants](#read-variants)). Example: `GET /source-documents/count`, `GET /span-annotations?user_id=1&sdoc_id=2`.
- No, it needs a body (lists of ids, filter trees): a `POST` with one body DTO. It is then a computation like every other, and its last segment is a noun. Example: `POST /tags/count`, `POST /code-frequencies`, `POST /search/memos`.

## Naming: two questions

Two questions decide every path.

### 1. The prefix: does the thing carry the module's name?

- **Yes**: the prefix is the thing. The code module serves `/codes`, the code frequency module `/code-frequencies`, the agreement module `/agreements`, the document sampler `/document-samples`.
- **No**: the module's name is the namespace, and the thing stands below it. The perspectives module serves `/perspectives/aspects`, the LLM assistant `/llm-assistant/existing-annotation-counts`, the similarity search `/similarity-search/sentences`.

Do not mix both: a prefix is either a thing or a namespace.

### 2. The last segment: does the request return data, or does it do something?

- **Returns data** (stores nothing): the last segment is a **noun** named after the result. This also holds on one resource.
- **Does something** (changes stored state, starts a job, writes an export file and answers with its URL): the last segment is a **verb** that acts on what stands before it. A verb directly under a namespace acts on the module.

| Do                                                     | Do not                                   |
| ------------------------------------------------------ | ---------------------------------------- |
| `POST /perspectives/aspects/{aspect_id}/visualization` | `.../visualize` (it returns data)        |
| `POST /llm-assistant/existing-annotation-counts`       | `.../count-existing-annotations`         |
| `POST /search-annotate/candidates`                     | `.../auto-annotate` (it creates nothing) |

Actions: `PUT /whiteboards/{whiteboard_id}/duplicate`, `POST /agreements/export`, `POST /doc-processing/upload`, `POST /authentication/login`.

A result computed anew on every request is a plural noun, like a collection (`POST /rag/answers`, `POST /memos/suggestions`); one view or aggregate of a resource is singular (`/visualization`, `/count`).

The plain create, read, update and delete of a collection, its items, its bulk routes and its links need no verb: the method names the effect (`PATCH /codes/{code_id}`, `DELETE /tags/bulk/source-documents`).

## One router per module

Every route belongs to exactly one module, and a module has one endpoint file (`*_endpoint.py`) with one router. The router of a project module comes from `project_router(...)`, which checks the membership (and the module's feature) for every route.

A module with several things that carry its name has the prefix `""` and names each thing in its paths: the statistics module serves `POST /code-statistics` and `POST /tag-statistics`.

## Collections

A resource is a plural kebab-case noun with one item at `/{<entity>_id}`, and every path segment is kebab-case:

- `GET /span-annotations`, `GET /span-annotations/{span_annotation_id}`
- `GET /source-document-metadata/{sdoc_metadata_id}`

## Nested or flat

Ask: **does the child have exactly one owner, or does it point at several things?**

- **One owner** (it exists only inside its parent and is deleted with it): nest it one level under the parent. A child of another parent answers 404. Example: the runs of an experiment, `DELETE /experiments/{experiment_id}/runs/{run_id}`; the clusters of an aspect, `PATCH /perspectives/aspects/{aspect_id}/clusters/{cluster_id}`.
- **Points at several things** (a span annotation points at a document, a code and a user): keep it flat and filter the collection. Example: `GET /span-annotations?user_id=1&sdoc_id=2`, never `/source-documents/{sdoc_id}/span-annotations`.

## Parts of one resource

`GET /{<entity>_id}/<noun>` returns a part or a view of one resource, never the rows of a resource that has its own collection:

- `GET /source-documents/{sdoc_id}/data`, `GET /source-documents/{sdoc_id}/urls`, `GET /whiteboards/{whiteboard_id}/data`

## Links

A link between two resources is `PUT` (add) and `DELETE` (remove) on `/{<entity>_id}/<others>/{<other>_id}`, its list is `GET /{<entity>_id}/<others>`, and bulk links live at `/bulk/<others>`:

- `PUT /span-annotations/{span_annotation_id}/span-groups/{span_group_id}`
- `GET /span-annotations/{span_annotation_id}/span-groups`
- `PUT /tags/bulk/source-documents` (link), `DELETE /tags/bulk/source-documents` (unlink), `PATCH /tags/bulk/source-documents` (both)

## Read variants

A `GET` reads the items of a collection at the collection, with query parameters as filters; a read of another shape is a noun sub-path declared before `/{<entity>_id}`. There is no `/by-<field>` path.

| Do                                     | Do not                              |
| -------------------------------------- | ----------------------------------- |
| `GET /memos?recent=true`               | `GET /memos/recent`                 |
| `GET /source-documents?filename=a.txt` | `GET /source-documents/by-filename` |
| `GET /source-documents/count`          |                                     |
| `GET /classifiers/info`                |                                     |

## Bulk

A bulk route is `/bulk` with the method of the single route and a list body, and it answers in the order of the request. A bulk action is `/bulk/<verb>` or `/bulk/<others>/<verb>`:

- `PUT /span-annotations/bulk`, `PATCH /span-annotations/bulk`, `DELETE /span-annotations/bulk`
- `PATCH /tags/bulk/source-documents/replace`

## Jobs

A job starts at `POST /jobs/<job-type>` or, when it works on one resource, at `POST /<resources>/{<entity>_id}/<verb>`, with its whole input in the body. Its state is read at `GET /jobs/<job-type>/{job_id}`, and every route under `/jobs` has the tag `job`:

- `POST /jobs/export`, `GET /jobs/export/{job_id}`
- `POST /concept-over-time-analyses/{cota_id}/refine`, read at `GET /jobs/cota-refinement/{job_id}`
- `POST /jobs/classifier/{job_id}/abort`, `POST /jobs/classifier/{job_id}/retry`

## Request shape

The input of a create, an update, an action or a computation beyond its path is **one body DTO** from the module's `*_dto.py`. A bare list body is only allowed on a bulk route. There are no loose `Body()` fields and no query parameters next to a body; query parameters belong to `GET` reads.

- A `POST` search takes its filter, sorts and paging (`page_number`, `page_size`) in its body: `POST /search/memos` (`QueryRequest`), `POST /search/source-documents` (`SourceDocumentSearchRequest`).
- A request acts as the logged-in user without a `user_id`. A create that may act as a virtual user has an optional `user_id` field in its body DTO (`PUT /span-annotations` with `SpanAnnotationCreate`).
- A file upload takes multipart form fields next to its files (`POST /doc-processing/upload`, `POST /jobs/import`); `POST /authentication/login` keeps the OAuth2 password form.

| Do                                                                   | Do not                                                   |
| -------------------------------------------------------------------- | -------------------------------------------------------- |
| `POST /code-statistics` with `{"code_id": 1, "sdoc_ids": [1, 2]}`    | `POST /code-statistics?code_id=1` with the body `[1, 2]` |
| `PUT /users/me/api-keys` with `{"name": "...", "expires_in": "..."}` | `PUT /users/me/api-keys?name=...&expires_in=...`         |

A test in `backend/test/endpoints/project_router/test_project_router.py` reads the OpenAPI schema and fails when a route breaks this rule.

## The logged-in user: `/users/me`

`/users/me` stands for the logged-in user, and everything personal lives below it. No route outside a project takes the id of another user.

- `GET /users/me`, `PATCH /users/me`, `GET /users/me/projects`, `GET /users/me/api-keys`

## Status codes

Every route answers 200 with a body. Errors:

| Status | When                                                                   |
| ------ | ---------------------------------------------------------------------- |
| 400    | a rule of the domain is broken                                         |
| 403    | the user is no member of the project, or the feature is disabled       |
| 404    | an id of the path, or an id the route reads, is unknown in the project |
| 409    | a foreign key or a unique constraint is violated                       |
| 422    | the request is invalid (validation of the body or the parameters)      |

An id of another project therefore answers 404 in the path, 409 as a reference in the body of a write (the composite foreign key rejects it), and matches nothing as a filter. Endpoint code raises the domain exceptions of the module's `*_exceptions.py`, never `ValueError`, `Exception` or `assert`.

## Handler names

The name of the handler function becomes the method of the generated frontend client (and the MCP tool name), so it is chosen with care:

- The main resource of a file uses `create`, `get_by_id`, `get_by_project`, `update_by_id`, `delete_by_id`, `create_bulk`, `update_bulk`, `delete_bulk`, `count`, without the entity.
- A child resource in the same file keeps the entity: `create_run`, `update_cluster`.
- A request that does something is named like the verb of its path, with the entity for a child resource: `duplicate`, `refine`, `upload`, `refresh_run_scores`.
- A request that returns data is `<verb>_<result>` with the noun of its path: `compute_code_frequencies`, `search_memos`, `get_siblings`.

## Path parameters

A path id is `{<entity>_id}` with the entity's snake_case name, the same in every route (`{span_annotation_id}`, `{whiteboard_id}`), or one of the abbreviations `sdoc`, `sdoc_metadata`, `cota`. A nested child drops its parent's name: `{run_id}` below `/experiments/{experiment_id}`.

## Tags

The first tag of a router is its prefix as a singular camelCase noun (`spanAnnotation`, `codeFrequency`), or the module's name for the prefix `""` (`statistics`, `user`). The tag `mcp` (which exposes the routes as MCP tools) is set on the router only.

## Adding a new endpoint

1. Find the module the route belongs to and its one endpoint file; add a module only for a new capability.
2. Choose the method by the effect (and `GET` or `POST` for a read by its input).
3. Answer the two naming questions: the prefix (thing or namespace) and the last segment (noun for data, verb for an action).
4. Decide nested or flat by the number of owners.
5. Put the whole input into one body DTO in the module's `*_dto.py`, unless the route is a `GET`.
6. Name the handler after the rules above; it becomes the client method.
7. Read every path id within the project, and let the composite foreign keys reject body references of another project.
8. Add the tests: the endpoint test file of the module, and the two-project tables of `backend/test/endpoints/project_router/` (see `backend-tests.instructions.md`).
9. Regenerate the frontend client with `just update-api` and adapt the callers.

## Kept exceptions

- **Job starts**: `POST /jobs/<job-type>` has no verb, as the job reads share that path.
- **Tag recommendations**: the tag recommendation routes (`PATCH /tag-recommendations/review`, `GET /jobs/tag-recommendation/{job_id}/recommendations`) keep their shape until issue #976.
- **OIDC callback**: `GET /authentication/oidc/callback` is the redirect URI registered at the identity provider.
- **Users**: `/members` and `/virtual-users` stay on the user router.
- **Login**: `POST /authentication/login` takes the OAuth2 password form.
