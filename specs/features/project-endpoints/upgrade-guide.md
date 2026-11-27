# Upgrade guide of the project endpoints (#927, #928, #977)

What an administrator and the owner of an external API client must know when upgrading from `main` to the release of this stack: the migration to project-keyed tables, the routes, the inputs, the answers, the tags and the MCP tools. It lives here instead of the admin docs by the owner's decision.

## Project-keyed tables

Migration `7f1bbe0f69d7_key_every_project_owned_table_by_its_project` gives every project-owned table a required `project_id`, filled from the parent rows, and identifies its rows by `(project_id, id)`. Composite foreign keys make PostgreSQL reject references between rows of different projects. The migration renames `objecthandle.project_id` to `attached_project_id` (a new `project_id` names the project the handle belongs to) and drops the `objecthandle.user_id` and `objecthandle.memo_id` columns. It runs automatically at backend startup and needs no configuration change.

An installation whose `objecthandle` table holds handles of users or memos (rows with `user_id` or `memo_id` set) cannot upgrade: these handles belong to no project, so the new `project_id` stays empty and the migration rolls back. Before upgrading, find them with:

```sql
SELECT id, user_id, memo_id FROM objecthandle WHERE user_id IS NOT NULL OR memo_id IS NOT NULL;
```

> **Back up and allow time for the upgrade.** Back up the database before upgrading. The migration rewrites the keys of every project-owned table, so it can take several minutes on a large installation. It rolls back if a row has no parent or references a row of another project. A downgrade restores the dropped handle columns empty.

## Routes

Every path changes against `main`, and several methods do: the routes of a project's data live below `/projects/{project_id}/` (for example `/projects/{project_id}/span-annotations` for `/span`), the others below `/users/me`, `/authentication`, `/info`, `/heartbeat` and `/projects`. There are no compatibility routes: deploy the frontend and the backend together, and regenerate external clients. The complete lists of the routes are the two OpenAPI schemas, `frontend/src/openapi.json` on `main` (275 operations) and in the release (261 operations). The tables below name what a client must know beyond the new paths.

### Removed routes

The paths of `main`:

| Route on `main`                                                                                      | Instead                                                                                                                      |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `GET /prompt/version/{version_id}`                                                                   | the versions are part of `GET /projects/{project_id}/prompts/{prompt_id}`                                                    |
| `GET /rag/chat_session`                                                                              | none                                                                                                                         |
| `GET /rag/models`                                                                                    | `GET /info/llms`                                                                                                             |
| `GET /word_frequency/sdoc/{sdoc_id}`                                                                 | none                                                                                                                         |
| `DELETE /span/{span_id}/groups`                                                                      | none (`DELETE /projects/{project_id}/span-groups/{span_group_id}/span-annotations/{span_annotation_id}` per group)           |
| `GET /user/all`, `GET /user/by_id/{user_id}`, `PATCH /user/{user_id}`, `DELETE /user/{user_id}`      | none: no route takes another user's id outside a project (`GET /projects/{project_id}/members` lists the users of a project) |
| `GET /sdocmeta/count_sdocs_with_date_metadata/{project_id}/metadata/{date_metadata_id}` (two counts) | `GET /projects/{project_id}/source-documents/count?date_metadata_id=` (one count)                                            |
| `GET /project/{project_id}/resolve_filename/{filename}` (the id, 404 if none)                        | `GET /projects/{project_id}/source-documents?filename=` (a list with zero or one document)                                   |

### Inputs

Every create, update, action and computation takes one JSON body DTO; query parameters belong to `GET` reads, and a file upload takes form fields (`POST /projects/{project_id}/jobs/import` with `import_job_type`). An id in the path is read within the project of the path. Field names stay, except:

| Route                                                                                                     | Change                                                                   |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `POST /projects/{project_id}/doc-processing/statuses`, `POST /projects/{project_id}/word-frequencies`     | the paging is `page_number` (was `page`) and `page_size` in the body     |
| `PATCH /projects/{project_id}/tags/bulk/source-documents`                                                 | `source_document_ids` (was `sdoc_ids`), `link_tag_ids`, `unlink_tag_ids` |
| `POST /projects/{project_id}/annotation-scaling/suggestions`                                              | `reject_code_id` (was `reject_cide_id`)                                  |
| `PUT /projects/{project_id}/span-annotations`, `/sentence-annotations`, `/bbox-annotations` (and `/bulk`) | `user_id` per annotation, optional (the logged-in user)                  |
| `POST /authentication/logout`, `/authentication/refresh-access`                                           | `refresh_token` in the body                                              |
| the job starts below `/projects/{project_id}/jobs/<job-type>`                                             | the input without `project_id`; unknown fields answer 422                |

Fields that were required and became optional, with defaults that keep the old behavior: `search_query`, `expert_mode`, `highlight` and `sorts` of `POST /projects/{project_id}/search/source-documents`; `page_number`, `page_size` and `sorts` of `POST /projects/{project_id}/doc-processing/statuses` and `POST /projects/{project_id}/word-frequencies`; `sorts` of the perspectives requests.

### Answers and status codes

- Every route answers 200 with a body: `PATCH /projects/{project_id}/memos/{memo_id}/mark-recent` (was `POST /memo/{memo_id}/recent` without a body) returns the memo.
- An id of another project answers 404 in the path and 409 as a reference in the body of a write (was 403, 400 or 404); as a filter it matches nothing.
- Client errors that answered 500 answer 400: a tag as its own parent, a metadata value of the wrong type, a sentence index a document lacks in `PUT …/annotation-scaling/suggestions/confirm`, a file that does not fit the import job type, an unknown sort column of the document statuses, a retry or recompute without documents or with documents of several doctypes.
- `only_if_finished` of `GET /projects/{project_id}/source-documents/{sdoc_id}` and `/data` defaults to false; with true, an unfinished document answers 409 (was 500).
- An export job whose parameters belong to another export type answers 422.
- `GET /projects/{project_id}/memos?limit=` takes at least 1 (422 otherwise); the recent memos come most recently opened first.
- Every list comes in a defined, complete order, also when its sort values tie.

## Tags

The OpenAPI tag of a route is the first segment of its path in camelCase, set by its router. The tag names the service of a client generated from the OpenAPI schema and starts every operation id.

| Tag on `main`             | Tag now                                                                      |
| ------------------------- | ---------------------------------------------------------------------------- |
| `agreement`               | `agreements`                                                                 |
| `annoscaling`             | `annotationScaling`                                                          |
| `api-key`                 | `users`                                                                      |
| `bboxAnnotation`          | `bboxAnnotations`                                                            |
| `classifier`              | `classifiers`, `jobs` (the classifier jobs)                                  |
| `code`                    | `codes`                                                                      |
| `code_frequency`          | `codeFrequencies`                                                            |
| `conceptOverTimeAnalysis` | `conceptOverTimeAnalyses`, `jobs` (the refinement jobs)                      |
| `docprocessing`           | `docProcessing`                                                              |
| `document_sampler`        | `documentSamples`                                                            |
| `experiment`              | `experiments`                                                                |
| `feature`                 | `features`, `info` (`GET /info/features`)                                    |
| `folder`                  | `folders`                                                                    |
| `general`                 | `info`, `heartbeat`                                                          |
| `import`, `job`           | `jobs`                                                                       |
| `keyword_statistics`      | `keywordStatistics`                                                          |
| `llm_assistant`           | `llmAssistant`, `jobs`                                                       |
| `memo`                    | `memos`                                                                      |
| `perspectives`            | `perspectives`, `jobs` (the perspectives jobs)                               |
| `project`                 | `projects`, `users` (`GET /users/me/projects`), `sourceDocuments`            |
| `prompt`                  | `prompts`                                                                    |
| `sdocMetadata`            | `sourceDocumentMetadata`, `sourceDocuments` (the count with a date metadata) |
| `searchView`              | `searchViews`                                                                |
| `search_annotate`         | `searchAnnotate`                                                             |
| `sentenceAnnotation`      | `sentenceAnnotations`                                                        |
| `simsearch`               | `similaritySearch`                                                           |
| `sourceDocument`          | `sourceDocuments`                                                            |
| `spanAnnotation`          | `spanAnnotations`, `spanGroups` (the span group links)                       |
| `spanGroup`               | `spanGroups`                                                                 |
| `tag`                     | `tags`                                                                       |
| `TagRecommendation`       | `tagRecommendations`, `jobs` (the recommendations of a job)                  |
| `timelineAnalysis`        | `timelineAnalyses`                                                           |
| `user`                    | `users`, `members`, `virtualUsers`                                           |
| `whiteboard`              | `whiteboards`                                                                |
| `word_frequency`          | `wordFrequencies`                                                            |

Unchanged: `authentication`, `projectMetadata`, `rag`, `search`, `statistics`.

## MCP tools

MCP clients read the tools from the server. A tool is a route of a router with the tag `mcp`, named after its operation id with `_` for `-`: `<tag>_<handler>`, for example `code_create_code` on `main` and `codes_create` now. All tool names change with the tags and the handler names. Further changes:

- The four span group link tools are gone (`spanAnnotation_add_to_group`, `spanAnnotation_remove_from_group`, `spanAnnotation_get_all_groups`, `spanAnnotation_remove_from_all_groups`): their routes moved to the span group router, which offers no MCP tools.
- `DELETE /users/me` is no tool anymore (`user_delete_me` on `main`): an agent must not delete the account.
- The tools of the removed user routes are gone with them.
- The fields that became optional (above) are optional in the tool arguments too.
