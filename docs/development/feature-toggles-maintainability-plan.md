# Feature toggles: maintainability rework

Status: implemented (phases M1 to M5, 2026-11-12); approved on 2026-11-11 with the recommended option of each decision. Builds on `feature-toggles-plan.md` and on the branch
`agentic/feature-toggles-review-fixes-15b54a`. Nothing of the feature toggle work is released, so
this rework changes the one existing migration instead of adding new ones.

## Goal

| Task                                    | Today                                   | After the rework                                                                                 |
| --------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Add a pipeline step                     | about 15 places (see below)             | a `JobType` value and one step file (plus the project doctor's step copy)                        |
| Add a toggleable feature without a page | 3 places                                | a `Feature` value, one `*_feature.py`, one entry in the frontend feature map (enforced by `tsc`) |
| Add a page to a feature                 | 3 places per route, nothing checks them | `staticData.feature` on the route and one navigation entry                                       |
| Change a display title                  | up to 4 places                          | 1 place                                                                                          |

Everything else is derived from these declarations, and a startup check, the typecheck or a lint
rule fails when something disagrees.

## What a new step touches today

1. `JobType` value (its position sets the step order).
2. ORM column on `SourceDocumentORM` and `SDOC_STATUS_COLUMNS`.
3. Field on `SourceDocumentUpdate` (which also lets the public `PATCH /sdoc/{id}` write step statuses).
4. Alembic migration that adds the column and rebuilds three stored computed columns (rewrites the table).
5. `TRANSITIONS` entry and a transition function per incoming edge in `pipeline_transitions.py`.
6. The step file: input DTO, enricher, `@register_job`, handler.
7. Export and import: status keys validated against `SDOC_STATUS_COLUMNS`, a hard-coded dict of embedding steps in `import_sdocs.py`.
8. Project doctor: `PROCESSING_STEPS`, `NEW_STEPS`, `_EMBEDDING_STEPS`.
9. Tests with hard-coded step lists (4 files).
10. Regenerated API client (`SourceDocumentUpdate.ts`, `JobType.ts`, `openapi.json`).
11. Docs: the pipeline drawing, the plan, the backend instructions.

Only 1 and 6 carry information that cannot be derived.

## Design

### 1. Step statuses in their own table

New table `sourcedocumentstepstatus`, modelled after the existing `sourcedocumentjobstatus` table of the ML
jobs:

| Column    | Type    | Notes                                                   |
| --------- | ------- | ------------------------------------------------------- |
| `sdoc_id` | integer | foreign key to `sourcedocument.id`, `ON DELETE CASCADE` |
| `step`    | string  | the `JobType` value of the step                         |
| `status`  | integer | `SDocStatus`: processing, finished, erroneous           |

- Primary key `(sdoc_id, step)`; index `(step, status)`.
- No row means "not planned". The `NULL` state disappears.
- The 22 step columns, `SDOC_STATUS_COLUMNS` and the three stored computed columns are removed from `sourcedocument`.
- `SourceDocumentUpdate` loses its step fields, so the public PATCH can no longer write statuses.

**One module owns the table.** `crud_sdoc_step_status` (in `core/doc`) is the only code that reads
or writes it:

| Method                                    | Replaces                                  |
| ----------------------------------------- | ----------------------------------------- |
| `plan(sdoc_ids, steps)`                   | setting columns from `NULL` to processing |
| `set_status(sdoc_id, steps, status)`      | `_set_status` in the pipeline             |
| `unplan_pending(project_id, steps)`       | `update_pending_steps_to_not_planned`     |
| `fail_pending(sdoc_id, steps)`            | `update_pending_steps_to_erroneous`       |
| `read(sdoc_id)` / `read_many(sdoc_ids)`   | `getattr(sdoc, step.value)` in 6 files    |
| `count_by_feature_steps(project_id, ...)` | the aggregate in `read_project_features`  |

**The document's overall status is derived, not stored.** `processed_status`, `processed_jobs` and
`total_jobs` become query expressions on `SourceDocumentORM` over the status table (erroneous if
any row is erroneous, else processing if any row is processing, else finished). The filters
`only_finished` and `count_by_project_and_status` use `NOT EXISTS` on the primary key index.

- Acceptance: the health view, the upload progress and `read_by_project(only_finished=True)` are not slower than today on 300,000 documents (measured with the existing timing script).
- Fallback if they are: keep `processed_status` as a plain column written only by `crud_sdoc_step_status`.

**Health view.** Rows are built from `read_many`; sorting by a step joins the status table for that
step. Columns still come from `graph.steps(doctype)`.

**Migration.** The existing revision `448579029394` keeps its id and is rewritten: create the
table, fill it with one `INSERT ... SELECT` that unpivots the old columns (skipping steps a doctype
does not have), drop the old columns. The self-check (no document changes its overall status) and
the downgrade stay.

### 2. One declaration per step

- **Transitions are generic.** A finished step starts its successors with a bare `SdocProcessingJobInput`, and the enricher of the next job loads its input from the database, as recompute and feature activation already do. `TRANSITIONS`, `check_transitions` and the step-to-step functions in `pipeline_transitions.py` are deleted. `ENTRY_POINTS` stays: it creates documents and fans out, which no declaration expresses.
  - Cost: each step reads its input from the database instead of receiving it in memory.
  - Precondition to verify: every step persists its output before it finishes. All 19 step jobs already have an enricher.
- **Export and import** validate status keys against `graph.steps(doctype)`; the embedding steps in `import_sdocs.py` are looked up through the artefact a step produces.
- **Project doctor** reads the statuses from the table rows and has no step copy. The doctor cannot import the pipeline registry on the released image, so one mapping stays in `doctor_stores.py` and `test_project_doctor_steps.py` keeps it equal to the graph.
- **Tests** take step lists from the graph or from two fixtures; no hard-coded lists per doctype.
- **Stale comments** in `job_type_enum.py` and the ORM that name files which do not exist are removed.

### 3. Simpler planning

`_plan_missing_steps` shrinks to set operations and three statements:

```
to_plan = (plan(enabled) - plan(enabled without the feature))   # what the feature adds
          | steps(feature)                                       # its own steps
          | plan(no features)                                    # the core steps
```

1. Insert a processing row for every `(document, step in to_plan)` that has no row (`ON CONFLICT DO NOTHING`).
2. Set the feature's erroneous rows back to processing (and, on Restart, its processing rows of steps that are not core steps).
3. Mark rows whose input row is erroneous as erroneous; return the rows whose inputs are all finished, which can start now.

Behaviour stays as agreed: enabling or completing a feature never computes the missing data of
another feature.

### 4. Frontend: one entry per feature, one title per page

- **Rename and move.** `FeatureEntry` / `FEATURE_ENTRIES` become `NavigationEntry` / `NAVIGATION_ENTRIES` in `core/navigation` (18 of 25 entries have no feature). `core/feature` keeps only the toggle code.
- **The feature of a page is declared once, on the route** (`staticData.feature`).
  - The navigation entry has no `feature` and no `icon` field; consumers read both from the route the entry points to.
  - Loaders call `ensureRouteFeatureEnabled(ctx)`, which reads the feature from the route itself, so the literal is not repeated.
  - The existing lint rule `local/route-options` requires that call in every loader of a route with `staticData.feature`.
- **One feature map.** `FEATURES: Record<Feature, { title, description, area }>` in `core/feature` holds the display text and the area (Search / Analysis / Automatic annotation) of all 14 features. `tsc` fails when a feature is missing.
  - `register_feature` in the backend keeps only `requires_artefacts` and `requires_features`; `GET /feature` returns the requirements.
  - `FEATURE_AREAS` and the backend titles and descriptions are removed.
- **One title per page.** A navigation entry has one `title`. The sidebar, the dashboard card, the command ("Go to …"), the shortcut label and the tab title all use it; `command.title` and `sidebarTooltip` are removed, and static `getTitle` functions read the entry.
  - An entry of a feature page takes its title and description from `FEATURES`.
  - This also fixes the 6 non-feature pages whose titles differ today (for example "Code Frequency Analysis" vs "Code Frequency").

### 5. Layering

- **The job system knows no pipeline.** Step declarations move to a decorator `@pipeline_step(requires, produces, doctypes, further_steps)` in `modules/doc_processing`, next to `@register_job`. `pipeline_graph.py` moves to `modules/doc_processing/pipeline`. The job handler calls lifecycle hooks (started, finished, failed) that document processing registers at bootstrap, instead of importing the pipeline.
- **The feature system is split.**
  - `systems/feature_system` keeps what is generic: declarations, registry, requirement resolution, the `require_feature` dependencies.
  - `modules/project_features` (new) gets what knows projects and documents: `ProjectFeatureService`, the endpoints, `ProjectFeatureRead` and `FeatureActivation` (the job input `FeatureActivationJobInput` lives in `modules/doc_processing/doc_processing_dto.py`). `GET /project/{id}/features` moves to `GET /feature/project/{id}`.
- **New lint rule:** `systems` never imports from `modules`, next to the existing "`core` never imports from `modules`".

### 6. Documentation

- `.github/instructions/backend.instructions.md`: "Add a step" and "Add a feature" as short checklists that match the table at the top.
- `.github/instructions/frontend*.instructions.md`: the route, navigation and feature map rules.
- `feature-toggles-plan.md` and the pipeline drawing are updated to the new model.

## Phases

| Phase | Content                                                                                                                                    | Depends on                      |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| M1    | Status table, `crud_sdoc_step_status`, derived overall status, rewritten migration, health view, export/import, doctor, tests              | review fixes                    |
| M2    | Generic transitions, simpler planning                                                                                                      | M1                              |
| M3    | Layering: `@pipeline_step`, hooks, `modules/project_features`, lint rule                                                                   | M2                              |
| M4    | Frontend: navigation registry, feature map, route-derived gating, titles, lint rule                                                        | review fixes; parallel to M1–M3 |
| M5    | Integrate M3 and M4 (regenerate the API client), docs and instructions, full suite, migration timing, browser check, independent re-review | M3, M4                          |

M1 to M3 touch the same backend files and run one after the other. M4 is frontend only and runs in
parallel; its only contact with the backend is the changed `GET /feature` response and the moved
endpoint, which M5 integrates.

## Acceptance

- A test adds a dummy step with one declaration and gets it planned, run, shown in the health view, exported and imported, without touching any other file.
- `grep` finds no step name outside its step file, `JobType` and the feature files (tests and docs excluded).
- The full backend suite, lint, typecheck and `just alembic check` pass; the migration runs up and down on 300,000 documents in about the time it takes now.
- The browser review scenarios of the final review pass again.

## Results (M5)

| Task                                    | Files it touches now                                                                                                                                  |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add a pipeline step                     | `job_type_enum.py`, the step file, the project doctor's step copy (`doctor_stores.py`); `artefact_enum.py` for a new artefact; the regenerated client |
| Add a toggleable feature without a page | `feature_enum.py`, `<module>_feature.py`, `features.ts`; the gating of its routes and entry points; the regenerated client                            |
| Add a page to a feature                 | the route file (`staticData.feature` and `icon`), one entry in `navigationEntries.ts`; the generated `routeTree.gen.ts`                               |
| Change a display title                  | `features.ts` for a feature page, the navigation entry otherwise                                                                                      |

- The full backend suite (1,668 tests), lint, typecheck, `just alembic check` and the pre-commit hooks pass.
- Migration on 300,000 documents: 13.3 s up, 23.2 s down (M1: 13.6 s and 20.9 s).
- Enabling a feature whose step no document has plans 300,000 rows in 35 s (143 s before planning inserted only the missing rows with one `INSERT ... SELECT` per batch).
- After the re-review fixes (no repeated document locks, one `INSERT ... SELECT` over the project's documents, one statement per step for the other planning writes, no redundant `sdoc_id` index): 24.2 s with all rows missing and 1.2 s with the rows present, against 54.3 s and 0.8 s before these fixes on the same machine; the rest is the insert itself (index upkeep and the per-row foreign key check).
- Planning in the activation job (uhh-lt/dats#886), 300,000 text documents whose `text_es_index` is missing, full-text search enabled, on the same development machine; starting the step jobs is not included: the request takes 8 to 124 ms (24.2 s before). With 10,000 documents per batch the planning takes 24.2 s in 30 batches, the longest batch (the longest lock hold) 1.5 s, the median 0.7 s; 5,000: 26.9 s, longest 1.0 s; 20,000: 23.2 s, longest 2.1 s; one batch of 300,000: 25.6 s. With the rows present: 1.8 s. Uploads planned during the activation took 8 ms in the median and at most about 0.7 s (also with one batch), as they share the project lock with the batches. Before the batches read only their range of the step status table, a batch took 1.3 s at the start and 1.9 s in the middle of an activation (38.8 s in total).
- `grep` finds step names outside their step files, `JobType` and the feature files only in `ENTRY_POINTS` (`EXTRACT_HTML`), the artefact `image_caption` and the archive field `image_embedding`.

## Decisions (the recommended option of each is approved)

1. **Overall status derived by query** (recommended) or kept as a stored column maintained by the status module.
2. **Display text in the frontend feature map** (recommended) or kept in the backend `register_feature`.
3. **Title style:** Title Case as in the navigation today ("Sentence Similarity Search"), also in the Features tab.
4. **Generic transitions through enrichers** (recommended), at the cost of one database read per step start.
5. **Moved endpoint:** `GET /project/{id}/features` becomes `GET /feature/project/{id}`.

## Out of scope

- Merging `sourcedocumentjobstatus` (ML jobs) into the new table.
- Splitting `JobType` into steps and on-demand jobs.
- Gating in the frontend for features that only prepare data (entity annotations, image captions, object detection).
