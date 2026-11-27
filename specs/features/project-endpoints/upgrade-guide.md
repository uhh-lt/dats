# Upgrade guide of the project endpoints (#927, #928, #977)

What an administrator and the owner of an external API client must know when upgrading to the release of this stack: the migration to project-keyed tables, the moved and renamed routes, the request shapes and the tags. It lives here instead of the admin docs by the owner's decision.

## Project-keyed tables

Migration `7f1bbe0f69d7_key_every_project_owned_table_by_its_project` gives every project-owned table a required `project_id`, filled from the parent rows, and identifies its rows by `(project_id, id)`. Composite foreign keys make PostgreSQL reject references between rows of different projects. The migration renames `objecthandle.project_id` to `attached_project_id` (a new `project_id` names the project the handle belongs to) and drops the `objecthandle.user_id` and `objecthandle.memo_id` columns. It runs automatically at backend startup and needs no configuration change.

The same release moves every route of a project's data below `/projects/{project_id}/`, for example `/projects/{project_id}/span-annotations`, without compatibility routes. Deploy the frontend and the backend together and update external API clients; MCP clients discover the new tool names and arguments from the server.

The release also renames or changes these routes. The paths are below `/projects/{project_id}/` unless they start with `/authentication`:

| Old route                                                                                                                                                             | New route                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `POST /authentication/refresh_access`                                                                                                                                 | `POST /authentication/refresh-access`                                                          |
| `PUT /experiments/runs` (body with `experiment_id`)                                                                                                                   | `PUT /experiments/{experiment_id}/runs` (body without `experiment_id`)                         |
| `DELETE /experiments/runs/{run_id}`                                                                                                                                   | `DELETE /experiments/{experiment_id}/runs/{run_id}`                                            |
| `PATCH /experiments/runs/{run_id}/scores`                                                                                                                             | `PATCH /experiments/{experiment_id}/runs/{run_id}/refresh-scores`                              |
| `POST /experiments/runs/{run_id}/export-log`                                                                                                                          | `POST /experiments/{experiment_id}/runs/{run_id}/export-log`                                   |
| `PATCH /experiments/{experiment_id}/scores`                                                                                                                           | `PATCH /experiments/{experiment_id}/refresh-scores`                                            |
| `PATCH /perspectives/clusters/{cluster_id}`                                                                                                                           | `PATCH /perspectives/aspects/{aspect_id}/clusters/{cluster_id}`                                |
| `POST /perspectives/aspects/{aspect_id}/accept-labels`, `/revert-labels`                                                                                              | `PATCH /perspectives/aspects/{aspect_id}/accept-labels`, `/revert-labels`                      |
| `POST /jobs/perspectives?aspect_id=...` (body: the parameters)                                                                                                        | `POST /jobs/perspectives` (body `{"aspect_id": ..., "parameters": {...}}`)                     |
| `GET /prompts/versions/{version_id}`                                                                                                                                  | removed                                                                                        |
| `POST /features/{feature}/enable`, `/disable`                                                                                                                         | `PATCH /features/{feature}/enable`, `/disable`                                                 |
| `GET /memos/recent?limit=...`                                                                                                                                         | `GET /memos?recent=true&limit=...`                                                             |
| `POST /memos/{memo_id}/recent` (no response body)                                                                                                                     | `PATCH /memos/{memo_id}/mark-recent` (returns the memo)                                        |
| `POST /annotation-scaling/suggest` (body field `reject_cide_id`)                                                                                                      | `POST /annotation-scaling/suggestions` (body field `reject_code_id`)                           |
| `POST /annotation-scaling/confirm-suggestions`                                                                                                                        | `PUT /annotation-scaling/suggestions/confirm`                                                  |
| `GET /rag/chat-session`                                                                                                                                               | removed                                                                                        |
| `GET /word-frequencies?sdoc_id=...`                                                                                                                                   | removed                                                                                        |
| `PATCH /concept-over-time-analyses/{cota_id}/annotate`, `/remove`                                                                                                     | `PATCH /concept-over-time-analyses/{cota_id}/annotate-sentences`, `/remove-sentences`          |
| `PATCH /search-views/order`                                                                                                                                           | `PATCH /search-views/reorder`                                                                  |
| `POST /code-frequency/frequencies`                                                                                                                                    | `POST /code-frequencies`                                                                       |
| `POST /code-frequency/occurrences`                                                                                                                                    | `POST /code-frequencies/occurrences`                                                           |
| `POST /keyword-statistics/keywords`                                                                                                                                   | `POST /keyword-statistics`                                                                     |
| `POST /document-sampler/sample-by-tags`                                                                                                                               | `POST /document-samples`                                                                       |
| `POST /agreement/compute`                                                                                                                                             | `POST /agreements`                                                                             |
| `POST /agreement/export-counts`                                                                                                                                       | `POST /agreements/export`                                                                      |
| `POST /agreement/segment-texts`                                                                                                                                       | `POST /agreements/segment-texts`                                                               |
| `POST /simsearch/sentences`, `/simsearch/images`                                                                                                                      | `POST /similarity-search/sentences`, `/similarity-search/images`                               |
| `GET /source-documents/by-filename?filename=...` (the id, 404 if none)                                                                                                | `GET /source-documents?filename=...` (a list with zero or one document)                        |
| `GET /sentence-annotations/by-sentence`                                                                                                                               | `GET /sentence-annotations/per-sentence`                                                       |
| `GET /source-document-metadata/date-count?date_metadata_id=...` (two counts)                                                                                          | `GET /source-documents/count?date_metadata_id=...` (one count)                                 |
| `PATCH /tags/bulk/source-documents/set`                                                                                                                               | `PATCH /tags/bulk/source-documents/replace`                                                    |
| `PATCH /tag-recommendations/review` (body field `reviewd_recommendation_ids`)                                                                                         | `PATCH /tag-recommendations/review` (body field `reviewed_recommendation_ids`)                 |
| `POST /llm-assistant/count-existing-annotations`                                                                                                                      | `POST /llm-assistant/existing-annotation-counts`                                               |
| `POST /search-annotate/auto-annotate`                                                                                                                                 | `POST /search-annotate/candidates`                                                             |
| `POST /rag/session`\1                                                                                                                                                 | `POST /rag/answer`                                                                             |
| `POST /doc-processing/search`                                                                                                                                         | `POST /doc-processing/statuses`                                                                |
| `GET /doc-processing/status?status=...`                                                                                                                               | `GET /doc-processing/statuses?status=...`                                                      |
| `POST /perspectives/aspects/{aspect_id}/visualize`                                                                                                                    | `POST /perspectives/aspects/{aspect_id}/visualization`                                         |
| `POST /word-frequencies/analysis`                                                                                                                                     | `POST /word-frequencies`                                                                       |
| `POST /memos/suggest`\1                                                                                                                                               | `POST /memos/suggestion`                                                                       |
| `GET /source-documents/{sdoc_id}/same-folder`                                                                                                                         | `GET /source-documents/{sdoc_id}/siblings`                                                     |
| `PUT`, `DELETE /span-annotations/{span_annotation_id}/span-groups/{span_group_id}`                                                                                    | `PUT`, `DELETE /span-groups/{span_group_id}/span-annotations/{span_annotation_id}`             |
| `GET /span-annotations/{span_annotation_id}/span-groups`                                                                                                              | `GET /span-groups?user_id=...&span_annotation_id=...` (the groups with their span annotations) |
| `DELETE /span-annotations/{span_annotation_id}/span-groups`                                                                                                           | removed                                                                                        |
| `POST /tags/count`, `/span-annotations/count`, `/sentence-annotations/count`                                                                                          | `POST /tags/counts`, `/span-annotations/counts`, `/sentence-annotations/counts`                |
| `GET /search/source-documents/info` (and `/search/memos/info`, `/search/span-annotations/info`, `/search/sentence-annotations/info`, `/search/bbox-annotations/info`) | `GET /search/source-documents/columns` (and the same for the others)                           |
| `GET /word-frequencies/info`                                                                                                                                          | `GET /word-frequencies/columns`                                                                |

The release also moves the input of these routes from query parameters and loose body fields into one JSON body (field names stay, except where noted). External API clients must send the fields in the body:

| Route                                                                                                                                                                                                                    | Now in the body                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `PUT /users/me/api-keys`                                                                                                                                                                                                 | `name`, `expires_in`                                                     |
| `POST /authentication/logout`, `/authentication/refresh-access`                                                                                                                                                          | `refresh_token`                                                          |
| `PUT /span-annotations`, `/sentence-annotations`, `/bbox-annotations` (and `/bulk`)                                                                                                                                      | `user_id` per annotation (optional, default the logged-in user)          |
| `POST /span-annotations/counts`, `/sentence-annotations/counts`\1                                                                                                                                                        | `user_id`, `sdoc_ids`, `code_ids`                                        |
| `PATCH /tags/bulk/source-documents`                                                                                                                                                                                      | `source_document_ids` (was `sdoc_ids`), `link_tag_ids`, `unlink_tag_ids` |
| `PATCH /search-views/reorder`                                                                                                                                                                                            | `entity_type`, `view_ids`                                                |
| `POST /search/source-documents`                                                                                                                                                                                          | all former query parameters, with `filter` and `sorts`                   |
| `POST /doc-processing/statuses`, `POST /word-frequencies`                                                                                                                                                                | the paging, as `page_number` (was `page`) and `page_size`                |
| `POST /doc-processing/retry`, `/doc-processing/recompute`                                                                                                                                                                | `doctype` or `processing_step` with `sdoc_ids`                           |
| `POST /jobs/import`                                                                                                                                                                                                      | `import_job_type` as a form field next to the file                       |
| every other computation with query parameters (statistics, frequencies, similarity search, RAG, perspectives, memo suggestions, document samples, experiment log export, COTA sentence actions, agreement segment texts) | its former query parameters and bare lists, as named fields              |

The OpenAPI tag of a route is now the first segment of its path in camelCase. The tag names the service of a client generated from the OpenAPI schema and starts every operation id, so the MCP tool names change with it (`spanAnnotation-create` becomes `spanAnnotations-create`); MCP clients read the new names from the server. `GET /` (a redirect to `/docs`) is no longer part of the schema.

| Old tag                   | New tag                                                     |
| ------------------------- | ----------------------------------------------------------- |
| `agreement`               | `agreements`                                                |
| `analysis`                | `codeFrequencies`, `documentSamples`, `sourceDocuments`     |
| `annoscaling`             | `annotationScaling`                                         |
| `api-key`                 | `users`                                                     |
| `bboxAnnotation`          | `bboxAnnotations`                                           |
| `classifier`              | `classifiers`, `jobs` (the classifier jobs)                 |
| `code`                    | `codes`                                                     |
| `conceptOverTimeAnalysis` | `conceptOverTimeAnalyses`                                   |
| `docprocessing`           | `docProcessing`                                             |
| `folder`                  | `folders`                                                   |
| `general`                 | `info`, `heartbeat`                                         |
| `import`, `job`           | `jobs`                                                      |
| `llm_assistant`           | `llmAssistant`                                              |
| `memo`                    | `memos`                                                     |
| `project`                 | `projects`, `users` (`GET /users/me/projects`)              |
| `prompt`                  | `prompts`                                                   |
| `sdocMetadata`            | `sourceDocumentMetadata`                                    |
| `search_annotate`         | `searchAnnotate`                                            |
| `searchView`              | `searchViews`                                               |
| `sentenceAnnotation`      | `sentenceAnnotations`                                       |
| `simsearch`               | `similaritySearch`                                          |
| `sourceDocument`          | `sourceDocuments`                                           |
| `spanAnnotation`          | `spanAnnotations`                                           |
| `spanGroup`               | `spanGroups`                                                |
| `statistics`              | `statistics`, `keywordStatistics`                           |
| `tag`                     | `tags`                                                      |
| `TagRecommendation`       | `tagRecommendations`, `jobs` (the recommendations of a job) |
| `timelineAnalysis`        | `timelineAnalyses`                                          |
| `user`                    | `users`, `members`, `virtualUsers`                          |
| `whiteboard`              | `whiteboards`                                               |
| `word_frequency`          | `wordFrequencies`                                           |

An installation whose `objecthandle` table holds handles of users or memos (rows with `user_id` or `memo_id` set) cannot upgrade: these handles belong to no project, so the new `project_id` stays empty and the migration rolls back. Before upgrading, find them with:

```sql
SELECT id, user_id, memo_id FROM objecthandle WHERE user_id IS NOT NULL OR memo_id IS NOT NULL;
```

> **Back up and allow time for the upgrade.** Back up the database before upgrading. The migration rewrites the keys of every project-owned table, so it can take several minutes on a large installation. It rolls back if a row has no parent or references a row of another project. A downgrade restores the dropped handle columns empty.
