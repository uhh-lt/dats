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
