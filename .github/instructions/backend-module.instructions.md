---
applyTo: "backend/src/modules/**,backend/src/core/artefacts/**"
paths:
  - "backend/src/modules/**"
  - "backend/src/core/artefacts/**"
---

# Backend Modules: Artefacts, Pipeline Steps, Features and Jobs

What a developer of a module or a core artefact must do; the model is explained in `docs/development/module-architecture.md` and `backend/src/systems/artefact_system/README.md`.

## Artefacts

- An artefact every document or several features need lives in `core/artefacts/<name>/`, an artefact only one feature reads in the folder of that feature's module, and a module never imports another module (`lint/check_layering.py`).
- Declare an artefact once with `artefact(name, always=..., uploaded_for=..., codes=..., archive=...)` in `<name>_artefact.py` next to the step that produces it, with `always=True` only if every document needs it whatever features its project enables.
- An artefact with a store of its own (a table, a Weaviate collection, an Elasticsearch index, files) needs an `ArtefactArchive` and a round-trip case in `test_feature_toggle_eximport.py`, while document data columns, metadata and annotations travel with the generic export.
- The system code trees a project needs before the artefact is produced are `SystemCode` trees in `codes`, declared next to the artefact and never created by code.

## Pipeline Steps

- A step is a `<name>_job.py` with an input DTO that extends `SdocProcessingJobInput`, an enricher that loads that input from the database or filesystem, and the handler under `@pipeline_step(requires, produces, doctypes)` and `@register_job(job_type="<step name>", input_type=..., enricher=...)`, naming the imported artefact objects.
- Step, artefact and feature names are text stored in the database, so renaming one needs a data migration.
- A step has one direct predecessor, so the steps producing its required artefacts must depend on each other (the startup check rejects `NER_SPANS` and `SENTENCE_EMBEDDINGS` together).
- A step applies to every doctype of the step it follows, because a finished step starts the same successors for every doctype (the startup check fails otherwise).
- A step computes only its own artefacts and stores all of them before its handler returns, because its successors read their input through their enrichers, never from memory.
- Never start, list or order steps by hand: `step_execution.start_steps` starts them, the order, planning, health view and export derive from the declarations, and `graph.producer(doctype, artefact)` finds the step of an artefact.
- Only the jobs that create documents or fan out over files (the crawler, `extract_archive`, `doc_chunking`, `extract_html`, `sdoc_init`) start their followers by hand, with `core/doc_processing/entrypoints/follower_utils.py`.

## Features

- A capability is a feature only if it requires an on-demand artefact; declare it once in `<module>_feature.py` with `FEATURE = register_feature("<name>", title=..., description=..., area=FeatureArea.X, requires_artefacts={...}, default_enabled=...)`, requiring artefacts only, never another feature.
- `default_enabled` decides whether a new project created without a feature list and an archive without project details enable the feature.
- An optional `register_feature(set_up=...)` hook `(db, project_id) -> None` must be safe to run twice, is not undone by Disable and never creates system codes.
- Gate the routes of a feature with `require_feature(FEATURE)`, `require_feature_of(FEATURE, Crud.X, "x_id")` or `FeatureService().assert_enabled(...)` as `backend-endpoint.instructions.md` says, and a job with generated endpoints in its `validate_input` hook (`duplicate_finder_job.py`).
- A gate checks only that the feature is enabled, never that its artefacts are computed.

## Jobs

- A job type is text its owner declares in `@register_job`, and a job that code starts or names gets a module-level constant next to its handler (`IMPORT_JOB` in `import_job.py`) that callers import.
- Regenerate the API client (`just update-api`) after adding a feature, an endpoint or a DTO the API uses; the frontend needs a change only for a page or a gate (`frontend.instructions.md`).
