# Plan: Per-Project Feature Toggles

Status: implemented. All phases are implemented, each on its own branch: the backend (phases 1 to 4), the frontend registry and gating (5a, 5b), the creation and activation UI (6) and the edges (7), including the user guide (`docs/feature-guides/project-features.md`). Open: running the full test suite and validating the migrations on a production copy. Where the implementation deviates from the plan, the sections below describe the implementation.

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

| Feature                                                                                                                                                                  | Requires                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| Annotation, LLM Assistant, Classifier, Perspectives, Agreement, Memo generation, Experiments, Whiteboards, Timeline, Code frequency, annotation tables, Document sampler | core only (always available, not registered) |
| Full-text search, Search & auto-annotate                                                                                                                                 | `es_index`                                   |
| Sentence similarity search                                                                                                                                               | `sentence_embeddings`                        |
| Image similarity search                                                                                                                                                  | `image_embeddings`                           |
| RAG chat, Annotation scaling, Concepts over time                                                                                                                         | feature "Sentence similarity search"         |
| Tag recommendation                                                                                                                                                       | `document_embeddings`                        |
| Word frequency analysis, Duplicate finder                                                                                                                                | `word_frequencies`                           |
| Keyword statistics and filter                                                                                                                                            | `keywords`                                   |
| Automatic entity annotations                                                                                                                                             | `ner_spans`                                  |
| Image captions                                                                                                                                                           | `image_caption`                              |
| Automatic object detection                                                                                                                                               | `object_bboxes`                              |

Only the toggleable features are `Feature` values with a `register_feature` declaration; the features that need core data only are always available and are neither declared nor stored in `enabled_features`.
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
- **Advancing:** after a step finishes, the jobs of its planned successors (status not `NULL`) are enqueued, with only their planned steps; steps that are not planned are never started. Only the steps a run computed start their successors (recomputing the named entities does not start the steps after tokens and sentences), but a recompute of a step still recomputes the planned steps after it.
- **spaCy split:** `text_spacy` keeps tokens and sentences. `text_keywords`, `text_word_frequency` and `text_ner` become own steps with own status columns. They share one Ray spaCy call: the `text_spacy` job stays the only job that calls spaCy and declares the three as `further_steps` in `@register_job` (step → produced artefacts, with the job's `requires` and `doctypes`). The job input (`SdocProcessingJobInput.steps`) names the steps to compute: at upload every planned one; on activation only the missing ones, leaving tokens and sentences untouched. The pipeline hooks set one status column per computed step. Named entities replace only the system user's spans.
- **Document embedding** moves from the ML job into the step `text_document_embedding`. The `SENTENCE_EMBEDDING` and `DOCUMENT_EMBEDDING` ML job types and their rows in `SourceDocumentJobStatusORM` are removed after migrating their status into the new columns.

### Status model

- Status column values: `NULL` = not planned, `0` = processing, `1` = finished, `-100` = erroneous. The server default changes from `0` to `NULL`.
- `processed_status`: erroneous if any column is `-100`; processing if any column is `0`; finished otherwise.
- `processed_jobs` and `total_jobs` count non-null finished and non-null columns.
- `processed_status`, `processed_jobs` and `total_jobs` are stored computed columns (`Computed(..., persisted=True)`); `processed_status` and `processed_jobs` are indexed, so filters on them stay cheap.
- New columns: `text_keywords`, `text_word_frequency`, `text_ner`, `text_document_embedding`.

### Project

- `ProjectORM.enabled_features`: array of `Feature` values. `ProjectCreate` and `ProjectUpdate` carry it; `ProjectRead` returns it.
- `GET /project/{id}/features` returns per feature its `status` (disabled, computing, partly available, fully available), `enabled`, `ready`, the documents it applies to counted once each by the status of its steps (ready, processing, failed, not planned; one aggregate query) and the missing steps. Computing: a step is processing for some document; partly available: some documents lack the data and nothing runs for them.
- `PUT /feature/project/{id}/{feature}` with `ProcessingSettings` enables a feature, or completes an enabled one; it is the only way to enable a feature (`FeatureService.activate_feature`). It enables the feature and the features it requires, then plans, in bulk per doctype, the steps of the project's enabled plan except those that were planned without the feature and only other features need: the steps of these features, the core steps and the steps the feature makes possible (enabling image captions plans the text steps of the other enabled features for images). Of these, steps that are not planned (`NULL`) and the erroneous steps of the features are set to processing. A newly planned step whose input step is erroneous is set to erroneous instead. The change locks the project row, so two concurrent changes do not lose a feature, and an upload holds a share lock on it while it plans a new document's steps. After the commit, one `FEATURE_ACTIVATION` job on the low-priority queue starts the planned steps whose inputs are finished with the chosen settings, enriched like a recompute; the others start through the normal advancing. A document whose step job cannot start (its input data is missing) gets these steps and the pending steps after them set to erroneous; the other documents still start.
- `POST /feature/project/{id}/{feature}/restart` with `ProcessingSettings` restarts an enabled feature: it plans its processing steps again like Complete plans the missing ones, and starts those whose inputs are finished. It is for steps left processing without a job (a crashed worker, documents stuck before the migration); a step whose job still runs computes twice.
- Enabling and disabling emit `PROJECT_UPDATED`, so the other members' navigation follows the enabled features.
- `DELETE /feature/project/{id}/{feature}` disables a feature in every enabled state (computing, partly and fully available); it is rejected while an enabled feature requires it. It changes `enabled_features` and sets the steps that are still processing and that the remaining features do not plan to not planned (`NULL`); finished and erroneous steps keep their status. A step job still in the queue for a step that is not planned anymore is skipped and a starting job drops it from its run (`handle_job_started`); a job that already runs sets it finished, or leaves it not planned if it fails, so a disabled feature leaves no document processing and plans nothing again. `ProjectUpdate` no longer carries `enabled_features`.
- A failed step sets its pending successors to erroneous, so no step stays processing behind a failed input; recomputing the input starts them again.
- Project creation still creates the Elasticsearch index and all Weaviate tenants; empty ones cost almost nothing.

### Gating

- A FastAPI dependency `require_feature(Feature.X)` on the routers of gated modules returns a 403 with a clear message when the feature is disabled.
- Jobs of gated modules check the feature in their existing `validate_input` hook.
- Gating checks `enabled`, not readiness. A feature that is still activating is usable with partial data; the UI shows the coverage.

### Migrations (live data)

Two migrations: `448579029394_sdoc_step_status_per_feature` (steps 1 to 3) and `f0bfbe883d73_add_project_enabled_features` (step 4). The first passes over `sourcedocument` as few times as it can: the catalog-only changes run as one `ALTER TABLE`, all status columns are set in one `UPDATE` with a `CASE` per column, and the three computed columns are added in one `ALTER TABLE` (one rewrite). It checks that no document changes its `processed_status` and is reversible.

1. Change status defaults to `NULL`; set to `NULL` every column that is not a step of the document's doctype.
2. Add the new step columns. Copy `text_spacy` into `text_keywords`, `text_word_frequency`, `text_ner`. Fill `text_document_embedding` from `SourceDocumentJobStatusORM` (finished → 1, otherwise `NULL`).
3. Recreate the stored computed columns `processed_jobs`, `total_jobs` and `processed_status` with the new expressions.
4. Add `project.enabled_features`; set all features for every existing project.

The migration must be validated on a copy of production data before merge.

## Frontend design

- **Feature registry:** one module (`core/feature/`) lists every feature with its `Feature` id, title, icon, route and group. Sidebar, analysis dashboard, quick commands and shortcuts are generated from it instead of four hardcoded lists.
- **Project features query:** `projectQueries.features(projectId)` on `GET /project/{id}/features`, prefetched in the project layout route.
- **`useFeature(feature)`** returns `{ enabled, ready, coverage }` for embedded entry points.
- **Route guard:** gated routes declare their feature in `staticData`; the project layout renders a guard (`FeatureGuard`) that shows a "feature not enabled" view instead of the route, whose button opens the Features tab of the project settings. The guard reads `ProjectRead.enabled_features`; the feature statuses load lazily where they are shown.
- **Embedded entry points to gate:** "Find similar sentences/images" (`SentenceMenu`, `ImageViewer`, `ImageMenu`), keyword statistics and keyword filter (search views, Perspectives map), the text query box of document search, ML Automation buttons, tag recommendations.
- **Project creation dialog:** a feature checklist from `GET /feature` grouped by area (`core/feature/featureAreas.ts`), with presets "Everything" (default) and "Minimal". Selecting a feature selects the features it requires; deselecting one deselects the features that need it.
- **Project settings:** a "Features" tab lists every feature with its status, progress and its actions: Enable (disabled), Restart and Disable (computing), Disable (fully available), Complete and Disable (partly available). Restart asks for a confirmation that says it may repeat work that is still running. Disable asks for a confirmation and is not possible while an enabled feature needs it. Enable and Complete open a dialog with the number of documents to process and the processing settings (`ProcessingSettingsButton`). A feature with failed documents links to the document health view (a plain link: the health view takes only the doctype and sorting from the URL, and the feature state does not say which doctype failed); recomputing the failed steps there makes the feature fully available. The project features query polls while a feature is computing, wherever it is used, and is refreshed by job updates. The "not enabled" view and the coverage hint open the project settings on this tab (`projectSettings` dialog data `{ tab: "features" }`).
- **Health view:** not-planned steps render as a distinct "not enabled" state. The recompute menu only offers steps planned for at least one selected document.

## Phases

Each phase is one PR and leaves DATS fully working.

| Phase                                       | Content                                                                                                                                                    | Behaviour change                           | State       |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ----------- |
| 1. Declarative pipeline                     | `requires`/`produces` on steps, derived graph and step lists, conditional advancing, fix the three recompute bugs, narrow the annotation deletion in spaCy | none                                       | implemented |
| 2. Status model                             | `NULL` = not planned, new computed columns, migration, health view state                                                                                   | none for existing projects                 | implemented |
| 3. Split spaCy, add document embedding step | new steps and columns, remove the two embedding ML jobs, migration                                                                                         | document embeddings are computed at upload | implemented |
| 4. Backend features                         | registry, `enabled_features`, planner, features endpoint, activation, gating                                                                               | API accepts features; all on by default    | implemented |
| 5a. Frontend registry                       | feature registry; sidebar, analysis dashboard, quick commands and shortcuts generated from it. Independent of phases 1–4.                                  | none                                       | implemented |
| 5b. Frontend gating                         | project features query, route guard, `useFeature`, gated entry points. Needs phase 4.                                                                      | hidden entry points for disabled features  | implemented |
| 6. Creation and activation UI               | creation dialog, settings tab, health view actions, enable-or-complete endpoint with processing settings, feature status                                   | the feature is usable end to end           | implemented |
| 7. Edges                                    | export/import, project doctor, docs, instructions                                                                                                          | —                                          | implemented |
| Final review                                | Disable in every enabled state (computing, partly and fully available); disabling a computing feature unplans its processing steps                         | Disable no longer needs full availability  | implemented |

The feature, project, document processing, unit and export/import tests ran on the phase 6 branch (the three export/import tests that need the registered jobs fail when run on their own; the verify branch fixes this). The full test suite and the validation of the migrations on a production copy are still required before merge.

Phase 7 details:

- **Export/import:** the project archive carries `enabled_features` (`project_<id>_details.json`); the import rejects features this version does not know. A project is always imported into an existing project, and the import only adds features: the project enables the union of its features and the archive's (with the features they require), never fewer. The document archive holds the status of every step of the doctype (`step_status`, `null` = not planned) and only the artefacts whose step finished. The import sets the status columns from the archive; a step that was processing is not planned (the import starts no job), an embedding step whose embeddings the archive lacks (or not one per sentence) is not planned, and empty embeddings or index entries of unfinished steps are not written. The import restores only what the archive holds and plans no steps: a feature whose data is missing is partly available until a user completes it in the Features tab. Archives without these fields import as before: all features are enabled, every step of the doctype set from the document status.
- **Project doctor:** reads `NULL` as "not planned" and checks no data of such steps; it prints the skipped steps per project and says that their feature is not enabled. It knows the new steps, checks the document embeddings, and reads only the step columns the database has, so it works before and after the migrations. The step list stays a copy in `doctor_stores.py`: the doctor runs with the backend code out of reach (`PYTHONPATH` empty) and on releases without the pipeline graph, so it cannot read the list from the backend. `backend/test/unit/test_project_doctor_steps.py` keeps the copy in sync.
- **Instructions:** the rules for pipeline steps, features and gating are in `backend.instructions.md` and `backend-endpoint.instructions.md`, the frontend feature rules in `frontend.instructions.md` and `frontend-route.instructions.md`.

## Testing

- Unit tests for the planner: features → artefacts → steps per doctype, including feature-to-feature requirements.
- Pipeline tests: a "Minimal" project runs only core steps and its documents reach `finished`; an "Everything" project matches today's step set.
- Activation test: enable a feature on a project with documents; only the missing steps run; coverage reaches 100 %.
- Gating tests: disabled feature → 403 on its endpoints and job start.
- Migration test on a production copy: no document changes its `processed_status`.

## Out of scope

- Whether instance-level availability (for example no LLM provider configured) should use the same registry later. The declaration format leaves room for a `requires_services` field; it is out of scope here.
- Whether disabled features' stored data should get an explicit "delete data" action later.
