# Admin

This section is for administrators who deploy and operate a self-hosted DATS instance.

Here you'll find guides for installation, configuration, backups, upgrades, and day-to-day operation of a production DATS deployment.

!!! note
This section is a work in progress. Content is being migrated from the project wiki.

## LLM and embedding providers

DATS connects to OpenAI-compatible LLM and embedding APIs through these base URLs in `docker/.env` and `backend/.env`:

| Variable           | Description                         | Example                   |
| ------------------ | ----------------------------------- | ------------------------- |
| `LLM_PROVIDER_URL` | Base URL of the LLM API             | `http://vllm-llm:8000/v1` |
| `EMB_PROVIDER_URL` | Base URL of the embedding model API | `http://vllm-emb:8000/v1` |

Each URL must start with `http://` or `https://`. Include the path required by the provider or gateway, such as `/v1`. The `LLM_PROVIDER_API_KEY` and `EMB_PROVIDER_API_KEY` settings remain separate.

### Upgrading from host and port settings

The old `LLM_PROVIDER_HOST`, `LLM_PROVIDER_PORT`, `EMB_PROVIDER_HOST`, and `EMB_PROVIDER_PORT` variables are no longer read. Replace them with the two URL variables in both `.env` files before restarting DATS. For example, `LLM_PROVIDER_HOST=vllm-llm` and `LLM_PROVIDER_PORT=8000` become `LLM_PROVIDER_URL=http://vllm-llm:8000/v1`.

## Filesystem layout and retention

DATS stores persistent files below `filesystem.root_directory` (`FILESYSTEM_ROOT_DIRECTORY`, default `docker/backend_repo`). Each project has a `projects/<project_id>/` folder. Within it, uploads, derived media, models, plots and exports use one folder per entity, for example `sdoc_files/<sdoc_id>/<filename>`, `thumbnails/<sdoc_id>/`, `audio/<sdoc_id>/` and `exports/<export_id>/`. Staging and scratch folders live next to `projects/` in `temporary_files/<uuid>/`.

At startup, DATS deletes temporary folders older than `filesystem.temporary_ttl` (default `86400` seconds, or one day) and expired exports. Exports expire after 10 minutes; writing another export also removes that project's expired exports.

The unused `filesystem.content_server` configuration has been removed. The content server still serves the files under `/content/`, but the backend no longer reads `CONTENT_SERVER_HTTPS`, `CONTENT_SERVER_HOST`, `CONTENT_SERVER_PORT` or `CONTENT_SERVER_CONTEXT_PATH` to construct file URLs.

### Upgrading to the entity-based file store

Migration `807bab97f373_file_store` moves existing uploads, derived media, models and plots from the legacy `docs/`, `models/` and `plots/` folders into the entity folders. It then deletes the files left in those legacy folders and in `dataloaders/`, including split uploads, extracted archives, training checkpoints and files of deleted entities. The migration also drops the `sourcedocumentdata.repo_url` and `classifier.path` database columns.

!!! warning "Back up before upgrading"

    Back up both the database and the filesystem before running this migration. It cannot be downgraded: the old file layout and dropped database columns are not restored.

## Upgrading to project-keyed tables

Migration `7f1bbe0f69d7_key_every_project_owned_table_by_its_project` gives every project-owned table a required `project_id`, filled from the parent rows, and identifies its rows by `(project_id, id)`. Composite foreign keys make PostgreSQL reject references between rows of different projects. The migration renames `objecthandle.project_id` to `attached_project_id` (a new `project_id` names the project the handle belongs to) and drops the `objecthandle.user_id` and `objecthandle.memo_id` columns. It runs automatically at backend startup and needs no configuration change.

The same release moves every route of a project's data below `/projects/{project_id}/`, for example `/projects/{project_id}/span-annotations`, without compatibility routes. Deploy the frontend and the backend together and update external API clients; MCP clients discover the new tool names and arguments from the server.

The release also renames or changes these routes. The paths are below `/projects/{project_id}/` unless they start with `/authentication`:

| Old route                                                                     | New route                                                                             |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `POST /authentication/refresh_access`                                         | `POST /authentication/refresh-access`                                                 |
| `PUT /experiments/runs` (body with `experiment_id`)                           | `PUT /experiments/{experiment_id}/runs` (body without `experiment_id`)                |
| `DELETE /experiments/runs/{run_id}`                                           | `DELETE /experiments/{experiment_id}/runs/{run_id}`                                   |
| `PATCH /experiments/runs/{run_id}/scores`                                     | `PATCH /experiments/{experiment_id}/runs/{run_id}/refresh-scores`                     |
| `POST /experiments/runs/{run_id}/export-log`                                  | `POST /experiments/{experiment_id}/runs/{run_id}/export-log`                          |
| `PATCH /experiments/{experiment_id}/scores`                                   | `PATCH /experiments/{experiment_id}/refresh-scores`                                   |
| `PATCH /perspectives/clusters/{cluster_id}`                                   | `PATCH /perspectives/aspects/{aspect_id}/clusters/{cluster_id}`                       |
| `POST /perspectives/aspects/{aspect_id}/accept-labels`, `/revert-labels`      | `PATCH /perspectives/aspects/{aspect_id}/accept-labels`, `/revert-labels`             |
| `POST /jobs/perspectives?aspect_id=...` (body: the parameters)                | `POST /jobs/perspectives` (body `{"aspect_id": ..., "parameters": {...}}`)            |
| `GET /prompts/versions/{version_id}`                                          | removed                                                                               |
| `POST /features/{feature}/enable`, `/disable`                                 | `PATCH /features/{feature}/enable`, `/disable`                                        |
| `GET /memos/recent?limit=...`                                                 | `GET /memos?recent=true&limit=...`                                                    |
| `POST /memos/{memo_id}/recent` (no response body)                             | `PATCH /memos/{memo_id}/mark-recent` (returns the memo)                               |
| `POST /annotation-scaling/suggest` (body field `reject_cide_id`)              | `POST /annotation-scaling/suggestions` (body field `reject_code_id`)                  |
| `POST /annotation-scaling/confirm-suggestions`                                | `PUT /annotation-scaling/suggestions/confirm`                                         |
| `GET /rag/chat-session`                                                       | removed                                                                               |
| `GET /word-frequencies?sdoc_id=...`                                           | removed                                                                               |
| `PATCH /concept-over-time-analyses/{cota_id}/annotate`, `/remove`             | `PATCH /concept-over-time-analyses/{cota_id}/annotate-sentences`, `/remove-sentences` |
| `PATCH /search-views/order`                                                   | `PATCH /search-views/reorder`                                                         |
| `POST /code-frequency/frequencies`                                            | `POST /code-frequencies`                                                              |
| `POST /code-frequency/occurrences`                                            | `POST /code-frequencies/occurrences`                                                  |
| `POST /keyword-statistics/keywords`                                           | `POST /keyword-statistics`                                                            |
| `POST /document-sampler/sample-by-tags`                                       | `POST /document-samples`                                                              |
| `POST /agreement/compute`                                                     | `POST /agreements`                                                                    |
| `POST /agreement/export-counts`                                               | `POST /agreements/export`                                                             |
| `POST /agreement/segment-texts`                                               | `POST /agreements/segment-texts`                                                      |
| `POST /simsearch/sentences`, `/simsearch/images`                              | `POST /similarity-search/sentences`, `/similarity-search/images`                      |
| `GET /source-documents/by-filename?filename=...` (the id, 404 if none)        | `GET /source-documents?filename=...` (a list with zero or one document)               |
| `GET /sentence-annotations/by-sentence`                                       | `GET /sentence-annotations/per-sentence`                                              |
| `GET /source-document-metadata/date-count?date_metadata_id=...` (two counts)  | `GET /source-documents/count?date_metadata_id=...` (one count)                        |
| `PATCH /tags/bulk/source-documents/set`                                       | `PATCH /tags/bulk/source-documents/replace`                                           |
| `PATCH /tag-recommendations/review` (body field `reviewd_recommendation_ids`) | `PATCH /tag-recommendations/review` (body field `reviewed_recommendation_ids`)        |
| `POST /llm-assistant/count-existing-annotations`                              | `POST /llm-assistant/existing-annotation-counts`                                      |
| `POST /search-annotate/auto-annotate`                                         | `POST /search-annotate/candidates`                                                    |
| `POST /rag/session`                                                           | `POST /rag/answers`                                                                   |
| `POST /doc-processing/search`                                                 | `POST /doc-processing/statuses`                                                       |
| `GET /doc-processing/status?status=...`                                       | `GET /doc-processing/statuses?status=...`                                             |
| `POST /perspectives/aspects/{aspect_id}/visualize`                            | `POST /perspectives/aspects/{aspect_id}/visualization`                                |
| `POST /statistics/codes`                                                      | `POST /code-statistics`                                                               |
| `POST /statistics/tags`                                                       | `POST /tag-statistics`                                                                |
| `POST /word-frequencies/analysis`                                             | `POST /word-frequencies`                                                              |
| `POST /memos/suggest`                                                         | `POST /memos/suggestions`                                                             |
| `GET /source-documents/{sdoc_id}/same-folder`                                 | `GET /source-documents/{sdoc_id}/siblings`                                            |

An installation whose `objecthandle` table holds handles of users or memos (rows with `user_id` or `memo_id` set) cannot upgrade: these handles belong to no project, so the new `project_id` stays empty and the migration rolls back. Before upgrading, find them with:

```sql
SELECT id, user_id, memo_id FROM objecthandle WHERE user_id IS NOT NULL OR memo_id IS NOT NULL;
```

!!! warning "Back up and allow time for the upgrade"

    Back up the database before upgrading. The migration rewrites the keys of every project-owned table, so it can take several minutes on a large installation. It rolls back if a row has no parent or references a row of another project. A downgrade restores the dropped handle columns empty.
