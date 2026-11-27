# Designing Endpoints

This page explains how the REST API of DATS is shaped, so that a new endpoint looks like the ones that exist and other developers can guess its route, method and body without reading the code. Every rule is one sentence, followed by real routes of DATS and a short note on the case each one shows.

The same rules, as one-sentence bullets for coding agents, live in `.github/instructions/backend-endpoint.instructions.md` (section "REST Design"). If this page and that file ever disagree, fix the disagreement.

Unless a route starts with `/users`, `/authentication`, `/info` or `/projects` itself, every route on this page lives below `/projects/{project_id}`: the project is the tenant, and every row of a project is identified by `(project_id, id)` (see ADR 0013).

A path is read from left to right: method, start, item, end. Then come the input, the output, the special places and the names in the code.

## 1. Method

**The method says what happens.**

| Example                   | Case                     |
| ------------------------- | ------------------------ |
| `GET /codes/{code_id}`    | reads                    |
| `PUT /codes`              | creates                  |
| `PATCH /codes/{code_id}`  | changes stored state     |
| `DELETE /codes/{code_id}` | deletes                  |
| `POST /code-frequencies`  | computes, stores nothing |
| `POST /jobs/perspectives` | starts a job             |

Many public APIs use `POST` for every write; DATS picks the method by the effect, also for an action: marking a memo as recent changes state (`PATCH /memos/{memo_id}/mark-recent`), duplicating creates a row (`PUT /whiteboards/{whiteboard_id}/duplicate`).

## 2. Path

### 2.1 Start

**A plural kebab-case noun. It is the thing itself if it carries the module's name, else the module namespace plus the thing. One router per endpoint file; all routes of a router share their first path segment, and the router sets the tag.**

| Example                                                               | Case                                                         |
| --------------------------------------------------------------------- | ------------------------------------------------------------ |
| `/codes`                                                              | stored thing, carries the module's name                      |
| `/code-frequencies`                                                   | computed thing, carries the module's name                    |
| `/perspectives/aspects`, `/perspectives/aspects/{aspect_id}/clusters` | module with several things: namespace plus thing             |
| `/statistics/codes`, `/llm-assistant/existing-annotation-counts`      | thing does not carry the module's name: namespace plus thing |

For example, `core/user` has `me_endpoint.py` (`/users/me`), `members_endpoint.py` (`/members`) and `virtual_users_endpoint.py` (`/virtual-users`). The router of a project route comes from `project_router(...)`, which checks the membership (and the module's feature) for every route.

### 2.2 Item

**One thing is `/{<entity>_id}`. A child with exactly one owner is nested one level below it. A thing that refers to several others stays flat and is filtered by them in the query.**

| Example                                              | Case                                                        |
| ---------------------------------------------------- | ----------------------------------------------------------- |
| `/codes/{code_id}`                                   | one item                                                    |
| `/experiments/{experiment_id}/runs`                  | the runs of one experiment: nested collection               |
| `/experiments/{experiment_id}/runs/{run_id}`         | a run exists only inside its experiment: nested item        |
| `/span-annotations/{span_annotation_id}`             | an annotation refers to a document, a code and a user: flat |
| `GET /span-annotations?sdoc_id=&code_id=&user_id=`   | the flat thing is filtered by what it refers to             |
| not `/experiments/{experiment_id}/runs/{run_id}/…/…` | never deeper than one level                                 |

A nested child of another parent answers 404. Links between two things have their own rule: see [2.5](#25-links).

### 2.3 End

**Nothing for plain create, read, update, delete. A noun if the request returns data: plural when the answer holds several results, which includes a list, a page of results and a map with one result per key; singular when it is one thing. A verb if it does something.**

| Example                                                | Case                                                 |
| ------------------------------------------------------ | ---------------------------------------------------- |
| `PATCH /codes/{code_id}`                               | plain update: no extra segment                       |
| `GET /source-documents/{sdoc_id}/siblings`             | a list: plural noun                                  |
| `POST /search/memos`                                   | a page of results: plural noun                       |
| `POST /tags/counts`                                    | a map with one result per key (per tag): plural noun |
| `GET /source-documents/count`                          | one number: singular noun                            |
| `POST /perspectives/aspects/{aspect_id}/visualization` | one object: singular noun                            |
| `POST /memos/suggestion`                               | one text: singular noun                              |
| `PUT /whiteboards/{whiteboard_id}/duplicate`           | does something to one item: verb                     |
| `PATCH /search-views/reorder`                          | does something to the collection: verb               |
| `POST /doc-processing/upload`                          | does something in a module: verb below the namespace |

A noun or verb sub-path of the collection is declared before `/{<entity>_id}`, so FastAPI does not read it as an id.

### 2.4 Bulk

**`/bulk` with the method of the single route and a list body.**

| Example                                     | Case              |
| ------------------------------------------- | ----------------- |
| `PUT /span-annotations/bulk`                | creates many      |
| `PATCH /codes/bulk`                         | updates many      |
| `DELETE /memos/bulk`                        | deletes many      |
| `PATCH /tags/bulk/source-documents/replace` | an action on many |

A bulk route answers in the order of its request.

### 2.5 Links

**A link between two things lives under the thing that groups: a span group groups annotations, a tag groups documents. The other side reads it with a filter.**

One link at a time:

| Example                                                                     | Case                        |
| --------------------------------------------------------------------------- | --------------------------- |
| `PUT /span-groups/{span_group_id}/span-annotations/{span_annotation_id}`    | add one                     |
| `DELETE /span-groups/{span_group_id}/span-annotations/{span_annotation_id}` | remove one                  |
| `GET /span-groups/{span_group_id}/span-annotations`                         | list the members of a group |
| `GET /span-groups?user_id=&span_annotation_id=`, `GET /tags?sdoc_id=`       | list from the other side    |

Many links at a time, with `bulk` in the place of the group's id:

| Example                                     | Body                                      | Case                                                           |
| ------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------- |
| `PUT /tags/bulk/source-documents`           | tag ids, document ids                     | add many: every tag to every document                          |
| `DELETE /tags/bulk/source-documents`        | tag ids, document ids                     | remove many: every tag from every document                     |
| `PATCH /tags/bulk/source-documents`         | document ids, tags to add, tags to remove | change many: the same additions and removals on every document |
| `PATCH /tags/bulk/source-documents/replace` | per document its complete list of tag ids | replace: each document ends with exactly the given tags        |

These eight are what a link may offer; no operation is mandatory, and a link offers only those that have a caller. The span groups have no bulk routes, and the tags have no single add or remove.

## 3. Input

### 3.1 GET

**Everything in the query: filters, sorting, paging. No `/by-…` paths.**

| Example                               | Case                      |
| ------------------------------------- | ------------------------- |
| `GET /tags?sdoc_id=`                  | filter by a related thing |
| `GET /memos?recent=true&limit=`       | filter and limit          |
| `GET /source-documents/count?status=` | filter on a noun sub-path |

The filters are optional query parameters of the collection, never one route per filter combination (`GET /source-documents?filename=`, not `GET /source-documents/by-filename`).

### 3.2 Everything else

**One body DTO, no query parameters. A read that needs a body is a `POST`.**

| Example                                                                        | Case                                       |
| ------------------------------------------------------------------------------ | ------------------------------------------ |
| `PUT /codes` with `CodeCreate`                                                 | create                                     |
| `POST /code-frequencies/occurrences` with `CodeOccurrenceRequest`              | computation                                |
| `POST /tags/counts` with `TagCountRequest`                                     | read with an id list: body, so `POST`      |
| `POST /search/source-documents` with filter, sorts, `page_number`, `page_size` | search with a filter tree: all in the body |
| `PATCH /codes/bulk` with a list                                                | bulk: the body is the list                 |

The body DTO lives in the module's `*_dto.py`; there are no loose `Body()` fields. A bare list body is only allowed on a bulk route. A read whose input fits into a URL is a `GET` (3.1). A test in `backend/test/endpoints/project_router/test_project_router.py` reads the OpenAPI schema and fails when a route breaks this rule.

### 3.3 Acting user

**The logged-in user. `user_id` only as a filter, or in the body where a virtual user may act.**

| Example                                                     | Case                             |
| ----------------------------------------------------------- | -------------------------------- |
| `PUT /codes`                                                | no `user_id`: the logged-in user |
| `PUT /span-annotations` with optional `user_id` in the body | annotating as a virtual user     |
| `GET /span-annotations?user_id=`                            | `user_id` as a filter            |

### 3.4 Files

**Form fields next to the files.**

| Example                       | Case                   |
| ----------------------------- | ---------------------- |
| `POST /doc-processing/upload` | files plus form fields |
| `POST /jobs/import`           | file plus its job type |

## 4. Output

**Always 200 with a body. Errors by cause. Lists in a defined order.**

| Example                                               | Case                                                                    |
| ----------------------------------------------------- | ----------------------------------------------------------------------- |
| `DELETE /codes/{code_id}` → 200 with the deleted code | no empty answers                                                        |
| 400                                                   | a rule of the domain is broken                                          |
| 403                                                   | not a member, or the feature is disabled                                |
| 404                                                   | an id in the path or one the route reads does not exist in this project |
| 409                                                   | a foreign key or unique constraint is violated                          |
| 422                                                   | the request is malformed                                                |

An id of another project therefore answers 404 in the path, 409 as a reference in the body of a write (the composite foreign key rejects it), and matches nothing as a filter. Endpoint code raises the domain exceptions of the module's `*_exceptions.py`, never `ValueError`, `Exception` or `assert`. A list comes in a defined order: a bulk route in the order of its request, a read in the order of its CRUD's `ORDER BY`.

## 5. Special places

### 5.1 Jobs

**Started and read under `/jobs/<job-type>`.**

| Example                                             | Case                                     |
| --------------------------------------------------- | ---------------------------------------- |
| `POST /jobs/perspectives`                           | start, whole input in the body           |
| `GET /jobs/perspectives/{job_id}`                   | read one job                             |
| `POST /jobs/classifier/{job_id}/abort`              | action on a job                          |
| `POST /concept-over-time-analyses/{cota_id}/refine` | a job on one item: a verb below the item |

### 5.2 me

**Everything personal below `/users/me`. No route takes another user's id outside a project.**

| Example                  | Case               |
| ------------------------ | ------------------ |
| `GET /users/me`          | the logged-in user |
| `PUT /users/me/api-keys` | a personal thing   |
| `GET /users/me/projects` | my projects        |

## 6. Names in the code

### 6.1 Handler names

**Standard names for the main thing of a file; a child keeps its entity; otherwise named like the path.**

| Example                                                                                | Case                                   |
| -------------------------------------------------------------------------------------- | -------------------------------------- |
| `create`, `get_by_id`, `get_by_project`, `update_by_id`, `delete_by_id`, `update_bulk` | the main thing                         |
| `create_run`, `update_cluster`, `add_span_annotation`                                  | a child in the same file               |
| `duplicate`, `reorder`                                                                 | an action: its path verb               |
| `compute_code_frequencies`                                                             | a computation: verb plus the path noun |

The handler name becomes the method of the generated frontend client and, with the tag, the MCP tool name, so it is chosen with care.

### 6.2 Path parameters

**`{<entity>_id}` in snake_case, the same name in every route.**

| Example                                         | Case                                   |
| ----------------------------------------------- | -------------------------------------- |
| `{search_view_id}`                              | full entity name                       |
| `{sdoc_id}`, `{cota_id}`                        | the fixed abbreviations                |
| `{run_id}` below `/experiments/{experiment_id}` | a nested child drops its parent's name |

### 6.3 Tags

**The first segment of the path in camelCase, set by the router.**

| Example                                  | Case                              |
| ---------------------------------------- | --------------------------------- |
| `/span-annotations` → `spanAnnotations`  | kebab-case path, camelCase tag    |
| `/code-frequencies` → `codeFrequencies`  | the plural stays                  |
| `/perspectives/aspects` → `perspectives` | a namespace module: the namespace |
| `/statistics/codes` → `statistics`       | a namespace module: the namespace |
| `/jobs/…` → `jobs`                       | all job routes share one tag      |
| `/projects/{project_id}` → `projects`    | the project itself                |

The tag names the service of the generated frontend client (`SpanAnnotationsService`) and starts the operation ids and MCP tool names (`spanAnnotations-create`). The router sets it, and no route sets a tag of its own; the tag `mcp` follows on the routers whose routes the MCP server offers as tools. A test in `test_project_router.py` checks every tag against its path.

## Adding a new endpoint

1. Find the module the route belongs to and the endpoint file of the route's first path segment; add a module only for a new capability.
2. Choose the method by the effect, and `GET` or `POST` for a read by its input.
3. Build the path from left to right: the start (thing or namespace plus thing), the item (nested or flat), the end (nothing, a noun in the right number, or a verb).
4. Put the whole input into one body DTO in the module's `*_dto.py`, unless the route is a `GET`.
5. Name the handler after the rules above; it becomes the client method.
6. Read every path id within the project, and let the composite foreign keys reject body references of another project.
7. Add the tests: the endpoint test file of the module, and the two-project tables of `backend/test/endpoints/project_router/` (see `backend-tests.instructions.md`).
8. Regenerate the frontend client with `just update-api` and adapt the callers.

## Kept exceptions

- **Tag recommendations**: the tag recommendation routes (`PATCH /tag-recommendations/review`, `GET /jobs/tag-recommendation/{job_id}/recommendations`) keep their shape until issue #976.
- **Login**: `POST /authentication/login` keeps the OAuth2 password form.
- **OIDC callback**: `GET /authentication/oidc/callback` is the redirect URI registered at the identity provider.
- **Two routers**: `project_endpoint.py` has a second router for `PUT /projects`, which creates a project outside every project and so cannot sit on the project router that checks the membership.
- **Root redirect**: `GET /` (a browser redirect to the docs) has no path segment and is hidden from the schema; it sits on the router of `info_endpoint.py`, which therefore has no prefix.
- **Members**: `PUT /members` takes the email of the invited user in its body, so it cannot be `/members/{user_id}`; `GET /members` and `DELETE /members/{user_id}` follow the rules.
