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
