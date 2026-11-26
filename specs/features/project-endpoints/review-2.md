# Second review: project endpoints (#927 / #928), stack top `6b8f21676` (PR #956)

Reviewed 2026-11-26. Independent of `review.md`. Scope: the fix PR on its own (`agentic/api-g8-cleanup-f7a5f1...HEAD`, 196 files) and the stack as a whole (`main...HEAD`). No code was changed. Paths are relative to the repository root.

How the statements were obtained:

- **Run**: an ORM introspection script (keys, constraints, relationships of all mappers); `test/migrations/test_composite_keys_migration.py`, `test/crud/test_same_ids_in_two_projects.py` and `test/endpoints/project_router/test_same_ids_in_two_projects.py` (127 passed); one mutation experiment (N1), reverted.
- **Read by me**: the migration, ADR 0013, the job endpoint, the search and word frequency queries, the generic tests, the CI logs.
- **Read by four read-only sub-agents** (query sweep over `core`/`systems`/`repos`, query sweep over `modules`, all endpoint files, frontend and consistency). I re-checked every claim that became a finding here; claims marked "(sweep)" I did not re-read.

## 1. Verdict

- **Blockers: no.** No query, relationship, route, job or store access was found that mixes rows of two projects with the same ids.
- **Ready to merge: yes, after three small things.** N1 (the twin test cannot fail), N3 and N4 (instructions and dead code the stack left behind). N2 is the owner's call.
- **Must happen first:** green `backend-checks` on `6b8f21676` (still running), and the migration once on a copy of the production data, with the name check of M-a before it (D1 of `findings.md`: my answer is yes).

Counts: **0 blocker, 5 should fix before merge, 14 can wait.**

## 2. First review: status after #956

| Point                                     | Status                                                          | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1 `id` not unique, code relied on it     | **Fixed in the backend.** Open in the frontend (N2).            | Introspection of all mappers: every primary key of a project-owned table starts with `project_id`; no unique constraint, unique index or foreign key between project-owned tables lacks it; all relationships between project-owned tables name `project_id` in their joins; none writes it. The only one-column references go to `user`, `project`, `spantext` (global). Both query sweeps: no hand-written query mixes projects. |
| S2 many-to-one loads cost a query per row | **Fixed.**                                                      | Introspection: every many-to-one between project-owned tables has `use_get`. `test_composite_keys.py:147,175` pin it.                                                                                                                                                                                                                                                                                                              |
| S3 404 test without positive control      | **Fixed.**                                                      | `test/endpoints/project_router/test_project_router.py:354-395`: all-own ids must not answer 403/404. A 500 or 422 on own ids still passes (can wait 9).                                                                                                                                                                                                                                                                            |
| S4 no pin of routes outside projects      | **Fixed.**                                                      | `test_project_router.py:29,315` (`ROUTES_OUTSIDE_PROJECTS`).                                                                                                                                                                                                                                                                                                                                                                       |
| S5 body-id and filter-id tests missing    | **Fixed by the PR's account.**                                  | Commit `f0dfb4fbb`; I read the generic file only, not the per-module tests.                                                                                                                                                                                                                                                                                                                                                        |
| S6 dead CRUD methods without project      | **Fixed for the listed methods.** Other dead code remains (N4). | grep: none of the nine names exists; `read_by_user_and_sdoc` takes `project_id` (`span_annotation_crud.py:142`).                                                                                                                                                                                                                                                                                                                   |
| S7 contradicting instructions             | **Partly fixed.**                                               | The four listed places are fixed. Other instruction lines still teach id-only reads (N3).                                                                                                                                                                                                                                                                                                                                          |
| M1 squash the migrations                  | **Fixed.**                                                      | One revision `7f1bbe0f69d7` after `807bab97f373`; migration tests pass locally (upgrade, downgrade, backfill, names).                                                                                                                                                                                                                                                                                                              |
| M2 run on a production copy               | **Open.**                                                       | Not done; see section 3, M-a.                                                                                                                                                                                                                                                                                                                                                                                                      |

## 3. New findings

### Blocker

None.

### Should fix before merge

**N1. The twin tests cannot fail on the bug they are written for.** New in #956.

- Where: `backend/test/endpoints/project_router/test_same_ids_in_two_projects.py:49-85`, `backend/test/crud/test_same_ids_in_two_projects.py:146-168`.
- What is wrong: the twin is an exact copy, the test compares the two answers with each other, and `_without_project` blanks every `project_id`. A read that returns the rows of both projects returns the same doubled answer for both. A read by bare id returns the same row for both. Both pass.
- Proof: I removed `.filter(self.model.project_id == project_id)` from `CRUDTag.read_by_project` (`backend/src/core/tag/tag_crud.py:32`), so `GET /projects/{id}/tags` returns the tags of all projects. Both test files passed (119 passed). The change is reverted.
- Further gaps: only GET routes are called, so the searches, analyses, statistics and counts (all POST) are not covered; the CRUD test calls only `read_by_ids` and `read_multi`, no custom method and no service query.
- What still protects: the relationship test (`test_relationship_loads_only_rows_of_the_own_project`) is sound, it asserts `target.project_id`.
- Fix: record every answer of the project before the twin is filled and compare the answers after filling with that baseline (same body, same counts). Add the POST read routes (search, count, analyses) with their `BODIES`.

**N2. The frontend cache still identifies rows by id alone.** Older in the stack; contradicts the owner's id decision. No effect while ids stay globally unique.

- Where: `frontend/src/api/cache-sync/brain.ts:595` writes `tagQueries.idsBySdocOfSdocScope(sdocId)` = `["tag","sdoc",sdocId]`; the project comes last in the key (`frontend/src/core/tag/api/tagQueries.ts:9-13,30-33`) and the event payload `SdocTagLinks` has no `project_id` (`backend/src/core/tag/tag_dto.py:63`). Same pattern: `brain.ts:321` (cluster by aspect), `:151` (tag deleted), `:287` (project metadata deleted) (sweep).
- Scenario: the user opened document 12 of project B, then works in project A. Tagging document 12 of A overwrites the cached tag ids of document 12 of B. Back in B within the stale time, B's document shows A's tag ids.
- The comments state the forbidden assumption: `tagQueries.ts:12` ("the sdoc id already determines it"), `sdocQueries.ts:28`, `memoQueries.ts:35` (sweep).
- Fix: put `projectId` before the row id in these keys, add `project_id` to `SdocTagLinks`, and make the prefix writes project-scoped. Or decide that the frontend follows later and name it in ADR 0013 as a precondition of per-project ids.

**N3. Instructions that still teach id-only code.** S7 was fixed only where the first review pointed.

- `.github/instructions/backend-service.instructions.md:40,68,81,96`: `crud_x.read(db=db, id=...)`. `ProjectCRUDBase.read` needs `project_id`; the template raises `TypeError`.
- `.github/instructions/backend-crud.instructions.md:29-81`: the template is `SQLCRUDBase` with id-only methods; the real code CRUD is a `ProjectCRUDBase` (sweep).
- `.github/instructions/backend-dto.instructions.md:68`: lists `project_id` as a `CreateIntern` field; `project_crud_base.py:64` passes it itself (sweep).
- `.github/instructions/backend-endpoint.instructions.md:88,119`: recommend `emit_dtos_to_projects`, which has no caller (N4).
- `backend/src/systems/job_system/README.md:215`: "The start overwrites the `project_id` of the job input". Made stale by #956.
- `backend/src/systems/artefact_system/README.md:49-66` (id-only reads, `read_by_user_and_sdoc`), `backend/src/systems/search_system/README.md:218,223` (routes without the project prefix), `.github/instructions/frontend-api.instructions.md:60,105` (`TagService.createDocTag`, now `createTag`) (sweep for the first two).
- Scenario: an agent that follows the service or CRUD instruction writes a read without `project_id`, the exact pattern ADR 0013 forbids.
- Fix: add `project_id` to the templates and examples; correct the names.

**N4. Dead code the stack left behind.** The stack's own rule is no dead code.

- `backend/src/systems/websocket_system/websocket_dependency.py:92` `emit_dtos_to_projects` and `:12` `ProjectScopedDTO`: no caller.
- `backend/src/common/dependencies.py:24` `skip_limit_params`: no caller.
- `backend/src/repos/db/project_crud_base.py:110` and `crud_base.py:122` `read_multi`: the only caller is the new test `test_same_ids_in_two_projects.py:164`.
- `backend/src/core/project/project_crud.py:17` `read_by_title`: only `test_project_endpoint.py:185`.
- Checked by grep over `backend/src` and `backend/test`.
- Fix: delete them with the two test lines.

**M-a. The migration drops constraints by name and was never run on a database with production's history.** D1 / M2, still open.

- Where: `backend/src/migrations/alembic/versions/7f1bbe0f69d7_…py:75-134` (primary key names), `:178-499` (55 foreign key names), `:138-152`, `:619-630`, `:660-665`.
- Scenario: a constraint that carries another name in production (an older table rename, a database once created outside Alembic) makes `DROP CONSTRAINT` fail. The migration runs in one transaction and rolls back, so no data is lost, but the deployment stops with the stack down.
- Fix: before the deployment, compare the names in the lists with `pg_constraint` / `pg_indexes` of production (read-only), then run the migration once on a copy. Re-run the pre-flight of #941 on the same day.

### Can wait

Rule 4, by the letter:

1. Six annotation search queries join `<Anno>ORM.id == subquery.c.id` without a project filter on the annotation itself: `core/search/span_anno_search/span_anno_search.py:88,172`, `sent_anno_search.py:84,163`, `bbox_anno_search.py:84,170`. Safe today (see C2). Fix: add `.filter(<Anno>ORM.project_id == project_id)`.

Migration:

2. The backfill updates every row of 20 tables in one transaction (`:633-655`). The tables roughly double on disk until autovacuum has run; `wordfrequency` is the largest. Check disk headroom in the dry run. `ANALYZE` is there; no `VACUUM`.
3. The downgrade fails once two projects share an id (`:793-795`, primary key on `id`). Expected; say so in the deploy note: after the first per-project id, the way back is a restore.

API, all older than #956 or older than the stack:

4. `systems/search_system/search_builder.py:179-187`: a metadata id of another project in a filter answers 500 (`model_validate(None)`). Fix: raise `NoSuchElementError`. (First review, can wait 3.)
5. `modules/rag/rag_endpoint.py:45-58`, `repos/llm_repo.py:200`: a chat session is found by its uuid alone, not by project or user. A member of B with a session id of A continues A's conversation. Fix: store project and user with the session.
6. `modules/perspectives/perspectives_service.py:1635` and three siblings: a job's `cluster_id` is read in the project but not checked against the aspect of the job. Same project only. (sweep)
7. `modules/eximport/export_job_dto.py`: outer and inner `export_job_type` may disagree; the job then fails in the worker instead of answering 422. (sweep)
8. Still open from the first review: user-id filters resolve to the email of any user (`sdoc_search_columns.py:215`); `only_if_finished` is inverted (`source_document_endpoint.py:76,101`). Pre-existing, also not verified: the crawler takes any URL (`modules/crawler/crawler_job.py:80-86`, no scheme or host check).
9. The positive control of S3 accepts 500 and 422 for own ids. Require a 2xx where the fixture allows it.
10. D5: a job start body with `project_id` or any unknown field is accepted and the field ignored. Safe (the project comes from the path). Forbid extra fields only if old clients should fail loudly.

Frontend:

11. Persisted slices hold row ids and are not keyed by project (`features/annotation/store/annotationsSlice.ts:125`, the three search slices). Two tabs on two projects, then a reload: project B uses A's `mostRecentCodeId` and `hiddenCodeIds`. With per-project ids that selects a real code of B. (sweep)
12. 47 reads of `state.project.projectId` are unchanged (first review, can wait 14).
13. `ApiKeyCreateDialog.tsx:97-98`: the fix of `b32d82c19` is right for the click. The form still wraps the created-key view, so Enter in the key field may submit again. Reasoned, not tried in a browser. (sweep)

Code:

14. `modules/llm_assistant/llm_assistant_job.py:31` `validate_llm_assistant_retry` only forwards to one helper; `repos/filesystem/file_crud_base.py:11-12` imports `ORMBase` under `TYPE_CHECKING` without a cycle (new in #956). (sweep)

## 4. Check points of findings section 0

### C1. CI of #956

- On the final tip `6b8f21676`: `precommit-checks` pass, `frontend-checks` pass, GitGuardian pass. `backend-checks` was still in the pytest step when this was written; the three agent jobs were pending.
- The failed first frontend check (run 45849286201, attempt 1, commit `1b261b669`): `rq-cpu-worker` went to `Error` 3.5 s after its start and compose reported it unhealthy.
- The squashed migration cannot be the cause. The worker runs no migrations (`backend/src/worker.py`; only `setup.py` and `migrations/run_migrations.py` call `migrate_database`), and the API container starts only after the worker is healthy (`docker/compose.yml:258-262`). No migration had run yet.
- Nothing else in #956 can be the cause either, as far as I can tell: it touches neither `worker.py`, `bootstrap.py`, `docker/` nor the workflows, and the same commit started the worker healthy on the rerun (38 s, another runner). The first log holds no container output, so the real cause is unknown; a container that exits in 3.5 s points at the runner or at the start-up check of a shared service.

### C2. Joins that compare one id column

None of them can mix two projects with the same ids.

| Join                                                                                                                             | Why it is safe                                                                                                                                                                                                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `core/search/sdoc_search/sdoc_search.py:118`                                                                                     | The subquery holds ids of the project; the outer query filters `SourceDocumentORM.project_id` (`:119`).                                                                                                                                                                                                                                      |
| `span_anno_search.py:88,172`, `sent_anno_search.py:84,163`, `bbox_anno_search.py:84,170`                                         | The annotation has no filter of its own, but it is inner-joined through the relationships to its annotation document and document (both on `(project_id, id)`), and `SourceDocumentORM.project_id == project_id` is filtered. An annotation of B with the same id ends at a document of B and is dropped. Correct, but indirect: can wait 1. |
| `core/search/memo_search/memo_search.py`                                                                                         | All joins are composite; `MemoORM.project_id` is filtered (sweep).                                                                                                                                                                                                                                                                           |
| `modules/timeline_analysis/timeline_analysis_service.py:353,426,539,688,771`                                                     | Each outer query filters the outer table's `project_id` (`:354,427,540,689`; `:764` by the sweep).                                                                                                                                                                                                                                           |
| `modules/word_frequency/word_frequency_service.py:78,131`                                                                        | `WordFrequencyORM.project_id == project_id` at `:79,132`.                                                                                                                                                                                                                                                                                    |
| `SpanTextORM.id == SpanAnnotationORM.span_text_id` (`code_frequency_service.py:160`, `span_anno_search.py:99`, the column files) | `spantext` is a global table: key `id`, no `project_id` (`core/annotation/span_text_orm.py`). The one-column join is the right join.                                                                                                                                                                                                         |

Further cases looked for and not found: raw SQL (`text(` appears only in server defaults), `db.get`, bare-id CRUD calls (AST scan of every `crud_*` call, sweep), Elasticsearch (one index per project), Weaviate (one tenant per project), files (`projects/<project_id>/…`), the job system (`read_project_job` checks project and type for read, abort and retry; a retry requeues the stored input), exports and imports (no import trusts an id from the file).

### The three changed decisions (R5)

- **Job start bodies:** as decided. `project_id` comes from the path only (`systems/job_system/job_endpoint.py:26,66`); the hand-written starts (perspectives, import, COTA refine, experiment run) take it from the path too; a retry cannot change it. Validators of the input still run and answer 422.
- **One router per file:** as decided. 45 endpoint files, one `router` each; the only second router is `project_endpoint.py:19`. No doubled prefix or tag in `openapi.json`. No route outside `/projects/{project_id}` serves project data unchecked.
- **File owners by ORM class:** as decided. No leftover of `Crud`, `crud_enum` or `delete_by_entity` in `backend`, `docs`, `tools`, `.github`.

## 5. Not checked

- `backend-checks` on the final tip had not finished. I ran three test files, not the suite.
- The migration on production data, production's constraint names, lock time and disk use on real volumes.
- The per-module S5 tests, line by line.
- `modules/perspectives/perspectives_service.py` and `whiteboard_transformations.py` line by line (covered by call scans only).
- The service and CRUD code behind the endpoint files was traced by sub-agents; I re-read only what became a finding.
- Nothing was clicked in a browser. N2, can wait 11 and 13 are reasoned from the code.
- The frontend's generated client was compared with `openapi.json` by script (269 operations both ways), not regenerated.
- `tools/`, `docs/`, `ray/`, the agentic workflows and PRs #941 to #955 one by one.
- The comments of the agentic PR workflows (C3) and the unclicked UI paths (C4).
