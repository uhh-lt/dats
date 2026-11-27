# REST endpoint rules (draft for discussion)

Status: draft, 2026-11-27. The owner iterates on this file; the final version goes into `.github/instructions/backend-endpoint.instructions.md` and `docs/development/designing-endpoints.md`.

Routes are shown without the `/projects/{project_id}` prefix. They use the names of the final state (statistics below `/statistics`, singular for one thing).

A path is read from left to right: method, start, item, end. Then come input, output, the special places and the names in the code.

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

## 2. Path

### 2.1 Start

**A plural kebab-case noun. It is the thing itself if it carries the module's name, else the module namespace plus the thing. One router per module.**

| Example                                                          | Case                                                         |
| ---------------------------------------------------------------- | ------------------------------------------------------------ |
| `/codes`                                                         | stored thing, carries the module's name                      |
| `/code-frequencies`                                              | computed thing, carries the module's name                    |
| `/perspectives/aspects`, `/perspectives/clusters`                | module with several things: namespace plus thing             |
| `/statistics/codes`, `/llm-assistant/existing-annotation-counts` | thing does not carry the module's name: namespace plus thing |

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

**Nothing for plain create, read, update, delete. A noun if the request returns data, plural for a list and singular for one thing. A verb if it does something.**

| Example                                                | Case                                                 |
| ------------------------------------------------------ | ---------------------------------------------------- |
| `PATCH /codes/{code_id}`                               | plain update: no extra segment                       |
| `GET /source-documents/{sdoc_id}/data`                 | returns one thing: singular noun                     |
| `GET /source-documents/{sdoc_id}/siblings`             | returns a list: plural noun                          |
| `GET /source-documents/count`                          | returns one number of the collection: singular noun  |
| `POST /memos/suggestion`                               | computes one thing: singular noun                    |
| `POST /perspectives/aspects/{aspect_id}/visualization` | computes one thing of one item: singular noun        |
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
| `GET /span-groups?span_annotation_id=`, `GET /tags?sdoc_id=`                | list from the other side    |

Many links at a time, with `bulk` in the place of the group's id:

| Example                                     | Body                                      | Case                                                           |
| ------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------- |
| `PUT /tags/bulk/source-documents`           | tag ids, document ids                     | add many: every tag to every document                          |
| `DELETE /tags/bulk/source-documents`        | tag ids, document ids                     | remove many: every tag from every document                     |
| `PATCH /tags/bulk/source-documents`         | document ids, tags to add, tags to remove | change many: the same additions and removals on every document |
| `PATCH /tags/bulk/source-documents/replace` | per document its complete list of tag ids | replace: each document ends with exactly the given tags        |

Open: which of these operations every link must have (see O2).

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
| `POST /tags/count` with a list of document ids                                 | read with an id list: body, so `POST`      |
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

| Example                                  | Case                           |
| ---------------------------------------- | ------------------------------ |
| `POST /jobs/perspectives`                | start, whole input in the body |
| `GET /jobs/perspectives/{job_id}`        | read one job                   |
| `POST /jobs/perspectives/{job_id}/abort` | action on a job                |

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

**The first segment of the path in camelCase.**

| Example                                  | Case                              |
| ---------------------------------------- | --------------------------------- |
| `/span-annotations` → `spanAnnotations`  | kebab-case path, camelCase tag    |
| `/code-frequencies` → `codeFrequencies`  | the plural stays                  |
| `/perspectives/aspects` → `perspectives` | a namespace module: the namespace |
| `/statistics/codes` → `statistics`       | a namespace module: the namespace |
| `/jobs/…` → `jobs`                       | all job routes share one tag      |

## Kept exceptions

- The tag recommendation routes (#976).
- `POST /authentication/login` keeps the OAuth2 form, and the OIDC callback keeps its path.

## Open points

### O1 Prompt versions

Only `PUT /prompts/{prompt_id}/versions` exists (it saves the next version). There is no `GET …/versions` and no `…/versions/{version_id}`: `GET /prompts/{prompt_id}` returns the prompt with all its versions, and the unused single read was removed. By the rules, `GET /prompts/{prompt_id}/versions` would list the versions and `/versions/{version_id}` would be one version.

### O2 Links: which operations are mandatory

The rule and the shapes are decided (2.5). Open is how strict it is. The links today:

| Link                           | Today                                                                                                        | To follow 2.5                                                                              |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Span annotation and span group | single add and remove under `/span-annotations/{span_annotation_id}/span-groups/…`, reads on both sides      | move to `/span-groups/{span_group_id}/span-annotations/…`, the other side becomes a filter |
| Tag and document               | bulk only (all four are called by the frontend), `GET /tags/{tag_id}/source-documents`, `GET /tags?sdoc_id=` | single add and remove are missing                                                          |
| User and project               | `PUT /members` (email in the body), `DELETE /members/{user_id}`, `GET /members`                              | the add takes an email, not an id, so it cannot be `/members/{user_id}`                    |

### O3 Tags (decided)

The tag is the first path segment in camelCase (6.3). The rename of the tags, the generated client services (`SpanAnnotationService` becomes `SpanAnnotationsService`) and their imports is mechanical and part of the final session.
