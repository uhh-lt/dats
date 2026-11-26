# Review: project endpoints (#927 / #928), stack top `e0f9d5d64` (PR #955)

Reviewed 2026-11-26 against `origin/main` (`git diff origin/main...HEAD`, 721 files). Read-only: nothing was run (no tests, no stack, no typecheck); every statement below comes from reading code, the issues and the PR descriptions. Paths are relative to the repository root.

## Summary

1. No blocker. No route, service, job or CRUD read was found that returns or changes data of another project, and no route lost an authorization check it had on `main`.
2. The redesign reached its goals: 248 of 269 operations live under `/projects/{project_id}`, one dependency replaces about 260 hand-written checks, and Postgres rejects cross-project references.
3. The main open risk is new and structural: `id` is no longer unique in the database, but all relationships and many hand-written joins match on `id` alone. Today only the sequences keep that safe.
4. Second: the generic tests are weaker than the "Done when" assumes (no positive control, no allowlist for routes outside projects, body/filter tests missing in about 12 modules).
5. Verdict: mergeable after the 7 "should fix" items; the 12 migrations should be squashed or at least run once on a production copy first (still open from #927).

Counts: **0 blocker, 7 should fix before merge, 19 can wait.**

## Findings

### Blocker

None.

### Should fix before merge

**S1. `id` is no longer unique in the database, but the code relies on it.**

- Where: every key swap revision drops `PRIMARY KEY (id)` and keeps only the non-unique `ix_<table>_id`; `backend/src/migrations/alembic/versions/3e2b9d731621_span_groups_and_annotation_documents_.py:32-35` even turns the unique `ix_annotationdocument_id` into a non-unique index. ORM side e.g. `backend/src/core/code/code_orm.py:29` (`index=True`, no `unique`).
- What relies on it: all relationships over composite foreign keys join on the id pair only (`foreign_keys=[x_id]`, e.g. `backend/src/core/annotation/span_annotation_orm.py:66-80`); hand-written joins on bare ids (`span_annotation_crud.py:82` `read_by_project`, `core/search/*_anno_search.py`, the recursive CTE in `backend/src/systems/search_system/filtering.py:49-58`, code frequency, annoscaling, classifier, perspectives); Elasticsearch and Weaviate ids; file folders.
- Why it matters: the tenant guarantee of the composite keys holds only while ids are globally unique. An explicit-id insert (restore, manual repair, a future import that keeps ids, per-project numbering of #929) can duplicate an id across projects without an error, and then these joins return rows of another project. The issue calls isolation "structural"; this part is convention.
- Fix: make `ix_<table>_id` unique on the swapped tables (one cheap index each, built in the same migration), or record the decision in an ADR and name it as the precondition of #929.
- Confidence: high on the schema fact and the join conditions (read in ORMs and migrations, confirmed independently by two reviewers); no reachable leak exists through today's API.

**S2. Many-to-one lazy loads became one SELECT per row.**

- Where: the 38 many-to-one relationships over composite keys, e.g. `backend/src/core/metadata/source_document_metadata_orm.py:45-48`, `backend/src/core/annotation/span_annotation_orm.py:67-80`, `backend/src/core/code/code_orm.py:89`, `core/memo/memo_orm.py:44`, all `ObjectHandleORM` targets.
- What is wrong: the join covers `id` only while the target key is `(project_id, id)`, so SQLAlchemy cannot answer the lazy load from the identity map (`use_get=False`; two reviewers confirmed it with mapper introspection on SQLAlchemy 2.0). On `main` the same access cost no query when the target was already loaded.
- Concrete case: `PATCH /projects/{p}/source-document-metadata/bulk` with N values calls `_assert_writable` (`backend/src/core/metadata/source_document_metadata_service.py:136-145`), which reads `m.project_metadata` per row; the metadata CRUD has no `_load_options`. N extra queries where `main` needed one per distinct key. The same pattern hits `update_multi_with_doctype` in document processing, `CRUDCode.update_multi` (`code.parent`) and every export loop over `anno.code` / `adoc.source_document` / `memo.attached_to`.
- Fix: eager-load in the affected CRUD reads (`_load_options`) or batch-read the targets; alternatively a view-only relationship whose join includes `project_id`.
- Confidence: high on the mechanism, medium on the real cost (nothing measured).

**S3. The generic 404 test has no positive control.**

- Where: `backend/test/endpoints/project_router/test_project_router.py:245-279` (`test_path_id_of_another_project_is_not_found`).
- What is wrong: it asserts 404 with one foreign id and never that the same request with own ids is not 404. A route that answers 404 for another reason passes vacuously.
- Verified cases: `DELETE /members/{user_id}` uses a virtual user, which is never a member, so the own id answers 404 too; `GET /perspectives/aspects/{aspect_id}/source-documents/{sdoc_id}` reads `crud_document_aspect.read(id=(sdoc_id, aspect_id))` by a bare key (`backend/src/modules/perspectives/perspectives_endpoint.py:164-165`), the 404 for a foreign `sdoc_id` comes from the missing row, not from a project read; job routes are stored with a bare `JobInputBase`.
- Fix: in the same loop, call each route with all-own ids first and require a status other than 404 (and 403).
- Confidence: high.

**S4. No test pins the routes outside `/projects/{project_id}`.**

- Where: `backend/test/endpoints/project_router/` and `backend/test/endpoints/feature/test_feature_gating.py` are the only tests that enumerate routes; both filter on the project prefix.
- What is wrong: a new route that serves project data under another prefix (`/users/me/...`, `/foo/{project_id}`) escapes all three generic tests. The 21 operations outside projects today are a short fixed list (`/authentication/*`, `/users/me*`, `PUT /projects`, `GET /features`, `/info*`, `/heartbeat`, `/`).
- Fix: one test with that allowlist. This is the test that answers "would a new unscoped route be caught".
- Confidence: high.

**S5. The body-id (409) and filter-id tests the issue requires are missing in about 12 modules.**

- Issue #928: "each group's tests cover a foreign id in one body field (409) and one query filter (no match)".
- No cross-project test although the routes take ids: `source_document_metadata` (`PATCH /bulk`, `GET /date-count?date_metadata_id`), `doc_processing` (`/retry`, `/recompute`), `keyword_statistics`, `rag`, `search_view` (`PATCH /order`), `simsearch`, `search_annotate`, `search` (only one span search in the generic file).
- Path id only: `classifier` (`/dataset-statistics`), `cota` (`/annotate`, `/remove`, `date_metadata_id`), `perspectives` (`PUT /aspects` with a foreign `tag_id`), `timeline_analysis` (`settings.date_metadata_id`), `project_metadata` (`PATCH /bulk`).
- Why it matters: these are exactly the ids that no composite key protects when they end up in a hand-written query or a JSON column; the code is correct today (checked by reading), but nothing keeps it so. `.github/instructions/backend-tests.instructions.md` does not state the rule either.
- Confidence: medium-high (found by test names and fixtures; a test with an unusual name may have been missed).

**S6. Dead CRUD methods without a project filter.**

- Where: `backend/src/core/annotation/span_annotation_crud.py:175` (`read_by_users_and_sdoc`), `:244` (`read_by_codes`); `CRUDSentenceAnnotation.read_by_code_ids`; `CRUDBBoxAnnotation.read_by_users_and_sdoc` (`bbox_annotation_crud.py:117`); `CRUDProject.exists_by_title`; `CRUDSpanText.read_by_text`. No caller in `backend/src` or `backend/test` (grep).
- Why it matters: they are the methods a later caller picks up and bypasses the tenant rule with; the stack's own rule is no dead code. Delete them. `read_by_user_and_sdoc` (`:154`) is unscoped with one caller (`core/prompt/prompt_service.py:603`), safe there; give it `project_id`.
- Confidence: high.

**S7. Instructions that contradict the new rules.**

- `.github/instructions/backend-dto.instructions.md:67`: "Create: ... adds required foreign keys (`project_id`, ...)" against "create DTOs carry no `project_id`" (`backend-endpoint.instructions.md:73`, `backend-crud.instructions.md:122`). An agent following the DTO file re-adds the field.
- `.github/instructions/backend-endpoint.instructions.md:9` ("each file owns exactly one `APIRouter`", against the two-router pattern at line 72) and `:45` (`@router.post("/start_job")` against kebab-case and `/jobs/<job-type>`).
- `backend/src/core/prompt/README.md:20` (`GET /prompt/task_info`) and `backend/src/modules/perspectives/README.md:116` (`/cluster_similarities/{aspect_id}`) name old routes.
- Confidence: high.

### Decide before merge (migrations)

Not defects, but only possible before the first merge:

**M1. Squash the 12 revisions into one.** `e9c943a5f56d` builds `UNIQUE (project_id, id)` on every table and validates all composite foreign keys; the key swap revisions build the same index again as the primary key; `55d36767e8ab:97-199` drops the unique constraints and drops and recreates all 54 foreign keys, validating each a second time. Ten `ix_<table>_project_id` indexes are created and dropped again. One revision (drop old foreign keys, swap keys, create foreign keys once on the primary keys) halves index builds and validations on `spanannotation`, `sentenceannotation`, `objecthandle`, `sourcedocumentmetadata` and removes the special downgrade of `55d36767e8ab:368-376`. Confidence high. #941 measured 19 s on synthetic rows, so this is about simplicity and lock time, not feasibility.

**M2. The run on a copy of the production data is still open** (#927 "Done when"; #941 says so). The pre-flight of 2026-11-25 reported 0 cross-project rows on all 28 reference pairs and no user or memo handles, and I checked that its 28 queries cover every pair that can disagree. The migration has no repair step and fails loudly, so re-run the pre-flight directly before the deployment: rows written since then are not covered. After the upgrade run `ANALYZE` (full-table updates of six tables, nothing in the chain does it).

### Can wait

Tenant isolation, hardening (no leak today):

1. Hand-written queries without an explicit `project_id` filter, scoped only through ids read in the project before: `modules/keyword_statistics/keyword_statistics_service.py:28-48`, `modules/classifier/models/doc_class_model_service.py:549`, `sent_class_model_service.py:641-651`, `span_class_model_service.py:446-455`, `systems/search_system/filtering.py:49-58`. The issue says these "must filter by `project_id`". High confidence.
2. `modules/perspectives/document_aspect_crud.py` and `document_cluster_crud.py`: every method is keyed on `aspect_id` / `cluster_id` only, including the bulk writes `set_labels`, `merge_clusters`. All callers check the aspect or cluster in the project first; one forgotten check would write across projects. High confidence.
3. `systems/search_system/search_builder.py:175-177` reads `ProjectMetadataORM` by the bare id of a filter column; a foreign id only selects the value column, an unknown id answers 500.
4. Pre-existing: `resolve_ids` for `USER_ID_LIST` returns the email of any user id (`core/search/sdoc_search/sdoc_search_columns.py:225` and the four sibling column files, `word_frequency_columns.py:273`), reachable through a timeline analysis filter and its export. Violates "user ids need code checks". Medium-high confidence (chain read, not requested).
5. Pre-existing: `POST /projects/{id}/jobs/import` with `USERS` links any registered user by email (`modules/eximport/user/import_users.py:100-117`); `PUT /members` does the same by design.

Tests and enforcement: 6. Route discovery uses `original_route.path` (`test_project_router.py:197-201`, `test_feature_gating.py:24-27`), which lacks prefixes added by `include_router(prefix=...)`. No router is mounted that way today (`bootstrap.py:325`), so it is a trap, not a gap. 7. No lint or test requires `ProjectCRUDBase` for a table with `(project_id, id)`, `project_router` for a project route, or a project filter in hand-written queries (`backend/lint/check_crud.py:316-319` only tolerates the base; `check_endpoints.py` is not in `just lint`). The only guard is the assert in `project_crud_base.py:33`. 8. `test_feature_gating.py` derives the feature from the endpoint module, so the generated job start routes of feature jobs are not covered generically (their `validate_input` hooks are tested per module). 9. Migration tests assert the schema at head and row counts; they would not catch a wrong backfill parent, the `deferrable` flag, the sequence defaults or S1.

API and code: 10. `GET /rag/chat-session` is now behind the RAG feature (router-wide `feature=`, `modules/rag/rag_endpoint.py:11`); on `main` only `rag_session` was. No frontend caller. Unlisted behaviour change. 11. Job start routes still require `project_id` in the body and overwrite it (`systems/job_system/job_endpoint.py:47`); a mismatching value is accepted silently. Follows the rule, surprising for clients. 12. Status codes that should not be 500: `start_perspectives_job` raises a bare `Exception` when a job runs; COTA `/annotate` and `/remove` with an unknown sentence (`KeyError`); `doc_processing_service.py:299-302` with empty `sdoc_ids` (`IndexError`). 13. Pre-existing, unchanged: `only_if_finished` inverted (`core/doc/source_document_endpoint.py:64-110`); project-wide `MEMO_UPDATED` events carry the sender's `is_favorite` (`core/memo/memo_endpoint.py:117-177`); `CodeCreate.is_system` is client-settable; `tools/importer/import_bundestags_docs.py:315` calls the missing `api.upload_file_batch`.

Frontend: 14. 47 hooks take the project from redux (`state.project.projectId`, e.g. `frontend/src/core/source-document/api/sdocHooks.ts:11`), which follows the route by one render (`frontend/src/routes/_auth.tsx:118-122`) and is persisted. On reload, deep link or project switch, queries fire once as `/projects/<old>/...` with ids of the new project, answer 403/404 and are refetched. New with the stack (the URL had no project before); invisible to the user. Take the id from the route instead. Medium confidence (traced, not observed). 15. `sdocQueries.byId(projectId!, sdocId!)` (`sdocHooks.ts:59,64`): new non-null assertions; siblings use `skipToken`. 16. `projectId: -1` initial state passes the `!projectId` guards (`classifierSlice.ts:56`, `llmAssistantSlice.ts:43`); not reachable today. 17. 409 is mapped to "name already taken" (`tagHooks.ts:50`, `codeHooks.ts:66`, `projectMetadataHooks.ts:42,65`), but a foreign body id now answers 409 too. Only with a crafted request. 18. Orphaned generated models `PublicUserRead`, `Body_tag_update_tags_batch` (still schemas in the spec, so the backend DTOs are the leftovers).

Docs: 19. `specs/features/feature-toggling-and-artefact-system/*.md` still describe `require_feature` and `/feature/project/{id}` (historical plans).

## Checked and correct

- **Authorization**: all 248 project operations sit on `project_router`; the 21 others belong to no project. `assert_can_annotate_as` is on every annotation create (single and bulk); virtual user routes read through `read_virtual_user(project_id, id)`; search views keep `assert_is_same_user`; LLM assistant and classifier keep their virtual user checks; all eight feature routers pass `feature=`; duplicate finder and tag recommendation keep `assert_enabled` in `validate_input`, retry falls back to it. Member add/remove and project delete are any-member, as on `main`.
- **Body ids**: every `*_id` column of the converted tables has a composite foreign key with `project_id`; ids without one (JSON columns, recompute `sdoc_ids`, prompt selections, whiteboard content, perspectives job `cluster_id`s) are read within the project in code. Three of these were unchecked on `main`.
- **Jobs**: the generated routes overwrite `project_id` before `validate_input`; `read_project_job` compares project and type (`systems/job_system/job_service.py:279-286`); handlers use `payload.project_id`.
- **Stores**: Weaviate uses one tenant per project, Elasticsearch one index per project; no id value changes, no reindex needed.
- **Content files**: `/authentication/content` is unchanged, denies by default and rejects dot segments (`core/auth/auth_endpoint.py:292-305`).
- **Websocket**: emits take the project of the path; the frontend sync writes caches with `event.payload.project_id` and the same key factories as the hooks.
- **Route order**: `/bulk`, `/count`, `/by-filename`, `/by-sentence`, `/recent`, `/order`, `/info`, `/versions/{id}`, `/default`, `/task-info` precede `/{id}` in every file.
- **Migrations**: linear chain from `807bab97f373`; backfill parents correct for all 19 tables; all `ON DELETE` rules preserved, the seven `SET NULL` keys null only their column; `experimentrun_virtual_user_id_fkey` untouched and still deferrable; sequences and `ix_<table>_id` survive the key swap; downgrades complete (only `objecthandle.user_id` / `memo_id` come back empty).
- **Relationships never write `project_id`** (generic test `backend/test/crud/test_composite_keys.py:71`).
- **Generated client**: regenerating from `openapi.json` is byte-identical; the spec equals the app's; no hand-built API URLs besides OIDC, session sync, websocket and `/content/`.
- **Tools and MCP**: every HTTP call of `tools/importer` and `tools/sentence_sampling` matches the spec; MCP tools are generated from the tagged routes, no name collisions, 123 → 116 tools, all removals intended; `docs/development/mcp-server.md` is current.
- **Leftovers**: none of the removed functions exists (`grep` over `backend/src`, `backend/test`); `assert_in_project` only in `project_router.py:35` and the content check, `assert_enabled` only in `project_router.py:37` and two job hooks.

## Goal assessment

### "Done when" of #928

| Point                                                                                                                   | Result                                                   | Evidence                                                                                                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Every operation follows the conventions                                                                                 | **Partly**                                               | 248/269 under the project, kebab-case plural, project from the path only, no request DTO with `project_id` besides job inputs. Deviations listed under "Consistency".                                                                                     |
| The generic foreign-id test passes                                                                                      | **Reached, with a caveat**                               | #955 reports it passing (not re-run). It covers every path id, but vacuously for some routes (S3), and the per-group body and filter tests are incomplete (S5).                                                                                           |
| No route checks its project by hand; none of the removed functions exists                                               | **Reached**                                              | grep: no `assert_in_same_project_as`, `validate_objects_in_same_project`, `require_feature(_of)`, `assert_documents_in_project`, ORM `get_project_id`. `Job.get_project_id()` (`job_dto.py:99`) is the job accessor.                                      |
| Every project-owned table has the key `(project_id, id)` and a CRUD on `ProjectCRUDBase`; every call passes the project | **Reached for the base methods, partly for custom ones** | 27 CRUDs on `ProjectCRUDBase`, asserted in `project_crud_base.py:33` and by the migration test. Custom CRUD methods and the two perspectives CRUDs still take bare ids (S6, can-wait 2). The three tables keyed without `id` keep their keys, as decided. |
| All listed API callers work against the new API                                                                         | **Reached by reading**                                   | Importer, sentence sampling and MCP match the spec. Not executed here; #955 ran the importer on a sample.                                                                                                                                                 |

### Goals of the issue

- **Every route finds its project by hand → one place**: reached. `project_router` is 40 lines, one dependency.
- **Filters written as hierarchy → query parameters**: mostly reached (`GET /span-annotations?sdoc_id=&user_id=`). Left as paths: `/source-documents/by-filename`, `/sentence-annotations/by-sentence`, `/folders/{id}/source-documents`, `/tags/{id}/source-documents`, `/source-documents/{id}/same-folder`.
- **Inconsistent names**: reached for paths; not for OpenAPI tags and some parameter names (below).
- **Isolation becomes structural**: reached for references (composite foreign keys) and for reads by key (`ProjectCRUDBase`). Not structural: hand-written queries (the issue says so) and the uniqueness of `id` (S1, the issue does not say so).
- **404 instead of 403 for another project's id**: reached.

### #927

Reached except the run on a production copy (M2).

### Consistency

Naming:

- Prefixes mix resource plurals (`/classifiers`, `/whiteboards`, `/word-frequencies`, `/tag-recommendations`) with singular function namespaces (`/code-frequency`, `/agreement`, `/statistics`, `/simsearch`, `/rag`, `/llm-assistant`, `/search-annotate`, `/document-sampler`, `/doc-processing`). Defensible as "resource vs. computation", but `/code-frequency` next to `/word-frequencies` is not.
- `/rag/session` and `/rag/chat-session` are singular; `/authentication/refresh_access` is the last snake_case path.
- OpenAPI tags: `timelineAnalysis`, `searchView`, `sdocMetadata` next to `code_frequency`, `llm_assistant`, `api-key`, `docprocessing`, `TagRecommendation`. They name the generated services.
- Parameter typos in the public API: `reviewd_recommendation_ids`, `cota_upate`, `reject_cide_id`.

Shapes:

- Nesting: "a single resource directly under the project" is broken by `/perspectives/aspects/{id}`, `/perspectives/clusters/{id}`, `/experiments/runs/{id}`, `/prompts/versions/{id}`.
- Delete returns `SpanAnnotationDeleted` for spans and the full read DTO everywhere else.
- Bulk coverage differs: bbox annotations lack `PUT /bulk` and `/count`; bulk delete exists for annotations, memos and documents only. `PATCH /tags/bulk/source-documents/set` is a verb in a path.
- Count is `POST /span-annotations/count`, `POST /tags/count`, but `GET /source-documents/count`.
- `user_id` is a required query parameter on annotation lists, optional on `GET /memos`, and a query parameter (not body) on annotation creates.
- Analysis POSTs mix scalar query parameters with id lists in the body; agreement takes one body object.

Verbs and jobs:

- Actions are PATCH in COTA (`/annotate`, `/remove`, `/reset`), timeline analysis (`/recompute`) and experiments (`/scores`), POST in perspectives (`/accept-labels`) and COTA (`/refine`). `GET /rag/chat-session` changes state.
- Job starts come in four forms: generated `POST /jobs/<type>`; hand-written `POST /jobs/perspectives?aspect_id=` and `POST /jobs/import`; under the resource (`POST /concept-over-time-analyses/{id}/refine`, returns `COTARead`); implicit (`PUT /perspectives/aspects`). Tag recommendation results are read under `/jobs/tag-recommendation/{job_id}/recommendations` and reviewed under `/tag-recommendations/review`.

Status codes:

- A memo attached to another project answers 404, any other foreign attached object 409.
- Copying a deleted source annotation: 404 on the single route, skipped silently on bulk.
- Client errors raised as `ValueError` in folders, tags, metadata and recompute, domain exceptions elsewhere.

### Simpler and safer, or complexity moved?

Safer: clearly. The two bugs named in #927 are impossible now, three unchecked id inputs of `main` are checked, and a forgotten check no longer leaks because the default read is scoped.

Simpler: yes for endpoints and services (about 260 check calls, 36 `get_project_id()` and the `Crud` dispatch are gone; endpoints are thin). Complexity that moved rather than disappeared:

- **Into the ORM**: relationships over composite keys join on `id` only so that they never write `project_id`. This costs the identity-map shortcut (S2) and rests on an invariant the schema no longer states (S1). It is the least obvious part of the result and is documented only in instructions.
- **Into the generic test**: `PATH_IDS`, `BODIES`, `QUERIES` and the two-tenant fixture must grow with every route. Acceptable, the coverage test forces it; but the test promises more than it checks (S3, S4).
- **Into three mixed endpoint files** (`user`, `project`, `feature`): two routers per file, 20 lines each. Fine; the instruction file should say so in its first rule (S7).
- **Into hand-written job routers** under `/jobs/...` next to the generated ones: works, no collision, but it is the least uniform part of the API.

### Before merge, and later

Before merge: S1 to S7, decide M1, do M2. All small except S5 (about 12 short tests) and M1.

Can wait (own issues): explicit project filters in the hand-written queries and the perspectives CRUDs; the frontend project id from the route; the job start shapes; tags and parameter typos (they rename generated client code); the 500s; the pre-existing bugs under can-wait 4, 5, 13.

## Not looked at

- Nothing was executed: no backend tests (incl. `test/endpoints/project_router`), no migration on a database, no `alembic check`, no typecheck or lint, no browser check, no importer run.
- Backend, only skimmed or grepped: `modules/classifier/models/*` training and inference logic; `modules/perspectives/perspectives_service.py` beyond CRUD and Weaviate calls; `modules/llm_assistant/strategies` and `tasks`; `modules/eximport` CSV schemas and project import/export; the pipeline step jobs (object detection, coreference, entities, quotations, keywords, embeddings) and the crawler; `core/doc_processing/entrypoints`; `core/artefacts` job bodies; `bbox_annotation_service.py`; the file CRUDs (source document, export, thumbnail, web image); `search_system` grouping, sorting, pagination; OAuth, security and refresh tokens.
- Migrations: ORM `__table_args__` against database names beyond a sample of seven tables; production volumes, lock and disk headroom.
- Tests: the bodies of the per-module cross-project tests (S5 rests on names and fixtures); `composite_keys_test_utils.py` beyond the row inventory.
- Frontend: the generated diff line by line (covered by the byte-identical regeneration); runtime behaviour of can-wait 14.
- `.github/workflows/*.lock.yml`, the agentic workflow prompts, `docs/feature-guides`, `ray/`.
- PRs #942 to #954 individually: only the final state and the descriptions of #941 and #955 were read.
