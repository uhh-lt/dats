# Release Notes

Notes for administrators on what to expect when upgrading a DATS instance.

## Project Features

This release adds [project features](../feature-guides/project-features.md): every project chooses which features DATS computes for its documents.

- **Database migration**: the backend migrates the database on its first start. The migration moves the processing status of every document from the `sourcedocument` table into the new table `sourcedocumentstepstatus` and holds an exclusive lock on `sourcedocument`; it took about 13 seconds for 300,000 documents on a development machine. Plan the start accordingly, and make sure no health check restarts the backend while it migrates. The migration checks that no document changes its processing status and aborts the start (rolling back) otherwise.
- **Features stay enabled**: every existing project enables all features after the migration, except Coreference Resolution and Quotation Detection, so nothing is recomputed. Full-text search and Search & Auto-Annotate are always available and no features; Sentence Search and Image Search are one feature, **Semantic Search**. These two are new features that a project member enables in **Project Settings** → **Features**; they compute coreferences and quotations of German text documents.
- **ML Automation is gone**: the ML Automation page and its jobs are removed. Coreference resolution and quotation detection are the two features above, and tag recommendations are started on the **Tag Recommendations** page. The migration drops the table `sourcedocumentjobstatus` (the statuses of the old ML jobs) without moving its rows.
- **Tag Recommendations shows "partly available"**: before this release, document embeddings were computed on demand. After the migration, every existing project shows **Tag Recommendations** as partly available in **Project Settings** → **Features** until a project member clicks **Complete**, which computes the missing document embeddings in the background.
- **Features are planned in the background**: enabling or completing a feature returns at once; a low-priority job (an artefact computation) plans the project's documents in batches of `artefact_computation.batch_size` documents (default 10,000, in the backend configuration; an existing `feature_activation` override must be renamed to `artefact_computation`, or the backend does not start), so uploads are never held up by it. If a worker dies while it plans, RQ notices it once the job's timeout (1 day) has passed, and the feature becomes partly available; a project member then clicks **Complete**. While a feature is computing, it cannot be enabled, completed or disabled.
- **Dead workers fail their steps**: a step whose worker dies becomes erroneous once a live worker notices it (after the job timeout of 1 hour plus up to about 18 minutes), like a failed step. **Complete** or **Recompute** computes it again.
- **Empty the queues before the upgrade**: from this release on, the Redis queues and the failed job registry must be empty, and no upload may be in flight, when you upgrade: jobs stored by the previous version cannot be read anymore (their classes moved). The migration then resets the pending artefact computations of every project. An instance that runs a development version of this release, already past that migration, empties the queues and runs `UPDATE project SET artefact_computations = '{}'` after the upgrade, as a feature whose computation job was lost stays Computing otherwise. A step whose job was lost this way stays processing; **Recompute** in the document health view starts it again. Failed jobs from before the upgrade lose their message and cannot be retried; use **Recompute** instead of **Retry**.
- **Rolling back**: a downgrade of the migration after projects disabled features brings the steps they did not plan back as processing (documents that never finish) or as finished without data.

## Provider Configuration

Before upgrading, update the environment files used by the deployment. The LLM and embedding providers are now configured by the base URL of their OpenAI-compatible APIs:

- Replace `LLM_PROVIDER_HOST` and `LLM_PROVIDER_PORT` with `LLM_PROVIDER_URL`, for example `http://vllm-llm:8000/v1`.
- Replace `EMB_PROVIDER_HOST` and `EMB_PROVIDER_PORT` with `EMB_PROVIDER_URL`, for example `http://vllm-emb:8000/v1`.

Each URL must include the scheme and API path (usually `/v1`). Keep the existing `LLM_PROVIDER_API_KEY` and `EMB_PROVIDER_API_KEY` settings.
