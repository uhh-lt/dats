# Plan: Per-Project Feature Toggles

Status: agreed plan. Implementation proceeds phase by phase.

## Goal

A project owner chooses at project creation which DATS features the project uses.
DATS then runs only the preprocessing those features need.
A feature that was left out can be activated later, which computes the missing data for all existing documents.

Motivating case: a partner uploads tens of thousands of documents and only uses the LLM Assistant.
Today DATS still computes sentence embeddings, an Elasticsearch index, keywords, word frequencies and named entities for every document.

## Decisions taken

1. **Status storage:** keep the per-step status columns on `sourcedocument`; `NULL` means "not planned for this document".
2. **spaCy step:** split its outputs (tokens/sentences, keywords, word frequencies, named entities) so each can be skipped and activated on its own.
3. **Core data is always computed:** content, tokens/sentences, HTML, language, thumbnails, file metadata, transcription. The Elasticsearch index and image captions are toggleable.
4. **Deactivating a feature** hides it and stops computing its data for new uploads. Stored data is kept.
5. **Document embeddings** become a normal pipeline step. Coreference resolution and quotation attribution stay on-demand actions.
6. **Creation UI** lists user-facing features with presets ("Everything", "Minimal"), not preprocessing steps.

## Current state (what blocks this)

| Problem                                                                                                                                                                           | Where                                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| A step that never runs leaves the document "processing" forever: `processed_status` is finished only if the sum of all status columns equals the fixed step count of the doctype. | `backend/src/core/doc/source_document_orm.py` (`processed_jobs`, `processed_status`, `total_jobs`)        |
| The pipeline is a hand-written successor graph. Steps declare neither inputs nor outputs.                                                                                         | `backend/src/modules/doc_processing/doc_processing_pipeline.py` (`PIPELINE_GRAPH`)                        |
| The step list per doctype is duplicated twice.                                                                                                                                    | `backend/src/common/doc_processing_steps.py` (`PROCESSING_JOBS`), `tools/project_doctor/doctor_stores.py` |
| `text_spacy` writes four unrelated outputs in one transaction. On every run it also deletes all span and sentence annotations of the document, not only the system user's.        | `backend/src/modules/doc_processing/html/spacy_job.py`                                                    |
| Recompute always cascades to all downstream steps.                                                                                                                                | `handle_job_finished` → `execute_pipeline_step`                                                           |
| The project has no settings field.                                                                                                                                                | `backend/src/core/project/project_orm.py`                                                                 |
| No feature concept exists. Backend routers are not gated; the frontend lists features in four hardcoded places.                                                                   | `SideBar.tsx`, `analysis/index.tsx`, `useDefaultCommands.tsx`, `useShortcuts.ts`                          |
| Two status mechanisms exist: step columns for the pipeline, `SourceDocumentJobStatusORM` for ML jobs.                                                                             | `backend/src/modules/ml/source_document_job_status_orm.py`                                                |

Recompute bugs found during the investigation, to fix in phase 1:

- `video_thumbnail` is registered without an enricher, so recompute fails.
- The `audio_transcription` enricher asserts `doctype == audio`, so recompute fails for video.
- The `text_html_mapping` enricher passes the already mapped `html` instead of `raw_html`.

## Model

Three concepts, each declared in code next to what it describes:

- **Artefact:** a named piece of preprocessed data (for example `sentence_embeddings`).
- **Step:** a pipeline job. It declares the artefacts it `requires` and `produces`, and the doctypes it applies to.
- **Feature:** a user-facing capability. It declares the artefacts and other features it requires.

Everything else is derived:

- the pipeline graph, from the steps' `requires`/`produces`;
- the step list per doctype (today `PROCESSING_JOBS`);
- the steps a project needs: the closure of the artefacts required by its enabled features, plus the core artefacts;
- the readiness of a feature: all documents have its artefacts.

### Artefacts

| Artefact                     | Core | Produced by                                            | Stored in                           |
| ---------------------------- | ---- | ------------------------------------------------------ | ----------------------------------- |
| `raw_html`                   | yes  | `extract_html`, `image_caption`, `audio_transcription` | `sourcedocumentdata.raw_html`       |
| `content`                    | yes  | `text_extraction`                                      | `sourcedocumentdata.content`        |
| `language`                   | yes  | `text_language_detection`                              | sdoc metadata                       |
| `tokens_sentences`           | yes  | `text_spacy`                                           | `sourcedocumentdata` offsets        |
| `html`                       | yes  | `text_html_mapping`                                    | `sourcedocumentdata.html`           |
| `thumbnail`, `file_metadata` | yes  | thumbnail and metadata steps                           | filesystem, sdoc metadata           |
| `transcript`                 | yes  | `audio_transcription`                                  | `sourcedocumentdata`                |
| `es_index`                   | no   | `text_es_index`                                        | Elasticsearch                       |
| `sentence_embeddings`        | no   | `text_sentence_embedding`                              | Weaviate `Sentence`                 |
| `image_embeddings`           | no   | `image_embedding`                                      | Weaviate `Image`                    |
| `document_embeddings`        | no   | new step `text_document_embedding`                     | Weaviate `Document`                 |
| `keywords`                   | no   | new step `text_keywords`                               | sdoc metadata                       |
| `word_frequencies`           | no   | new step `text_word_frequency`                         | `wordfrequency`                     |
| `ner_spans`                  | no   | new step `text_ner`                                    | span annotations of the system user |
| `image_caption`              | no   | `image_caption`                                        | sdoc metadata, `raw_html`           |
| `object_bboxes`              | no   | `image_object_detection`                               | bbox annotations of the system user |

Without `image_caption`, an image document has no text and its text chain is not planned.

### Features

| Feature                                                                                                                                                                  | Requires                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| Annotation, LLM Assistant, Classifier, Perspectives, Agreement, Memo generation, Experiments, Whiteboards, Timeline, Code frequency, annotation tables, Document sampler | core only (always available)         |
| Full-text search, Search & auto-annotate                                                                                                                                 | `es_index`                           |
| Sentence similarity search                                                                                                                                               | `sentence_embeddings`                |
| Image similarity search                                                                                                                                                  | `image_embeddings`                   |
| RAG chat, Annotation scaling, Concepts over time                                                                                                                         | feature "Sentence similarity search" |
| Tag recommendation                                                                                                                                                       | `document_embeddings`                |
| Word frequency analysis, Duplicate finder                                                                                                                                | `word_frequencies`                   |
| Keyword statistics and filter                                                                                                                                            | `keywords`                           |
| Automatic entity annotations                                                                                                                                             | `ner_spans`                          |
| Image captions                                                                                                                                                           | `image_caption`                      |
| Automatic object detection                                                                                                                                               | `object_bboxes`                      |

Document search without `es_index` still works with filters only; the text query box is hidden.
Coreference and quotation need core data only and stay on-demand actions in ML Automation.

## Backend design

### Declarations

- `common/artefact_enum.py`: the `Artefact` enum.
- `@register_job` gets `requires`, `produces` and `doctypes` arguments for pipeline steps.
- Each module declares its feature in a `*_feature.py` file, discovered with `import_by_suffix` like `*_job.py`:

```python
register_feature(
    Feature.SENTENCE_SEARCH,
    title="Sentence similarity search",
    description="Find sentences that are similar in meaning.",
    requires_artefacts={Artefact.SENTENCE_EMBEDDINGS},
    requires_features=set(),
)
```

- A `FeatureService` (in `systems/feature_system/`) owns the registry and the planning: required artefacts of a project, steps for a document, readiness per feature.
- A startup check fails on undeclared artefacts, artefacts nobody produces, and cycles.

### Pipeline

- `PIPELINE_GRAPH` and `PROCESSING_JOBS` are replaced by a graph derived from the declarations. The transition functions and the loop/switch entry points (archive, chunking, extracted images) stay.
- **Planning at `sdoc_init`:** the planner computes the steps for this document from its doctype and the project's enabled features, and sets their status columns to `processing` (0). All other columns stay `NULL`.
- **Advancing:** after a step finishes, only successors whose status is pending and whose required artefacts are all finished are enqueued. This replaces the unconditional cascade.
- **spaCy split:** `text_spacy` keeps tokens and sentences. `text_keywords`, `text_word_frequency` and `text_ner` become own steps with own status columns. They share one Ray spaCy call: the `text_spacy` job stays the only job that calls spaCy and takes the set of outputs to write (tokens/sentences, keywords, word frequencies, named entities). At upload it writes every planned output; on activation it runs with only the missing outputs and leaves tokens and sentences untouched. The pipeline hooks set one status column per requested output. Named entities replace only the system user's spans.
- **Document embedding** moves from the ML job into the step `text_document_embedding`. The `SENTENCE_EMBEDDING` and `DOCUMENT_EMBEDDING` ML job types and their rows in `SourceDocumentJobStatusORM` are removed after migrating their status into the new columns.

### Status model

- Status column values: `NULL` = not planned, `0` = processing, `1` = finished, `-100` = erroneous. The server default changes from `0` to `NULL`.
- `processed_status`: erroneous if any column is `-100`; processing if any column is `0`; finished otherwise.
- `processed_jobs` and `total_jobs` count non-null finished and non-null columns.
- New columns: `text_keywords`, `text_word_frequency`, `text_ner`, `text_document_embedding`.

### Project

- `ProjectORM.enabled_features`: array of `Feature` values. `ProjectCreate` and `ProjectUpdate` carry it; `ProjectRead` returns it.
- `GET /project/{id}/features` returns per feature: `enabled`, `ready`, document coverage (ready / total), and missing steps.
- Enabling a feature (`ProjectUpdate`) sets the missing steps from `NULL` to `0` for all existing documents and enqueues the ones whose inputs are ready, on the low-priority queue.
- Disabling a feature only changes `enabled_features`.
- Project creation still creates the Elasticsearch index and all Weaviate tenants; empty ones cost almost nothing.

### Gating

- A FastAPI dependency `require_feature(Feature.X)` on the routers of gated modules returns a 403 with a clear message when the feature is disabled.
- Jobs of gated modules check the feature in their existing `validate_input` hook.
- Gating checks `enabled`, not readiness. A feature that is still activating is usable with partial data; the UI shows the coverage.

### Migrations (live data)

1. Add `project.enabled_features`; set all features for every existing project.
2. Change status defaults to `NULL`; set to `NULL` every column that is not a step of the document's doctype.
3. Add the new step columns. Copy `text_spacy` into `text_keywords`, `text_word_frequency`, `text_ner`. Fill `text_document_embedding` from `SourceDocumentJobStatusORM` (finished → 1, otherwise `NULL`).
4. Recreate the computed `processed_jobs` column with the new expression.

The migration must be validated on a copy of production data before merge.

## Frontend design

- **Feature registry:** one module (`core/feature/`) lists every feature with its `Feature` id, title, icon, route and group. Sidebar, analysis dashboard, quick commands and shortcuts are generated from it instead of four hardcoded lists.
- **Project features query:** `projectQueries.features(projectId)` on `GET /project/{id}/features`, prefetched in the project layout route.
- **`useFeature(feature)`** returns `{ enabled, ready, coverage }` for embedded entry points.
- **Route guard:** gated routes declare their feature in `staticData`; a `beforeLoad` guard redirects to a "feature not enabled" view with an activate button.
- **Embedded entry points to gate:** "Find similar sentences/images" (`SentenceMenu`, `ImageViewer`, `ImageMenu`), keyword statistics and keyword filter (search views, Perspectives map), the text query box of document search, ML Automation buttons, tag recommendations.
- **Project creation dialog:** a feature checklist grouped by area, with presets "Everything" and "Minimal". Selecting a feature selects the features it requires.
- **Project settings:** a new "Features" tab with a toggle, readiness and coverage per feature. Enabling shows the number of documents that will be processed before confirming.
- **Health view:** not-planned steps render as a distinct "not enabled" state. The recompute menu only offers planned steps.

## Phases

Each phase is one PR and leaves DATS fully working.

| Phase                                       | Content                                                                                                                                                    | Behaviour change                           |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 1. Declarative pipeline                     | `requires`/`produces` on steps, derived graph and step lists, conditional advancing, fix the three recompute bugs, narrow the annotation deletion in spaCy | none                                       |
| 2. Status model                             | `NULL` = not planned, new computed columns, migration, health view state                                                                                   | none for existing projects                 |
| 3. Split spaCy, add document embedding step | new steps and columns, remove the two embedding ML jobs, migration                                                                                         | document embeddings are computed at upload |
| 4. Backend features                         | registry, `enabled_features`, planner, features endpoint, activation, gating                                                                               | API accepts features; all on by default    |
| 5a. Frontend registry                       | feature registry; sidebar, analysis dashboard, quick commands and shortcuts generated from it. Independent of phases 1–4.                                  | none                                       |
| 5b. Frontend gating                         | project features query, route guard, `useFeature`, gated entry points. Needs phase 4.                                                                      | hidden entry points for disabled features  |
| 6. Creation and activation UI               | creation dialog, settings tab, health view actions                                                                                                         | the feature is usable end to end           |
| 7. Edges                                    | export/import, project doctor, docs, instructions                                                                                                          | —                                          |

Phase 7 details:

- **Export/import:** export writes `enabled_features` and only the artefacts that exist; import restores them and sets status columns from what the archive contains.
- **Project doctor:** read `NULL` as "not planned"; read the step list from the released backend instead of its own copy; suggest activation instead of recompute for missing data of disabled features.
- **Instructions:** add the feature declaration rules to `.github/instructions/` (backend module, frontend feature).

## Testing

- Unit tests for the planner: features → artefacts → steps per doctype, including feature-to-feature requirements.
- Pipeline tests: a "Minimal" project runs only core steps and its documents reach `finished`; an "Everything" project matches today's step set.
- Activation test: enable a feature on a project with documents; only the missing steps run; coverage reaches 100 %.
- Gating tests: disabled feature → 403 on its endpoints and job start.
- Migration test on a production copy: no document changes its `processed_status`.

## Out of scope

- Whether instance-level availability (for example no LLM provider configured) should use the same registry later. The declaration format leaves room for a `requires_services` field; it is out of scope here.
- Whether disabled features' stored data should get an explicit "delete data" action later.
