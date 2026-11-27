# REST endpoint rules

Status: final, 2026-11-27. Implemented in #984; `.github/instructions/backend-endpoint.instructions.md` and `docs/development/designing-endpoints.md` follow this file.

Routes are shown without the `/projects/{project_id}` prefix. They use the names of the final state (statistics below `/statistics`, singular for one thing).

A path is read from left to right: method, start, item, end. Then come input, output, the special places and the names in the code.

## 1. Method

**The method says what happens.**

| Example                        | Case                            |
| ------------------------------ | ------------------------------- |
| `GET /codes/{code_id}`         | reads                           |
| `PUT /codes`                   | creates                         |
| `PUT /authentication/register` | creates, also outside a project |
| `PATCH /codes/{code_id}`       | changes stored state            |
| `DELETE /codes/{code_id}`      | deletes                         |
| `POST /code-frequencies`       | computes, stores nothing        |
| `POST /jobs/perspectives`      | starts a job                    |

## 2. Path

### 2.1 Start

**A plural kebab-case noun. It is the thing itself if it carries the module's name, else the module namespace plus the thing. One router per endpoint file; all routes of a router share their first path segment, and the router sets the tag.**

| Example                                                               | Case                                                         |
| --------------------------------------------------------------------- | ------------------------------------------------------------ |
| `/codes`                                                              | stored thing, carries the module's name                      |
| `/code-frequencies`                                                   | computed thing, carries the module's name                    |
| `/perspectives/aspects`, `/perspectives/aspects/{aspect_id}/clusters` | module with several things: namespace plus thing             |
| `/statistics/codes`, `/llm-assistant/existing-annotation-counts`      | thing does not carry the module's name: namespace plus thing |

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

Links between two things have their own rule: see 2.5.

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

### 2.4 Bulk

**`/bulk` with the method of the single route and a list body.**

| Example                                     | Case              |
| ------------------------------------------- | ----------------- |
| `PUT /span-annotations/bulk`                | creates many      |
| `PATCH /codes/bulk`                         | updates many      |
| `DELETE /memos/bulk`                        | deletes many      |
| `PATCH /tags/bulk/source-documents/replace` | an action on many |

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

No operation is mandatory: a link offers only the operations that have a caller. The span groups have no bulk routes, and the tags have no single add or remove.

## 3. Input

### 3.1 GET

**Everything in the query: filters, sorting, paging. No `/by-…` paths.**

| Example                               | Case                      |
| ------------------------------------- | ------------------------- |
| `GET /tags?sdoc_id=`                  | filter by a related thing |
| `GET /memos?recent=true&limit=`       | filter and limit          |
| `GET /source-documents/count?status=` | filter on a noun sub-path |

### 3.2 Everything else

**One body DTO, no query parameters. A read that needs a body is a `POST`.**

| Example                                                                        | Case                                       |
| ------------------------------------------------------------------------------ | ------------------------------------------ |
| `PUT /codes` with `CodeCreate`                                                 | create                                     |
| `POST /code-frequencies/occurrences` with `CodeOccurrenceRequest`              | computation                                |
| `POST /tags/counts` with a list of document ids                                | read with an id list: body, so `POST`      |
| `POST /search/source-documents` with filter, sorts, `page_number`, `page_size` | search with a filter tree: all in the body |
| `PATCH /codes/bulk` with a list                                                | bulk: the body is the list                 |

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

## 5. Special places

### 5.1 Jobs

**Started and read under `/jobs/<job-type>`.**

| Example                                | Case                           |
| -------------------------------------- | ------------------------------ |
| `POST /jobs/perspectives`              | start, whole input in the body |
| `GET /jobs/perspectives/{job_id}`      | read one job                   |
| `POST /jobs/classifier/{job_id}/abort` | action on a job                |

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
| `create_run`, `update_cluster`                                                         | a child in the same file               |
| `duplicate`, `reorder`                                                                 | an action: its path verb               |
| `compute_code_frequencies`                                                             | a computation: verb plus the path noun |

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

## Kept exceptions

- The tag recommendation routes (#976), also their two endpoint files.
- `project_endpoint.py` has two routers: `PUT /projects` creates a project outside every project, so it sits next to the project router, which checks the membership.
- `GET /` (a browser redirect to the docs) has no path segment and is hidden from the schema; it sits on the router of `info_endpoint.py`, which therefore has no prefix.
- `POST /authentication/login` keeps the OAuth2 form, and the OIDC callback keeps its path.
- `PUT /members` takes the email of the invited user in its body, so it cannot be `/members/{user_id}`.
