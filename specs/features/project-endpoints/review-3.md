# Third review: project endpoints (#927 / #928), stack top `5ea880880` (PR #973)

Reviewed 2026-11-26. Final review of the whole stack (#941 to #956, #973). No code was changed. Paths are relative to the repository root.

How the statements were obtained:

- **Run by me**: the two twin test files unchanged (89 passed) and with four temporary leaks (3 failed, see A3); the leaks are reverted (`git status` shows only the copied `pr-reviews.md`).
- **Read by me**: every query named in `pr-reviews.md`, the migration `7f1bbe0f69d7`, the twin tests, `project_router.py`, all 269 operations of `frontend/src/openapi.json`, and every claim of a sweep that became a finding below.
- **Swept by five read-only sub-agents**: all hand-written queries and ORMs, all 45 endpoint files, all CRUDs, services and DTOs, the frontend keys, cache writes, hooks and slices, the tests and the docs. Claims I did not re-read are marked "(sweep)".
- **Scripted**: the list of operations, and the frontend callers of every generated client method.

## 0. Overview for the owner

### Verdict

The stack reached the goals of #927 and #928: I found no query, relationship, route, cache key or cache write that mixes two projects with the same ids, and all ten code findings of the PR reviewers are fixed on the top. The twin tests now fail when a query leaks (proven with four mutations). What is not reached is the consistency goal: the URL design follows no stated rule in about 55 of 269 operations, and names, shapes and tests differ between modules. No blocker, but the route shapes should be decided and fixed before the merge, because the merge is the one moment at which every client has to change anyway.

### Blockers for the merge

None.

Still open from before and unchanged: the migration was never run on a copy of the production data (D1, your task before the deployment).

### To decide

Each entry: the options, then my recommendation. The REST rules are C-rule-1 to C-rule-15 (full text in C1, violations in C3).

| #   | Decision                                                                                                               | Options                                                                                                                                                                                                                   | Recommendation                                                                                                                                                                   |
| --- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | When do the route changes happen?                                                                                      | (a) before the merge, one PR on top; (b) after the merge.                                                                                                                                                                 | (a). The stack already moves every route. A second round of renames after the merge breaks the importer, MCP users and API scripts a second time.                                |
| E2  | C-rule-1: one router per resource.                                                                                     | (a) accept; `/perspectives` splits into `/aspects` and `/clusters`, `user_endpoint.py` into members and virtual users; (b) keep module routers.                                                                           | (a).                                                                                                                                                                             |
| E3  | C-rule-2: child resources.                                                                                             | (a) flat: `/prompt-versions/{id}`, `/experiment-runs/{id}`, `/clusters/{id}`, parent id in the body and as filter; (b) nested: `/prompts/{prompt_id}/versions/{version_id}`; (c) leave.                                   | (a). It is what annotations, codes and memos already do, a row stays identified by `(project_id, id)`, and no route has to check that a child belongs to the parent in the path. |
| E4  | C-rule-4: method of an action.                                                                                         | (a) by effect, within the DATS rule: `PUT` if it creates, `PATCH` if it changes stored state, `POST` if it only computes or starts a job; (b) `POST` for every action, as GitHub, Stripe and Google do.                   | (a). (b) conflicts with the binding method rule. 6 routes break (a) today.                                                                                                       |
| E5  | C-rule-5: routers of computations.                                                                                     | (a) name the router after the result, as a plural noun, no verb-only namespace (`/code-frequencies`); (b) attach every computation to the resource it reads (`POST /codes/frequencies`); (c) leave the module namespaces. | (a). It keeps one module = one router = one feature gate. (b) spreads one module over several routers.                                                                           |
| E6  | C-rule-6: read variants.                                                                                               | (a) same item shape: query parameter; other shape: noun sub-path (`/count`, `/info`); no `by-…` paths; (b) leave.                                                                                                         | (a). 4 routes change.                                                                                                                                                            |
| E7  | C-rule-9: job starts.                                                                                                  | (a) keep the two forms the instruction names (`POST /jobs/<type>` and `POST /<resources>/{id}/<verb>`), input in the body only; (b) only `POST /jobs/<type>`.                                                             | (a). It fixes only `POST /jobs/perspectives?aspect_id=`. (b) conflicts with decision 2.3 of `findings.md` (approved: COTA and perspectives differ); see C5.                      |
| E8  | C-rule-11: status codes.                                                                                               | (a) every route answers 200 with a body; document 400/403/404/409 once in `project_router`; (b) 201 for creates, 204 for deletes.                                                                                         | (a). The body is the sync payload, so 204 does not fit; 201 would change 29 routes and many test asserts for no gain. Fix the one 204 (`POST /memos/{memo_id}/recent`).          |
| E9  | C-rule-11: a foreign id in a body.                                                                                     | (a) say what the code does: 409 where a foreign key holds the id, 404 where the route reads the id (id lists, JSON fields); (b) one status for all.                                                                       | (a), and write it into the endpoint and the test instruction. Today they say 409 only, while about 15 modules test 404 (D-tests-3).                                              |
| E10 | C-rule-12: handler names (= generated client methods).                                                                 | (a) no entity in CRUD handlers: `create`, `get_by_id`, `get_by_project`, `update_by_id`, `delete_by_id`, `create_bulk`, …; (b) `create_<entity>` as the majority does, the rest canonical; (c) leave.                     | (a) if E2 and E3 are accepted (then every file has one resource). It renames about 35 handlers and one frontend line each. (b) renames 6.                                        |
| E11 | Unused routes (C4).                                                                                                    | Delete `GET …/prompts/versions/{version_id}`, `GET …/rag/chat-session`, `GET …/word-frequencies`; decide on the span group routes (10 routes, no UI).                                                                     | Delete the three. Keep span groups if the feature is planned; otherwise delete them too. D2 (keep search-and-annotate and the two job lists) stays.                              |
| E12 | `DELETE /users/me` is an MCP tool (router tag `mcp`, `core/user/me_endpoint.py:14`).                                   | (a) take it out of the MCP tools; (b) keep.                                                                                                                                                                               | (a). An agent can delete the account with one call. Older than the stack, seen in passing.                                                                                       |
| E13 | #941 F1: an installation with user or memo handles cannot upgrade (B1).                                                | (a) keep and say so in the upgrade guide, with the query that finds the rows; (b) delete those handles and their memos in the migration.                                                                                  | (a). Production has none; the migration rolls back cleanly.                                                                                                                      |
| E14 | Typos in public names: `reject_cide_id`, `reviewd_recommendation_ids`, `cota_upate`, `/authentication/refresh_access`. | Fix now or later.                                                                                                                                                                                                         | Now, with the route PR. Each is a breaking rename.                                                                                                                               |

### To fix before the merge

Small unless noted. None changes behaviour for a correct client.

1. The route changes of the accepted rules (C3). About 55 routes, one frontend line each, plus tests and the importer. Size per rule in C6.
2. Add the REST guide to `.github/instructions/backend-endpoint.instructions.md` (text in C1) and correct what the file says wrongly: `FEATURE` (lines 24, 29, 71, 105; no module has that name), "read the job at /jobs/<job-type>" (line 48).
3. `frontend/src/store/generic/tableSlice.ts:79-85`: `resetProjectTableState` does not reset `expandedModel`. The persisted document search keeps folder ids of project A expanded in project B. This is a row id used without its project (A6).
4. Dead code the stack left: `core/metadata/project_metadata_crud.py:184`, `core/metadata/source_document_metadata_crud.py:104` (`read_by_project`), four DTO classes, two frontend hooks (D-crud-3, D-dto-4, D-fe-5).
5. Instructions and READMEs that no longer describe the code (list in D-docs). The ones that teach wrong code: `backend-service.instructions.md:76` (id without project), `backend-tests.instructions.md:128` (409 only) and `:95` (`MemoRow`), `backend/src/modules/perspectives/README.md:51` (primary key without `project_id`), `frontend-slice.instructions.md:34-63`.
6. `backend-tests.instructions.md` does not mention `test/endpoints/project_router/` at all: a new route must be entered in `PATH_IDS`, `BODIES`, `QUERIES`, `ARGUMENTS`. Without it the next author learns it from a failing test only.
7. Twin test gaps (A4): two GET routes are compared while they answer an error, and 9 POST reads are not called. Add them to `ARGUMENTS`.
8. `modules/perspectives/perspectives_job_endpoint.py:48-50` raises a bare `Exception` (500) for "a job is still running"; `core/doc/folder_endpoint.py:88` raises `ValueError` (500). Both are client errors. Open since `review.md` can-wait 12.

### Can wait

1. Service and CRUD naming families (D-crud-2, D-svc-1): three signature styles, `read_by_name_and_project` next to `read_by_name`, `_batch` and `multiple` next to `_multi`.
2. DTO naming (D-dto-1) and the three read DTOs without `project_id` (D-dto-3); they become "before the merge" if E3 (a) is accepted, because the flat child routes return them.
3. Request shapes: 24 computations mix query scalars with body lists (C-rule-15).
4. Test naming and fixtures: `another_project` / `other_project` / `foreign` mean different things in different modules (D-tests-2).
5. Frontend: `projectId` from Redux in 9 hook modules (known follow-up), four name forms for bulk hooks, `byProject` invalidations that sweep the whole domain (D-fe).
6. The 13 joins on a subquery id (A5): correct, but not by the letter of ADR 0013 rule 4. Either select `project_id` in the subqueries or name the pattern in the ADR.
7. `cluster_id` not checked against the aspect, `export_job_type` twice, user-id filters, `only_if_finished` (all open in `findings.md`, unchanged).
8. `tools/`, `docs/` beyond route names, and the browser paths of `findings.md` section 6 were not looked at again.

---

## Part A: did the implementers reach their goals?

### A1. Goals of #927 and #928 on the final state

| Goal                                                    | Result                         | Evidence                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Composite keys                                          | **Reached**                    | Every project-owned table has a `PrimaryKeyConstraint` that starts with `project_id`; every unique constraint and unique index of such a table names it; `unique=True` on a column exists only on `user`, `project`, `spantext`, `apikey` (grep, and ORM scan of 45 classes by the sweep).                        |
| Composite foreign keys                                  | **Reached**                    | Every foreign key onto a project-owned table is `(project_id, x_id) -> (project_id, id)`; one-column keys go only to `project.id`, `user.id`, `spantext.id` (sweep). One migration `7f1bbe0f69d7` (commit `628dab87e`).                                                                                           |
| Relationships join on both columns                      | **Reached**                    | Every one-to-many and many-to-one between project-owned tables has a `primaryjoin` with `project_id`. The 10 many-to-many relationships give no explicit join; SQLAlchemy derives both columns from the composite keys of the link table. Pinned by `test/crud/test_composite_keys.py:290,306` and the twin test. |
| Every project route under the project router            | **Reached**                    | 248 of 269 operations under `/projects/{project_id}`; 39 files use `project_router`, `project_endpoint.py` has the documented second router; the 21 others are pinned by `test_project_router.py:29,341`.                                                                                                         |
| CRUDs bound to one project                              | **Reached**                    | 26 of 26 tables keyed `(project_id, id)` have a CRUD on `ProjectCRUDBase`; no custom method takes an id without `project_id`; every `update(...)` and `delete(...)` statement filters it; no `db.get` (sweep, AST scan of all CRUD calls).                                                                        |
| Hand-written project and feature checks gone            | **Reached**                    | `assert_in_project` only in `common/project_router.py:35` and the content route `core/auth/auth_endpoint.py:199`; `assert_enabled` only in `project_router.py:37` and the two `validate_input` hooks. None in a service.                                                                                          |
| Frontend keys `[entity, "project", projectId, ...rest]` | **Reached, one shape differs** | 81 of 88 key definitions are project data and all carry the project before any row id; 7 are global. The 9 job factories use `[domain, "job", "project", projectId, …]` (`frontend/src/core/job/createJobQueries.ts:98-99`), which the instruction documents. No key literal outside `*Queries.ts`.               |
| Cache writes start from the event's project             | **Reached**                    | 84 of 84 event cases in `frontend/src/api/cache-sync/brain.ts` build every key from `event.payload.project_id`; every payload type carries it except `ApiKeyRead` (global), `ProjectRead` (its id) and `UserRead` (nullable, handled). No cache write takes the project from Redux.                               |

### A2. The two fix rounds

`review.md` (fixed in #956):

| Point                         | Status              | Evidence                                                                                                                                                                       |
| ----------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S1 `id` not unique            | Fixed               | ADR 0013 (`2b7f94b8a`), keys and joins as in A1 (`e5a558dbf`). No unique index on `id`.                                                                                        |
| S2 one SELECT per many-to-one | Fixed               | `test/crud/test_composite_keys.py:147,175` (identity map, `use_get`).                                                                                                          |
| S3 no positive control        | Fixed               | `test/endpoints/project_router/test_project_router.py:416-418`: own ids must answer 2xx, or the status listed in `OWN_ID_EXCEPTIONS` (`:218`, 5 routes, each with its reason). |
| S4 routes outside projects    | Fixed               | `test_project_router.py:29,341-351`, set equality.                                                                                                                             |
| S5 body and filter tests      | Fixed, uneven       | Commit `f0dfb4fbb`. Still without a module test although the route takes the id: see D-tests-1.                                                                                |
| S6 dead CRUD methods          | Fixed               | grep over `backend/src` and `backend/test`: none of the names exists. Two other dead methods exist (D-crud-3).                                                                 |
| S7 contradicting instructions | Fixed for the lines | The named lines are right. Other drift: D-docs.                                                                                                                                |
| M1 one migration              | Fixed               | `628dab87e`; one revision after `807bab97f373`.                                                                                                                                |
| M2 production copy            | Open                | D1.                                                                                                                                                                            |

`review-2.md` (fixed in #973):

| Point                              | Status          | Evidence                                                                                                                                                          |
| ---------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| N1 twin tests cannot fail          | Fixed, proven   | A3.                                                                                                                                                               |
| N2 frontend cache by id alone      | Fixed           | `575fb9d83`, `89fd758d2`; A1 rows 7 and 8. One persisted field is left: A6.                                                                                       |
| N3 instructions teach id-only code | Fixed, one left | `49eddddc0`. `backend-service.instructions.md:40,68,81` are right; `:76` still says `db=db, id=..., create_dto=...`.                                              |
| N4 dead code                       | Fixed           | `c1d795ff2`; grep: `emit_dtos_to_projects`, `ProjectScopedDTO`, `skip_limit_params`, `read_multi`, `read_by_title` are gone.                                      |
| 1 annotation searches              | Fixed           | `8b7b591b0`; `core/search/span_anno_search/span_anno_search.py:70,89,164,174` and the same lines of the sentence and bbox searches filter `<Anno>ORM.project_id`. |
| 4 foreign metadata id answers 500  | Fixed           | `79de87ac3`; `systems/search_system/search_builder.py:180-184` reads the metadata within the project (404).                                                       |
| New: metadata group-by 500         | Fixed           | `search_builder.py:208` groups by `metadata.project_id, metadata.id`.                                                                                             |
| 5 chat session by uuid alone       | Fixed           | `ab14d396f`; `modules/rag/rag_service.py:44,80-81,99-100` pass project and user.                                                                                  |
| 9 positive control accepts 500     | Fixed           | `test_project_router.py:418` (`response.is_success`).                                                                                                             |
| 10 unknown fields in job starts    | Fixed           | `8e36b47cd`; `systems/job_system/job_endpoint.py:56` (`extra="forbid"`).                                                                                          |
| 11 persisted slices                | Fixed, one left | The four persisted slices store their `projectId` and reset on change (sweep). `expandedModel` is not reset: A6.                                                  |
| 14 pass-through, `TYPE_CHECKING`   | Fixed           | `modules/llm_assistant/llm_assistant_job.py:31` holds the check itself now.                                                                                       |

### A3. The twin tests can fail now (proof)

Baseline on the top: `test/endpoints/project_router/test_same_ids_in_two_projects.py` and `test/crud/test_same_ids_in_two_projects.py`: 89 passed.

I then removed four project filters at once and ran both files again: 3 failed, 86 passed.

| Mutation (reverted)                                                                                  | Test that failed                      | Message                                                                             |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------- |
| `core/tag/tag_crud.py:31`: `read_by_project` without the project filter (the proof of `review-2.md`) | endpoint twin test                    | one of its 4 differences                                                            |
| `modules/statistics/statistics_service.py:46`: global tag count without the project filter           | endpoint twin test, service twin test | among the 4 and the 2 differences                                                   |
| `modules/code_frequency/code_frequency_service.py:56`: span counts without the project filter        | endpoint twin test, service twin test | `POST …/code-frequency/frequencies: count 4 != 3`; `code frequencies: count 4 != 3` |
| `core/annotation/span_annotation_crud.py:155`: `read_by_user_and_sdoc` without the project filter    | CRUD twin test                        | `CRUDSpanAnnotation.read_by_user_and_sdoc: … !=`                                    |

So a GET list, a POST statistic, a hand-written service query and a custom CRUD read are each caught. The design is right: the project's answers are recorded alone, then compared after the twin exists, and the twin must answer the same with its own project id.

### A4. What the twin tests still do not see

1. Two GET routes are compared while they answer an error, because they have required query parameters and are in neither `ARGUMENTS` nor `QUERIES`: `GET …/rag/chat-session` and `GET …/source-document-metadata/date-count` (sweep; `test_every_project_route_is_covered` asks for `QUERIES` only when the route also has a path id). Only `ARGUMENTS` routes must answer 200.
2. Nine POST reads are not called: `annotation-scaling/suggest`, `keyword-statistics/keywords`, `simsearch/sentences`, `simsearch/images`, `perspectives/aspects/{aspect_id}/visualize`, `experiments/runs/{run_id}/export-log`, `rag/session`, `memos/suggest`, `search-annotate/auto-annotate`. The queries of `annoscaling_service.py` and `keyword_statistics_service.py` are reached by neither twin test.
3. The 10 job reads (`{job_id}` is not in `PATH_IDS`), among them `GET …/jobs/tag-recommendation/{job_id}/recommendations`, which reads SQL rows.
4. Only SQL rows are copied. Reads of Elasticsearch, Weaviate and files compare empty with empty. That is acceptable (one index and one tenant per project), but the docstring is the only place that says so.
5. Writes are not covered by the twin tests. The path-id test covers them with ids that differ between the projects.

### A5. Id-only joins, reads, group-bys left

No leak found. What is left is correct but indirect:

- **13 joins on a subquery id**: `core/search/span_anno_search/span_anno_search.py:88,173`, `sent_anno_search.py:84,164`, `bbox_anno_search.py:84,171`, `sdoc_search/sdoc_search.py:118`, `modules/word_frequency/word_frequency_service.py:78,131`, `modules/timeline_analysis/timeline_analysis_service.py:353,426,539,688`, and `systems/artefact_system/source_document_step_status_crud.py:293`. Both sides are filtered by the project in each case (I read the six search joins; the rest by the sweep). ADR 0013 rule 4 says a join "compares `project_id` and the id". Either add `project_id` to the subqueries or name the pattern in the ADR.
- **Id filters on a joined table without its own project filter**, about 30 places, e.g. `code_frequency_service.py:57-58` (`AnnotationDocumentORM.user_id.in_`, `SpanAnnotationORM.code_id.in_`), `document_sampler_service.py:84`, the annotation CRUD reads by `AnnotationDocumentORM.source_document_id`. Each table is reached through a relationship join, which compares the project (sweep). Correct.
- **Group-bys**: no query selects a non-aggregated column of a table grouped by its id alone. `document_sampler_service.py:86` groups by `SourceDocumentORM.id` and selects only that id and an aggregate. No `DISTINCT ON`, no window function.
- **Recursive CTEs** compare the project: `systems/search_system/filtering.py:49-61`, `sdoc_search.py:75-87`, `code_crud.py:151-159`, `folder_crud.py:30-38`.
- **Two reads derive the project from the row**: `modules/classifier/classifier_job.py:27` and `modules/llm_assistant/llm_assistant_job.py:38` read a user by id and compare `project_id` by hand, although `crud_user.read_virtual_user(db, project_id, id)` exists (`core/user/user_crud.py:81`). The `user` table is global, so this is no ADR violation; it is the hand-written check the refactor wanted to remove.

### A6. One row id without its project in the frontend

`frontend/src/store/generic/tableSlice.ts:79-85`: `resetProjectTableState` resets five fields but not `expandedModel`, and `documentSearchSlice` is persisted. Its keys are folder row ids (`SearchDocumentTable.tsx:266`, sweep). Folders expanded in project A stay expanded for the same ids in project B, also after a reload. Today ids differ between projects, so nothing is visible; with per-project ids it is. Fix: one line.

Further, same class but harmless: `frontend/src/api/cache-sync/_utils/jobCacheUtils.ts:138,293` take the project from `job.input.project_id` instead of `job.project_id` (sweep).

### A7. Two statements of `findings.md` that are not right on the top

- 3.3 says the perspectives assistant uses `GET …/rag/chat-session`. It uses `POST …/rag/session` (`frontend/src/features/perspectives/api/perspectivesHooks.ts:96`). No frontend code calls `chat-session` (C4).
- Section 4 says all job methods live on `JobService`. `startPerspectivesJob` is on `PerspectivesService` and `startImportJob` on `ImportService`, because their routers carry other tags (`perspectives_job_endpoint.py:18`, `import_endpoint.py:13`).

---

## Part B: the concerns of the PR reviewers

All verdicts are for the top of the stack. 11 findings: 10 fixed later, 1 valid by design.

| #   | Finding                                                                           | Verdict                        | Evidence                                                                                                                                                                                                                                                                                                                                                                                                           |
| --- | --------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| B1  | #941 F1: legacy `objecthandle.user_id` rows make the upgrade fail                 | **Still valid, by design**     | `7f1bbe0f69d7…py:642-655`: `project_id` is filled from the attached object; a handle of a user or a memo gets none and fails `NOT NULL`. The docstring (`:8-13`) says so. The released migration `2bbc904aa055…py:189-194` can create such handles. Production has none (pre-flight). The migration is one transaction, so nothing is lost. Not a blocker; decide E13. Fix size: a paragraph in the upgrade guide. |
| B2  | #944 F1: code occurrences group by `CodeORM.id` only (Postgres error)             | **Fixed later**                | `modules/code_frequency/code_frequency_service.py:171-177, 217-226, 271-277` group by `project_id` and `id` of every selected entity; joins go through the relationships (`:153-159`). Commit `e5a558dbf`. The route answers 200 in the twin test.                                                                                                                                                                 |
| B3  | #944 F2: tag statistics group by bare id, join on `tag_id`, global count unscoped | **Fixed later**                | `modules/statistics/statistics_service.py:25-28` (composite join), `:31` (project filter), `:34` (group by `project_id, id`), `:46` (global count filtered). Removing `:46` fails the twin tests (A3).                                                                                                                                                                                                             |
| B4  | #944 F3: annotation searches join `CodeORM` on the id alone                       | **Fixed later**                | `span_anno_search.py:96-97` joins `SpanAnnotationORM.code` (relationship, composite); `:89-90` filter the annotation's and the document's project. Same in the sentence and bbox searches. Commits `e5a558dbf`, `8b7b591b0`.                                                                                                                                                                                       |
| B5  | #944 F4: code frequencies never filter the project                                | **Fixed later**                | `code_frequency_service.py:56, 79, 102`. Removing `:56` fails the twin tests (A3).                                                                                                                                                                                                                                                                                                                                 |
| B6  | #944 F5: document sampler ignores `project_id`                                    | **Fixed later**                | `modules/document_sampler/document_sampler_service.py:81-84`: joins `SourceDocumentORM.tags` (composite) and filters `SourceDocumentORM.project_id`. Commit `564d522f7`.                                                                                                                                                                                                                                           |
| B7  | #944 F6: recursive CTE roots on bare id                                           | **Fixed later**                | `systems/search_system/filtering.py:50-60`: root filters `project_id` and `id`, the recursive join compares `project_id` and `parent_id`.                                                                                                                                                                                                                                                                          |
| B8  | #951 F1: perspectives CRUDs identify rows by aspect, cluster, document only       | **Fixed later**                | `modules/perspectives/document_cluster_crud.py:23-67` take `project_id` and filter `self.model.project_id`; `merge_clusters` takes it (`:76-82`); callers pass `(project_id, …)` key tuples (sweep). Commit `e5a558dbf`.                                                                                                                                                                                           |
| B9  | #951 F2: classifier, aspect, cluster relationships on bare ids                    | **Fixed later**                | Every relationship between project-owned tables has a composite `primaryjoin` (ORM scan). `test/crud/test_composite_keys.py:263` pins the classifier link.                                                                                                                                                                                                                                                         |
| B10 | #951 F3: association primary keys without `project_id`                            | **Fixed later**                | R2 of `findings.md`: every key starts with `project_id`, e.g. `document_aspect_orm.py:47-49` (`"project_id", "sdoc_id", "aspect_id"`).                                                                                                                                                                                                                                                                             |
| B11 | #952 F1: prompt README names old routes                                           | **Fixed later**, one line left | `backend/src/core/prompt/README.md:10,20,30,36` name `/projects/{project_id}/prompts/…`. Line 16 still writes `/tags/bulk`, `/project-metadata/bulk` without the prefix (D-docs-6).                                                                                                                                                                                                                                |

---

## Part C: REST design of all routes

### C1. The rule set

Written so that it can go into `.github/instructions/backend-endpoint.instructions.md` as a section "REST design". The method rule stays as it is (`PUT` creates, `PATCH` updates, `DELETE` deletes, `POST` computes or starts a job, `GET` reads). What the file already says about paths stays valid; rule 9 corrects one line.

- **C-rule-1 Router**: one endpoint file has one router for one resource; the prefix is the resource as a plural kebab-case noun (`/span-annotations`), and a module with several resources has one endpoint file per resource.
- **C-rule-2 Child resources**: a resource with an id of its own is a collection directly under the project (`/prompt-versions/{prompt_version_id}`); its parent is a body field on create and a query filter on the list, never a path segment.
- **C-rule-3 Parts of one resource**: `GET /{<entity>_id}/<noun>` returns a part or a view of that one resource (`/data`, `/urls`, `/annotators`); it never returns rows of another resource that have their own collection.
- **C-rule-4 Actions**: an action is the last path segment and an imperative verb, `/{<entity>_id}/<verb>` on one resource and `/<verb>` on the collection; its method follows its effect: `PUT` if it creates a resource (`/duplicate`), `PATCH` if it changes stored state, `POST` if it only computes or starts a job.
- **C-rule-5 Computations**: a computation with no stored result that belongs to a resource is `POST /<resources>/<verb>` or `POST /<resources>/{<entity>_id}/<verb>`; a module that only computes names its router after the result as a plural noun (`/code-frequencies`) and computes at `POST ""` or `POST /<noun>`; no prefix is a bare module name with only verbs below it.
- **C-rule-6 Read variants**: a read that returns the items of the collection is the collection `GET` with query parameters; a read that returns another shape is a noun sub-path (`/count`, `/info`) declared before `/{<entity>_id}`; no `/by-<field>` paths.
- **C-rule-7 Bulk**: bulk routes are `/bulk` with the method of the single route and a list body, and answer in the order of the request; a bulk action is `/bulk/<verb>`.
- **C-rule-8 Links**: a link between two resources is `PUT` and `DELETE /{<entity>_id}/<others>/{<other>_id}`, its list is `GET /{<entity>_id}/<others>`, bulk links are `/bulk/<others>`.
- **C-rule-9 Jobs**: a job starts at `POST /jobs/<job-type>` or, when it works on one resource, at `POST /<resources>/{<entity>_id}/<verb>`; the whole input is in the body; the job is read at `GET /projects/{project_id}/jobs/<job-type>/{job_id}`, and every job route has the tag `job`.
- **C-rule-10 `me`**: `/users/me` stands for the logged-in user, everything personal lives below it (`/users/me/api-keys`), and no route takes another user's id outside a project.
- **C-rule-11 Status codes**: every route answers 200 with a body; 400 for a rule of the domain, 403 for a non-member or a disabled feature, 404 for an unknown path id or an id the route reads, 409 for a violated foreign key or unique constraint, 422 for an invalid request; endpoint code raises domain exceptions, never `ValueError`, `Exception` or `assert`.
- **C-rule-12 Handler names**: the handler name is the method of the generated client; CRUD handlers are `create`, `get_by_id`, `get_by_project`, `update_by_id`, `delete_by_id`, `create_bulk`, `update_bulk`, `delete_bulk` without the entity; an action is named like its path verb (`duplicate`, `refine`); a computation `<verb>_<object>`.
- **C-rule-13 Path parameters**: a path id is `{<entity>_id}` with the entity's name or its allowed abbreviation (`sdoc`), the same name in every route.
- **C-rule-14 Tags**: the first tag is the router prefix in camelCase (`spanAnnotation`, `codeFrequency`); `mcp` is set on the router only.
- **C-rule-15 Request shape**: a create, an update and a computation take one body DTO; query parameters are scalars that filter, sort or page; no loose `Body()` lists next to a DTO, and every path segment is kebab-case.

What well-known APIs do, and where the rules follow them: collections as plural nouns and flat child resources (Stripe, GitHub for most resources); filters as query parameters (all); a named verb as the last segment for an action (Google's custom methods `:verb`, GitHub `/merge`, Stripe `/capture`); `/count` as a sub-resource (Shopify); `me` as a fixed id (GitHub `/user`, Slack, Spotify `/me`). Where the rules deliberately differ: those APIs use `POST` for every action and for creates; DATS uses `PUT`, `PATCH`, `POST` by effect (E4).

### C2. Every operation against the rule set

All 269 operations of `frontend/src/openapi.json` were checked. Per router: operations, and how many break a path or method rule (rules 1 to 11; names, parameters, tags and request shape are counted in C3 by rule).

| Router (tag)                            | Ops | Break | Which                                                                                                                          |
| --------------------------------------- | --- | ----- | ------------------------------------------------------------------------------------------------------------------------------ |
| `/span-annotations`                     | 13  | 0     |                                                                                                                                |
| `/sentence-annotations`                 | 10  | 1     | rule 6 `/by-sentence`                                                                                                          |
| `/bbox-annotations`                     | 7   | 0     |                                                                                                                                |
| `/span-groups`                          | 6   | 0     |                                                                                                                                |
| `/codes`                                | 6   | 0     |                                                                                                                                |
| `/tags`                                 | 12  | 1     | rule 7 `/bulk/source-documents/set`                                                                                            |
| `/folders`                              | 7   | 0     | (`/{folder_id}/source-documents` returns ids of another resource: borderline rule 3)                                           |
| `/source-documents`                     | 10  | 1     | rule 6 `/by-filename` (`/{sdoc_id}/same-folder`: borderline rule 3)                                                            |
| `/source-document-metadata`             | 6   | 1     | rule 6 `/date-count`                                                                                                           |
| `/project-metadata`                     | 6   | 0     |                                                                                                                                |
| `/memos`                                | 10  | 2     | rule 6 `GET /recent`; rule 4 and 11 `POST /{memo_id}/recent` (persists, 204)                                                   |
| `/prompts`                              | 10  | 3     | rule 2 `/versions/{version_id}`, `/{prompt_id}/versions`; rule 4 `POST /examples` (noun)                                       |
| `/search`                               | 14  | 0     |                                                                                                                                |
| `/doc-processing`                       | 6   | 6     | rule 5 (module namespace), rule 9 (three job starts return `int`, `str`, `int`)                                                |
| project (`/projects`, `/projects/{id}`) | 4   | 0     |                                                                                                                                |
| `/members`, `/virtual-users`            | 6   | 6     | rule 1 (two resources, one router with prefix `""`); paths themselves are right                                                |
| `/users/me`                             | 4   | 0     |                                                                                                                                |
| `/users/me/api-keys`                    | 3   | 0     |                                                                                                                                |
| `/authentication`                       | 8   | 1     | rule 15 `/refresh_access`                                                                                                      |
| general (`/`, `/heartbeat`, `/info…`)   | 5   | 0     |                                                                                                                                |
| `/features`                             | 4   | 2     | rule 4 `POST /{feature}/enable`, `/disable` persist                                                                            |
| `/jobs` (generated)                     | 30  | 0     |                                                                                                                                |
| `/jobs/import`                          | 1   | 1     | rule 9 tag `import`; the query `import_job_type` next to a file is acceptable                                                  |
| `/jobs/perspectives`                    | 1   | 1     | rule 9 `?aspect_id=` and tag                                                                                                   |
| `/jobs/tag-recommendation/{job_id}/…`   | 1   | 1     | rule 2 results of a job as a path below the job                                                                                |
| `/tag-recommendations`                  | 1   | 0     |                                                                                                                                |
| `/perspectives`                         | 13  | 13    | rule 1 (container prefix); in it rule 2 `/clusters/{cluster_id}`, `/aspects/{id}/clusters`; rule 4 two `POST` that persist     |
| `/classifiers`                          | 5   | 0     |                                                                                                                                |
| `/concept-over-time-analyses`           | 10  | 2     | rule 4 `/annotate`, `/remove` (verb without object; `remove` reads like delete)                                                |
| `/timeline-analyses`                    | 7   | 0     |                                                                                                                                |
| `/whiteboards`                          | 7   | 0     |                                                                                                                                |
| `/experiments`                          | 10  | 6     | rule 2 four `/runs…` routes; rule 4 two `/scores` (noun for an action)                                                         |
| `/search-views`                         | 5   | 1     | rule 4 `/order` (noun for an action)                                                                                           |
| `/word-frequencies`                     | 4   | 0     |                                                                                                                                |
| `/code-frequency`                       | 2   | 2     | rule 5                                                                                                                         |
| `/keyword-statistics`                   | 1   | 1     | rule 5 `/keyword-statistics/keywords` repeats the prefix                                                                       |
| `/statistics`                           | 2   | 0     |                                                                                                                                |
| `/document-sampler`                     | 1   | 1     | rule 5                                                                                                                         |
| `/agreement`                            | 3   | 3     | rule 5                                                                                                                         |
| `/annotation-scaling`                   | 2   | 2     | rule 5; rule 4 `POST /confirm-suggestions` creates annotations                                                                 |
| `/search-annotate`                      | 1   | 1     | rule 5                                                                                                                         |
| `/simsearch`                            | 2   | 2     | rule 5 (abbreviated module name)                                                                                               |
| `/llm-assistant`                        | 1   | 1     | rule 5                                                                                                                         |
| `/rag`                                  | 2   | 2     | rule 5; rule 4 `GET /chat-session` calls the LLM in a session                                                                  |
| **Sum**                                 | 269 | 64    | 15 of them only through rule 1 (path unchanged for `/members`, `/virtual-users`; prefix change only for 9 perspectives routes) |

### C3. Violations by rule, with the proposed route

All paths below are under `/projects/{project_id}`.

**C-rule-1 (router = one resource)**

| Now                                                                                 | Proposed                                                                                                        |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `modules/perspectives/perspectives_endpoint.py`, prefix `/perspectives`, 13 routes  | `aspect_endpoint.py` with `/aspects` (11 routes), `cluster_endpoint.py` with `/clusters` (2 routes, see rule 2) |
| `core/user/user_endpoint.py`, `project_router("")`, `/members` and `/virtual-users` | `member_endpoint.py` (`/members`), `virtual_user_endpoint.py` (`/virtual-users`); paths unchanged               |
| `tag_recommendation_endpoint.py` and `tag_recommendation_job_endpoint.py`           | one file `/tag-recommendations` (see rule 2)                                                                    |

**C-rule-2 (child resources flat)**

| Now                                                       | Proposed                                                              | Note                                                                                  |
| --------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `PUT /prompts/{prompt_id}/versions`                       | `PUT /prompt-versions` (body `prompt_id`)                             | returns `PromptRead` today (the parent); keep that or return the version, see D-dto-3 |
| `GET /prompts/versions/{version_id}`                      | delete (no caller, C4), or `GET /prompt-versions/{prompt_version_id}` |                                                                                       |
| `PUT /experiments/runs`                                   | `PUT /experiment-runs` (body `experiment_id`)                         | all four return `ExperimentRead` today                                                |
| `DELETE /experiments/runs/{run_id}`                       | `DELETE /experiment-runs/{experiment_run_id}`                         |                                                                                       |
| `PATCH /experiments/runs/{run_id}/scores`                 | `PATCH /experiment-runs/{experiment_run_id}/refresh-scores`           | also rule 4                                                                           |
| `POST /experiments/runs/{run_id}/export-log`              | `POST /experiment-runs/{experiment_run_id}/export-log`                |                                                                                       |
| `PATCH /perspectives/clusters/{cluster_id}`               | `PATCH /clusters/{cluster_id}`                                        |                                                                                       |
| `GET /perspectives/aspects/{aspect_id}/clusters?sdoc_id=` | `GET /clusters?aspect_id=&sdoc_id=`                                   | clusters have their own ids                                                           |
| `GET /jobs/tag-recommendation/{job_id}/recommendations`   | `GET /tag-recommendations?job_id=`                                    | the recommendations are rows of their own table                                       |

If you prefer nesting (E3 b): `GET /prompts/{prompt_id}/versions/{version_id}`, `/experiments/{experiment_id}/runs/{run_id}/…`, `/aspects/{aspect_id}/clusters/{cluster_id}`. Then every such route must check that the child belongs to the parent of the path.

**C-rule-4 (actions: verb, and method by effect)**

| Now                                                    | Proposed                                                                            | Why                                                          |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `POST /perspectives/aspects/{aspect_id}/accept-labels` | `PATCH /aspects/{aspect_id}/accept-labels`                                          | sets `is_accepted` (`perspectives_endpoint.py:425`), no emit |
| `POST /perspectives/aspects/{aspect_id}/revert-labels` | `PATCH /aspects/{aspect_id}/revert-labels`                                          | same (`:460`)                                                |
| `POST /features/{feature}/enable`, `/disable`          | `PATCH /features/{feature}/enable`, `/disable`                                      | change the project's features and emit `PROJECT_UPDATED`     |
| `POST /memos/{memo_id}/recent` (204)                   | `PATCH /memos/{memo_id}/mark-recent`, answering the memo                            | upserts a row (`memo_crud.py:224-242`)                       |
| `POST /annotation-scaling/confirm-suggestions`         | `PUT /annotation-scaling/suggestions/confirm` or reuse `PUT /span-annotations/bulk` | creates span annotations and emits a created event           |
| `GET /rag/chat-session`                                | delete (no caller), or `POST`                                                       | calls the LLM within a session                               |
| `PATCH /concept-over-time-analyses/{cota_id}/annotate` | `…/annotate-sentences`                                                              | says what is annotated                                       |
| `PATCH /concept-over-time-analyses/{cota_id}/remove`   | `…/remove-sentences`                                                                | `remove` reads like deleting the analysis                    |
| `PATCH /experiments/{experiment_id}/scores`            | `…/refresh-scores`                                                                  | the handler is `refresh_all_run_scores`                      |
| `PATCH /search-views/order`                            | `PATCH /search-views/reorder`                                                       | handler `reorder`                                            |
| `POST /prompts/examples`                               | `POST /prompts/build-examples`                                                      | handler `create_examples`, creates nothing                   |

`POST /features/{feature}/complete`, `POST /concept-over-time-analyses/{cota_id}/refine` and the three `PUT /{id}/duplicate` follow the rule.

**C-rule-5 (computations)**

| Now                                                   | Proposed                                                                                | Confidence in the name  |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------- |
| `POST /code-frequency/frequencies`                    | `POST /code-frequencies`                                                                | high                    |
| `POST /code-frequency/occurrences`                    | `POST /code-frequencies/occurrences`                                                    | high                    |
| `POST /keyword-statistics/keywords`                   | `POST /keyword-statistics`                                                              | high                    |
| `POST /document-sampler/sample-by-tags`               | `POST /document-samples`                                                                | medium                  |
| `POST /agreement/compute`                             | `POST /agreements`                                                                      | medium                  |
| `POST /agreement/export-counts`                       | `POST /agreements/export`                                                               | medium                  |
| `POST /agreement/segment-texts`                       | `POST /agreements/segment-texts`                                                        | medium                  |
| `POST /annotation-scaling/suggest`                    | `POST /annotation-scaling/suggestions`                                                  | medium                  |
| `POST /search-annotate/auto-annotate`                 | `POST /search/annotation-candidates` (it searches and creates nothing)                  | low; D2 keeps the route |
| `POST /simsearch/sentences`, `/images`                | `POST /similarity-search/sentences`, `/images`                                          | medium                  |
| `POST /llm-assistant/count-existing-annotations`      | keep the path; rename the prefix only if a second route comes                           | low                     |
| `POST /rag/session`                                   | `POST /rag-chat/messages`                                                               | low                     |
| `GET /doc-processing/columns`                         | `GET /search/source-document-statuses/info`                                             | medium                  |
| `POST /doc-processing/search`                         | `POST /search/source-document-statuses`                                                 | medium                  |
| `GET /doc-processing/status?status=`                  | `GET /source-documents/count?status=` if only the number is used, else keep             | low                     |
| `POST /doc-processing/upload`, `/retry`, `/recompute` | `POST /source-documents/upload`, `/retry-processing`, `/recompute`, answering job reads | medium; see rule 9      |

`/statistics/codes`, `/statistics/tags`, `/search/…`, `/word-frequencies/analysis`, `/classifiers/dataset-statistics`, `/memos/suggest`, `/prompts/preview` follow the rule. `/code-frequencies` next to `/word-frequencies` then reads the same.

**C-rule-6 (read variants)**

| Now                                                          | Proposed                                                                                                                                                        |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /source-documents/by-filename?filename=`                | `GET /source-documents?filename=` (a list of 0 or 1)                                                                                                            |
| `GET /sentence-annotations/by-sentence?sdoc_id=&user_id=`    | use `GET /sentence-annotations?sdoc_id=&user_id=` (exists, no frontend caller) and group in the frontend, or name the view `/sentence-annotations/per-sentence` |
| `GET /memos/recent`                                          | `GET /memos?recent=true`                                                                                                                                        |
| `GET /source-document-metadata/date-count?date_metadata_id=` | `GET /source-documents/count?date_metadata_id=` (it counts documents)                                                                                           |

`/count` is `POST` for spans, sentences and tags (id lists in the body) and `GET` for documents (scalars only). That is consistent with the method rule; say it in the guide. `/info`, `/task-info`, `/default` are noun views and fine.

**C-rule-7 (bulk)**

| Now                                     | Proposed                                                                                                   |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `PATCH /tags/bulk/source-documents/set` | `PATCH /tags/bulk/source-documents/replace` (a bulk action with a verb), or a mode of the `PATCH` above it |

Not violations, but gaps: no `PUT /bbox-annotations/bulk`; bulk delete exists for annotations, memos and documents only. `DELETE …/bulk` takes a JSON body (6 routes); some proxies drop bodies of `DELETE`. It works behind the DATS nginx; I would leave it and note it.

**C-rule-9 (jobs)**

| Now                                                                                 | Proposed                                              |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `POST /jobs/perspectives?aspect_id=` (tag `perspectives`)                           | `aspect_id` in the body, tag `job`                    |
| `POST /jobs/import?import_job_type=` (tag `import`)                                 | tag `job`; the query parameter stays (multipart file) |
| `POST /doc-processing/upload` → `int`, `/retry` → `str`, `/recompute` → `int`       | answer the started job reads                          |
| `PUT /perspectives/aspects` and `PUT /experiments/runs` start a job inside a create | acceptable; say in the summary that a job starts      |

**C-rule-11 (status codes)**

- `core/memo/memo_endpoint.py:182`: the only `status_code=` of the API (204).
- 500 for client errors: `core/doc/folder_endpoint.py:88` (`ValueError`), `modules/perspectives/perspectives_job_endpoint.py:48-50` (`Exception`), `modules/perspectives/perspectives_endpoint.py:308-351` (three `assert`).
- No operation declares 403, 404 or 409 in the spec (every one lists 200 and 422 only). One `responses=` in `common/project_router.py` documents them for all 248.
- A foreign id in a body: 409, 404, 400 (`search-views/order`) and 200 (`timeline-analyses`, see D-tests-3).

**C-rule-12 (handler names)**, 239 hand-written handlers (sweep):

- 6 bare `create` (prompt, cota, experiment, search view, timeline analysis, whiteboard) next to 13 `create_<entity>`.
- `update`, `delete`, `reorder` in `search_view_endpoint.py:105,132,77`.
- `get_all_aspects`, `update_aspect_by_id`, `remove_aspect_by_id`, `update_cluster_details` in perspectives.
- 7 collection reads not named `get_by_project` (`get_span_annotations`, `get_span_groups`, `get_by_sdoc`, …); `get_span_groups` exists twice with two meanings (`span_annotation_endpoint.py:146`, `span_group_endpoint.py:55`).
- Bulk: `update_bulk` (sdoc metadata), `update_recommendations`, `update_codes_bulk`.
- `list_api_keys`, `get_project` / `update_project` / `delete_project`.
- Link handlers `add_to_span_group`, `link_tags_bulk`, `associate_user_to_project`.
- Computations: `filter_code_stats`, `code_frequencies`, `get_segment_texts`, `create_examples`.

**C-rule-13 (path parameters)**: `{view_id}` → `{search_view_id}`, `{user_id}` under `/virtual-users` → `{virtual_user_id}`, `{run_id}` → `{experiment_run_id}`, `{version_id}` → `{prompt_version_id}`, `{sdoc_metadata_id}` and `{cota_id}` are abbreviations of the allowed kind; list them in the rule.

**C-rule-14 (tags)**: 10 camelCase, 6 snake_case (`code_frequency`, …), `api-key`, `TagRecommendation`, `docprocessing`, `annoscaling` (prefix `/annotation-scaling`), `sdocMetadata` (next to `sourceDocument`). `systems/feature_system/feature_endpoint.py:24` sets `mcp` on one route. The generated service names change only for a few (`DocprocessingService`, `AnnoscalingService`, `SdocMetadataService`).

**C-rule-15 (request shape)** (sweep): 24 computations mix query scalars with body lists (e.g. `code_frequency_endpoint.py:45-48`, `statistics_endpoint.py:19-23`, `search_endpoint.py:74-83` with 8 query scalars while the other 8 searches take one body); `user_id` is a query parameter on 5 annotation creates; `core/auth/api_key_endpoint.py:33-34` creates from query parameters; `core/tag/tag_endpoint.py:180-182` takes three loose body lists while its sibling routes take a DTO; `/authentication/refresh_access` is the last snake_case path.

### C4. Routes without a caller in the frontend

Scripted: every method of `frontend/src/api/services` that no file outside the generated client references. 45 methods. `tools/` calls four `GET` routes only (codes, members, project metadata, document data), none of the list.

Not candidates (called without the client, or meant for other clients): `/`, `/heartbeat`, `/authentication/content` (nginx), `/authentication/oidc/*`, `/authentication/sync-session` (`core/auth/HandleOIDCLogin.ts:27`).

Kept by decision D2: `POST …/search-annotate/auto-annotate`, `GET …/jobs/cota-refinement`, `GET …/jobs/perspectives`.

Candidates, not served to MCP:

| Route                                                                              | Note                                                                                                                |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `GET …/prompts/versions/{version_id}`                                              | The suspect is right: no caller. Its service method `read_prompt_version` is a pass-through (D-svc-3). Delete both. |
| `GET …/rag/chat-session`                                                           | No caller (A7). A `GET` that calls the LLM. Delete.                                                                 |
| `GET …/word-frequencies?sdoc_id=`                                                  | No caller. Delete or keep as plain read.                                                                            |
| all 6 routes of `/span-groups`                                                     | No caller: span groups have no UI. Decide: planned feature or delete (with the 4 link routes below).                |
| `POST …/jobs/tag-recommendation/{job_id}/abort`, `/retry`                          | Generated with `EndpointGeneration.ALL`; harmless.                                                                  |
| `GET /{id}` of cota, experiments, aspects, prompts, timeline analyses, whiteboards | The frontend reads rows from the list cache. A plain read by id belongs to a REST API; keep.                        |

No caller in the frontend, but MCP tools (router tag `mcp`); keep unless the tool is unwanted:

- `GET /projects/{project_id}`, `GET /{id}` of codes, folders, tags, project metadata, document metadata.
- `GET …/sentence-annotations`, `PATCH` and `DELETE …/source-document-metadata/{sdoc_metadata_id}`, `DELETE …/source-documents/{sdoc_id}`.
- The 4 span group link routes of `/span-annotations/{span_annotation_id}/span-groups…`.
- `POST …/memos/suggest` (the LLM memo suggestion has no button in the UI).
- `POST …/search/{span,sentence,bbox}-annotations/groups`.
- `DELETE /users/me` (E12).

### C5. Conflicts with owner decisions

| Proposal                                                                                     | Decision it touches                                                                                  | For you to decide                                                                                                                           |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Delete unused routes (C4)                                                                    | D2: keep search-and-annotate and the two job lists.                                                  | I list them as kept. The new candidates (`chat-session`, prompt version read, word frequencies, span groups) were not part of D2.           |
| Rename `/search-annotate/auto-annotate` (C-rule-5)                                           | D2 keeps the route, not its name.                                                                    | Rename or leave; no caller breaks.                                                                                                          |
| One job start shape (E7 b)                                                                   | 2.3, approved: COTA starts at `…/{cota_id}/refine`, perspectives at `/jobs/perspectives?aspect_id=`. | My recommendation E7 (a) keeps 2.3 and moves only `aspect_id` into the body.                                                                |
| `/prompts/task-info`, `/prompts/default`, `/classifiers/info` are the same for every project | 2.2, approved: they stay under the project router.                                                   | No change proposed.                                                                                                                         |
| `GET /members` returns members and virtual users                                             | 2.4, approved.                                                                                       | Splitting the file (C-rule-1) keeps the behaviour. With `/virtual-users` as its own router, a `GET /virtual-users` would be the clean read. |
| Method by effect for actions (E4)                                                            | The binding method rule.                                                                             | (a) follows it. (b), `POST` for all actions, is what other APIs do and would break it.                                                      |
| 200 for creates (E8)                                                                         | None, but it differs from common REST (201).                                                         | Named so the difference is a decision, not an accident.                                                                                     |

### C6. Size per rule

Frontend callers were counted by script. Every generated method is called from one place (a `*Queries.ts` or `*Hooks.ts` file), so a moved route costs one frontend line plus `just update-api`. Backend tests call the routes by URL string.

| Rule                 | Routes    | Frontend lines                                                                     | Backend                                                                    | Size            |
| -------------------- | --------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------- |
| 1 router             | 19        | 13 (`PerspectivesService.` → two services), 6 (`UserService` split)                | 2 files split, 1 merged; test files follow (1 endpoint file = 1 test file) | medium          |
| 2 flat children      | 9         | 8                                                                                  | 3 new endpoint files; return types (D-dto-3); `PATH_IDS` entries           | medium          |
| 4 actions            | 11        | 10                                                                                 | method and path only                                                       | small           |
| 5 computations       | 20        | 19 (code frequency 2, statistics 0, doc processing 7, agreement 3, simsearch 2, …) | prefixes; doc processing moves into two routers                            | medium          |
| 6 read variants      | 4         | 4                                                                                  | one new filter each; `sentence-annotations` grouping in the frontend       | small           |
| 7 bulk               | 1         | 1                                                                                  |                                                                            | small           |
| 9 jobs               | 5         | 4                                                                                  | perspectives body DTO; three return types                                  | small           |
| 11 status codes      | 4         | 1                                                                                  | 3 exceptions, one `responses=`                                             | small           |
| 12 handler names (a) | ~35       | ~35 (one per method)                                                               | mechanical; MCP tool names change (`<tag>-<name>`, `bootstrap.py:369`)     | medium          |
| 13 path parameters   | 9         | ~9                                                                                 | `PATH_IDS` keys                                                            | small           |
| 14 tags              | ~12 files | imports of 3 renamed services                                                      |                                                                            | small           |
| 15 request shape     | ~36       | ~36                                                                                | new body DTOs                                                              | large; can wait |
| typos (E14)          | 4         | 3                                                                                  |                                                                            | small           |

Rules 1, 2, 4, 5, 6, 7, 9, 11, 13, 14 and the typos together: about 55 distinct routes, 70 frontend lines, one PR.

---

## Part D: consistency across modules

Rule first, then the deviations. Counts are from the sweeps; I re-read the items that the overview lists.

### D-endpoint: anatomy of endpoint files (`backend-endpoint.instructions.md`)

| #   | Rule                                           | Conform                   | Deviations and fix                                                                                                                                                                                                                                                                                                                                                                         |
| --- | ---------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Section headers, in order                      | 36 of 45 files            | No header: `auth`, `info`, `search` (14 routes), `annoscaling`, `search_annotate`, `simsearch`, `statistics`. 10 routes in the wrong section, e.g. `doc_processing_endpoint.py:39` (`POST /search` under read), `prompt_endpoint.py:81,95` (computations under create), `feature_endpoint.py:37,60,81`. Fix: move; add headers.                                                            |
| 2   | `response_model` and `summary`                 | 228 and 234 of 239        | Missing in `auth`, `info`, `api_key_endpoint.py:91`, `annoscaling_endpoint.py:24`. Wrong text: `annoscaling:50` ("Suggest annotations" on confirm), `code_frequency:16,39` (same text, about document ids), `tag_recommendation_endpoint.py:29` (describes `is_accepted`, which no longer exists).                                                                                         |
| 3   | Mutations emit; payload is the returned value  | 103 of 103 emit           | Payload differs from the return in `experiment_endpoint.py:65-71`, `feature_endpoint.py:56-57,98-99`, `perspectives_job_endpoint.py:72-78`. Per-item events in a loop: `experiment:148,225`, `source_document_endpoint.py:230`. State-changing `POST` without emit: `memo:180`, `perspectives:409,444`, `cota:223` (C-rule-4 fixes three of them).                                         |
| 4   | Mutation returns the mutated object's read DTO | about 80 of 103           | The parent instead of the child: `prompt:56-78`, `experiment:46-71,109-126,182-204`. Post-state lists: `user:87,144`, the four tag link routes. `SpanAnnotationDeleted` for span deletes only. 6 deletes build the DTO after the delete call (`span_group:137`, `cota:214`, `timeline_analysis:169`, `whiteboard:161`, `me:88`, `perspectives:264`); the instruction says snapshot before. |
| 5   | Thin body                                      | 27 files                  | `perspectives_endpoint.py:274-382` (109-line helper), `:484-524` (numpy in the route), `perspectives_job_endpoint.py:31-78`, `import_endpoint.py:76-127`, `api_key_endpoint.py:30-66`, `user_endpoint.py:92-114`. `PerspectivesService` is job-only, so the routes hold the logic. Fix: move into services.                                                                                |
| 6   | Own-folder DTO imports                         | 37 files                  | 8 files (`search`, `me`, `user`, `auth`, `info`, `doc_processing`, `annoscaling`, `perspectives_job`). `lint/check_endpoints.py` still does not run in `just lint`.                                                                                                                                                                                                                        |
| 7   | Current user                                   | `AuthzUser` in most files | `Depends(get_current_user)` in `api_key_endpoint.py:35,80,99`, `project_endpoint.py:35`, `me_endpoint.py:26` next to `AuthzUser` in `me:38,56,78`. One way.                                                                                                                                                                                                                                |
| 8   | Unused parameter                               |                           | `word_frequency_endpoint.py:97`: `sorts` is accepted by the export and not used.                                                                                                                                                                                                                                                                                                           |

### D-crud: CRUDs (`backend-crud.instructions.md`)

1. **Base class**: 26 of 26 `(project_id, id)` tables on `ProjectCRUDBase`. The four reference-keyed CRUDs (`document_aspect`, `document_cluster`, `word_frequency`, `sourcedocumentstepstatus`) are on `SQLCRUDBase` with key tuples, so their base methods hide the project in the tuple and their create DTOs carry `project_id`, the only ones that do. Documented as a variation. A read of them is skipped by the twin CRUD test. Proposed: leave, and say in the DTO instruction that these three create DTOs are the exception (line "never `project_id`" contradicts them).
2. **Naming families** (sweep): `read_by_name_and_project` (`code_crud.py:129`, `folder_crud.py:70`, `tag_crud.py:41`) next to `read_by_name` with `project_id` (`span_group_crud.py:60`, `source_document_crud.py:124`); `project_id` not first in 4 methods; `_batch` (2) and `multiple` (2) next to `_multi`; `set_labels2` (`document_cluster_crud.py:174`); `add_evaluation` creates a row although `add` is for links. Fix: `read_by_name`, `_multi`, one name.
3. **Dead**: `project_metadata_crud.py:184` (`exists_by_project_and_key_and_metatype_and_doctype`) and `source_document_metadata_crud.py:104` (`read_by_project`) have no caller (I checked by grep). `span_annotation_crud.py:142` `read_by_user_and_sdoc` duplicates `read_by_user(..., sdoc_id=)` at `:165` and has one caller.
4. **Single-caller SQL**: about 20 public CRUD methods are called by one service of the same module, e.g. four of `span_group_crud.py`, all of `document_aspect_crud.py`, `search_view_crud.py:24`. By your rule they would live privately in the service. The reverse also exists: `keyword_statistics_service.py:29-48` and `doc_processing_service.py:194` hold generic reads; `prompt_service.py:506-534` and `code_frequency_service.py:296-297` read codes and tags through `project.codes` instead of `crud_code.read_by_project`. No fence is proposed; move when touching the file.
5. **Bare `Exception`**: `core/auth/refresh_token_crud.py:21`.

### D-svc: services (`backend-service.instructions.md`)

1. **Signature**: three styles for the same thing: `(self, db, *, project_id, …)` in 36 methods, `(self, *, db, project_id, …)` in 59, all positional in 44; four files mix them. The template shows two of them. Fix: state one (the keyword-only majority) in the instruction.
2. **Project derived from a row**: `core/doc/source_document_service.py:45-51` (has `project_id`, passes `sdoc.project_id`), `core/memo/memo_generation_service.py:57`, private helpers in experiment and timeline analysis.
3. **Pass-through**: `core/prompt/prompt_service.py:227` (`read_prompts_by_project`) and `:233` (`read_prompt_version`) only call one CRUD read and validate. Fix: the endpoint calls the CRUD.
4. **Public method returns ORM objects**: `core/memo/memo_service.py:35` (`read_attached_object`).
5. **Pre-checks of body ids** exist where no foreign key holds the id (experiment, prompt selections), with the reason stated in one of the two. Fine; it is the 404 half of E9.
6. No service re-checks membership or a feature (39 of 39).

### D-dto: DTOs (`backend-dto.instructions.md`)

1. **Names**: `COTACreate/Read/…` for `ConceptOverTimeAnalysisORM`; bases named `…Base` instead of `…BaseDTO` in 5 files; `ClassifierRead(ClassifierCreate)`; `SourceDocumentMetadataUpdate` derives from the base DTO; two inheritance styles for `CreateIntern` (4 from `Create`, 9 from the base).
2. **`project_id` in a request**: no API create or update body carries it. `modules/tag_recommendation/tag_recommendation_dto.py:11` redeclares the field of `JobInputBase`.
3. **Read DTOs without `project_id`**: `PromptVersionRead` (`core/prompt/prompt_dto.py:195`), `ExperimentRunRead` (`modules/experiment/experiment_run_dto.py:88`), `WordFrequencyRead`. All other 27 have it. They travel inside a parent that has it today; a flat child route (E3 a) returns them alone, then they need it.
4. **Dead classes**: `SpanAnnotationSpanGroupLink` (`core/annotation/span_group_dto.py:52`), `SpanTextRead` (`span_text_dto.py:15`), `SourceDocumentTagLink` (`core/tag/tag_dto.py:50`), `ClassifierDataset` (`modules/classifier/classifier_dto.py:124`).
5. **Typos**: `AnnoscalingSuggest.reject_cide_id` (the confirm DTO has `reject_code_id`), `PerspectivesDoc.in_searchresult`.

### D-tests: project-isolation tests (`backend-tests.instructions.md`)

1. **Coverage per module** (sweep, by test names): 43 of 45 endpoint files have a test file; `import_endpoint.py` has none and no test calls `/jobs/import` over HTTP. A module test is missing although the route takes the id: span annotations (body, filter; the generic file covers them), search views (path id), `PATCH /codes/bulk` and `/folders/bulk` (body), experiment runs (path id), classifier job start (body), perspectives labels (body), annotation scaling. `llm_assistant/test_llm_assistant_job_endpoint.py` tests generated job routes, so two test files cover `job_endpoint.py`.
2. **Words and fixtures**: `another_project` in 100 test names, `other_project` in 17, `foreign` in 16. `foreign` means "the user is a member of both" in 6 modules and "the user is no member" in 2; `other_project` likewise; memo uses both words with opposite meanings. The same fixture is `tenants` in 14 conftests and `two_tenants` in 7; 16 modules build their own second project although the instruction names `create_two_tenants`. Fix: one word per case (`foreign` = member of both, `outsider` = no member), one fixture name.
3. **Status for a foreign body id**: 409 in 17 tests, 404 in about 15 modules, 400 in `search_view` reorder, 200 with no effect for tag unlink and `doc-processing/retry`. `timeline_analysis/test_timeline_analysis_endpoint.py:132-149` asserts 200 for a foreign `date_metadata_id` and the id is stored, while COTA answers 404 for the same kind of field. Fix: E9, and make timeline analysis answer 404 like COTA.
4. **Tests that can pass for the wrong reason**: `llm_assistant/test_llm_assistant_job_endpoint.py:862` (`in (400, 404)`), `classifier/test_classifier_endpoint.py:208` (`in (403, 404)`), `search_annotate/test_search_annotate_endpoint.py:29` (an empty project, no id). `statistics/test_statistics_endpoint.py:43` and `tag/test_tag_endpoint.py:570,633` send several foreign ids at once, so a route that scopes only one of them passes.
5. **Stale block headers** in the reference file and others: `agreement/test_agreement_endpoint.py:705,821` (`export_counts`, `segment_texts`), `code/test_code_endpoint.py:336,367`, `search/test_search_endpoint.py:3250`.

### D-fe: frontend query hooks and key factories (`frontend-api.instructions.md`)

1. **Key shape**: conform except the job keys (A1), `tableInfoQueries.byDomain` / `timeline` (`core/filter/api/tableInfoQueries.ts:21,23`: not `as const`, no `Scope` name, project second), `searchViewQueries.byProject(entityType, projectId)` (`core/workspace/api/searchViewQueries.ts:30-32`), `folderQueries.byProject(projectId, folderType)`. Fix: rename to the rule, or write the job shape into the "project first" rule.
2. **`projectScope` parameter**: `number` in 15 factories, `number | null | undefined` in 10, `number | undefined` in 5; the skip check is `=== undefined` in 8 leaves and `!projectId` elsewhere. One type, one check.
3. **Where the project comes from**: Redux in 9 hook modules (12 selectors), an argument in 7, a feature slice in 1, the route in 0; mixed inside memo, perspectives, classifier. The known follow-up; the instruction should state the target.
4. **Two project sources in one optimistic mutation**: the request uses `variables.projectId`, the cache key the row's `project_id` (`spanAnnotationHooks.ts:42` vs `:54`, same in bbox and sentence).
5. **Dead and missing**: `memoHooks.ts:77-86` (`useGetObjectMemos`) and `perspectivesHooks.ts:53` (`useUpdateAspect`) have no caller. `sentenceAnnotationHooks.ts:198` (`useDeleteBulkSentenceAnnotationSingleSdoc`) has no `datsEvent`, its sibling at `:188` has; `exportHooks.ts:5-13` and `duplicateFinderHooks.ts:5-12` start jobs without `datsEvent: "JOB_UPDATED"` (6 other job starts have it).
6. **Names of bulk hooks**: four forms (`useUpdateBulkTag`, `useUpdateMemos`, `useUpdateFoldersBulk`, `useBulkLinkTags`).
7. **`brain.ts:729-731`**: the `default` case only warns. `frontend/src/api/cache-sync/README.md:94-96` promises a compile error for an unhandled event. All 84 events have a case today. Fix: the `never` check that `jobCacheUtils.ts:97` already has.
8. **`byProject` keys are prefixes**: invalidating `tagQueries.byProject(id)` also refetches every other tag key of the project (`memoCacheUtils.ts:52`, `jobCacheUtils.ts:141,159,171,259`). Inside the project, so only extra requests.

### D-docs: instructions and READMEs that no longer describe the code

| #   | Where                                                                                                           | Says                                                                                                            | Real                                                                                                               |
| --- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1   | `.github/instructions/backend-endpoint.instructions.md:24,29,71,105`, `backend-module.instructions.md:32,35`    | `FEATURE = register_feature(…)`, `feature=FEATURE`                                                              | 12 of 12 features are named after themselves: `WORD_FREQUENCY`, `RAG_CHAT`, … (`word_frequency_endpoint.py:15-16`) |
| 2   | `backend-endpoint.instructions.md:48`, `cota_endpoint.py:227`                                                   | "read the job at /jobs/<job-type>"                                                                              | `/projects/{project_id}/jobs/<job-type>/{job_id}`                                                                  |
| 3   | `backend-service.instructions.md:76`                                                                            | "keyword arguments (`db=db, id=..., create_dto=...`)"                                                           | `project_id` is missing; the last id-only template                                                                 |
| 4   | `backend-tests.instructions.md:128`                                                                             | a foreign body id "is rejected (409)"                                                                           | 409, 404, 400, 200 (D-tests-3)                                                                                     |
| 5   | `backend-tests.instructions.md` (whole file)                                                                    | nothing about `endpoints/project_router/`                                                                       | a new route needs entries in `PATH_IDS`, `BODIES`, `QUERIES`, `ARGUMENTS`; a new table a row in `TenantRows`       |
| 6   | `backend-tests.instructions.md:95`; `systems/search_system/README.md:306,308`                                   | `Page[MemoRow]`; `Page[MemoSummary]`                                                                            | `Page[MemoRead]`                                                                                                   |
| 7   | `backend/src/modules/perspectives/README.md:51`                                                                 | "`sdoc_id`, `aspect_id`: Composite Primary Key"                                                                 | `(project_id, sdoc_id, aspect_id)` (`document_aspect_orm.py:47-49`); contradicts ADR 0013                          |
| 8   | `modules/perspectives/README.md:105-108`, `modules/llm_assistant/README.md:105-108`, `core/prompt/README.md:16` | routes without `/projects/{project_id}`                                                                         | all under the project                                                                                              |
| 9   | `backend-crud.instructions.md` template                                                                         | `read_by_name`, `update_with_children`, `delete_by_sdoc`, `exists_by_name` in `code_crud.py`; `exists_favorite` | `read_by_name_and_project` (`code_crud.py:129`); the other names do not exist                                      |
| 10  | `backend-dto.instructions.md` ("Create: never `project_id`")                                                    |                                                                                                                 | three reference-keyed create DTOs carry it (D-crud-1)                                                              |
| 11  | `backend-orm.instructions.md` whiteboard template                                                               | a unique constraint on `(project_id, title)`                                                                    | `whiteboard_orm.py:53` has none                                                                                    |
| 12  | `frontend-slice.instructions.md:34-63`                                                                          | a persisted slice without `projectId`, reset without a check                                                    | `sentenceSearchSlice.ts:9,41-48` stores it and compares                                                            |
| 13  | `frontend-api.instructions.md:91-93`                                                                            | every key `as const`, `Scope` names, `byProject` is `projectScope`                                              | D-fe-1                                                                                                             |
| 14  | `frontend/src/api/cache-sync/README.md:41,54-57,94-96,103,105`                                                  | `CodeService.create`, explicit `onSuccess` hooks, `never` check, `upsertListItem`, `writeJobUpdate`             | `createCode`, `meta.datsEvent`, no check, `appendListItem` / `replaceListItem`, `handleJobUpdate`                  |
| 15  | `frontend/src/features/perspectives/README.md:29-40`                                                            | key leaves without the project                                                                                  | all take `projectId` first                                                                                         |
| 16  | `findings.md` 3.3 and section 4                                                                                 |                                                                                                                 | A7                                                                                                                 |

`tools/project_doctor` is mentioned in no backend doc, instruction or test (grep `doctor`: only `docs/admin/project-doctor.md`, `AGENTS.md:31`, `tools/project_doctor/README.md`). No instruction or README names a removed function (`require_feature`, `assert_in_same_project_as`, `emit_dtos_to_projects`, `Crud`, `createDocTag`: 0 hits).

### D-goals: the refactor against its goals

| Goal                         | Assessment                                                                                                                                                                                         |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Preventing future mistakes   | **Reached.** The default read is scoped, Postgres rejects cross-project references, the generic tests force every new route and table into their tables, and the twin tests catch a leak.          |
| One place per rule           | **Reached** for membership, feature gating and the key rule (ADR 0013). Not for the status of a foreign body id (E9) and for where the frontend takes its project from.                            |
| Less code, fewer concepts    | **Reached** in endpoints and services (the hand-written checks are gone). New concepts that stay: the reference-keyed CRUDs with key tuples, two job start shapes, three service signature styles. |
| Predictability               | **Partly.** A resource route is predictable (`/codes`, `/tags`, `/memos` are alike). Computation routers, child resources, action methods and handler names are not (Part C).                      |
| Consistency                  | **Partly.** Schema, ORM and CRUD bases: consistent. Naming of CRUD methods, DTOs, handlers, hooks, tests and tags: several families each (Part D).                                                 |
| Readability, maintainability | **Reached** for the core modules. `perspectives_endpoint.py` (business logic in routes) and `doc_processing` (six routes of three kinds under one name) are the weak spots.                        |
| Guidance matches the code    | **Mostly.** The big contradictions are gone. 16 smaller places are left (D-docs), three of them teach wrong code.                                                                                  |

## Not checked

- The full backend suite and CI of `5ea880880`; I ran two test files.
- The migration on production data (D1), lock time and disk use.
- Nothing was clicked in a browser; A6 is reasoned from the code.
- Sweep results I did not re-read are marked "(sweep)". The "missing test" entries of D-tests-1 rest on test names.
- `tools/` beyond its HTTP calls, `docs/` beyond route names, `ray/`, the agentic workflows.
- Whether the proposed route names collide with planned features; names with "low" confidence in C3 are suggestions only.
