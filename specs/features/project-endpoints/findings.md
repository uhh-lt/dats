# Project endpoints (#928): findings

Collected from the final reports and PR descriptions of all sub-sessions of the #927/#928 stack (PRs #941 to #955).
Items that a later PR of the stack solved are not listed. Each item says where it comes from and whether it was checked against the top of the stack. Items the review fixes (#956) solved are kept and marked **Done in #956**.

Status on 2026-11-26: 16 PRs open and stacked (#941 to #956), nothing merged. Every endpoint file is converted; `auth`, `info` and `websocket` belong to no project and stay.

## 0. What the owner needs to review, check or decide

Read this section first. Everything below it is the record. Status: the review fixes are in #956 (one PR on top of #955); the second review (`review-2.md`) ran on that tip, and its agreed points are fixed in one PR on top of #956 (the second review fixes).

### Decided by the owner

| #   | Question                                                                                                 | Answer                                                                             |
| --- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| D1  | Run the migration on a copy of the production data before the merge?                                     | The owner runs the migration test before the deployment; it is in the roadmap.     |
| D2  | Routes without a caller in the frontend (search-and-annotate, the two unused job lists): keep or delete? | Keep the routes.                                                                   |
| D3  | Any member may update or delete the project and manage members.                                          | By design: every member is admin within a project.                                 |
| D4  | File issues for the bugs seen in passing?                                                                | No issues; only "span texts are never deleted" is a bug, and it is on the roadmap. |
| D5  | Old clients that still send `project_id` in a job start body: accept, or forbid extra fields?            | Unknown fields are forbidden (422). Done in the second review fixes.               |
| D6  | How to merge?                                                                                            | One merge of the whole stack in the end; the PRs stay open for review.             |

### To review (new or changed by the review fixes, #956)

| #   | What                                                                                                                                                                                                                           | Why it needs your eyes                                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| R1  | ADR 0013 (`specs/adr/0013-rows-are-identified-by-project-and-id.md`).                                                                                                                                                          | It records the id decision for good.                                                 |
| R2  | 10 primary keys and 6 unique constraints that still left out `project_id` now start with it (link tables, `documentaspect`, `wordfrequency`, `sourcedocumentstepstatus`, `memorecent`, ...). This supersedes decision 2.11.    | Not asked for in the brief; it follows from the id decision and changes more tables. |
| R3  | One migration `7f1bbe0f69d7` replaces the 12 revisions of the stack. A dev database on an old revision of the stack must be reset (steps in the description of #956).                                                          | It is the migration production will run.                                             |
| R4  | Two behaviour fixes found by the new tests: COTA answers 404 for an unknown sentence (was 500) and checks its date metadata; a similarity search whose filter matches no document returns nothing (it searched all documents). | Behaviour changes outside the brief.                                                 |
| R5  | The three changed decisions as built: job start bodies (2.6), one router per endpoint file with `me_endpoint.py` and `GET /info/features` (2.8), file owners by ORM class (2.9).                                               | You decided them; check that the result is what you meant.                           |

### To check (not verified yet)

| #   | What                                                                                                                                                                                                                                          |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | CI of #956 on its final tip. **Answered by the second review:** the failed first frontend check was the runner (the worker container exited 3.5 s after its start, before any migration or step of #956 could run; the rerun was healthy).    |
| C2  | Hand-written joins that still compare one id column. **Answered by the second review:** all are safe (table in `review-2.md` 4, C2); the six annotation search queries now also filter `<Anno>ORM.project_id` directly (second review fixes). |
| C3  | The agentic workflows (overview, documentation, review) failed on every PR during a model outage and were restarted on #941 to #955 on 2026-11-26. Their comments are not read yet.                                                           |
| C4  | The UI paths nobody clicked (list in section 6).                                                                                                                                                                                              |
| C5  | A test helper finds a document's project by its id alone (it fails loudly if the id exists twice). The tests that sent `project_id` in job start bodies no longer do (second review fixes).                                                   |

### Second review (`review-2.md`): status after the second review fixes

| Point                                                      | Status                                                                                                                                               |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| N1 the twin tests cannot fail                              | Fixed: baseline of project A before the twin, POST read routes and custom reads added, mutation-checked.                                             |
| N2 the frontend cache identifies rows by id alone          | Fixed: every project-owned query key is `[entity, "project", projectId, ...]`, cache-sync writes per project.                                        |
| N3 instructions that teach id-only code                    | Fixed: service, CRUD, DTO, endpoint and frontend-api instructions, job, artefact and search READMEs.                                                 |
| N4 dead code                                               | Fixed: deleted with its test lines.                                                                                                                  |
| M-a migration drops constraints by name, never run on prod | Open: the owner runs it before the deployment (D1).                                                                                                  |
| 1 annotation searches without a direct project filter      | Fixed.                                                                                                                                               |
| 2 backfill doubles the tables on disk                      | Open: check the disk headroom in the dry run (D1).                                                                                                   |
| 3 the downgrade fails once two projects share an id        | Open: deploy note, the way back is a restore.                                                                                                        |
| 4 a metadata id of another project in a search filter: 500 | Fixed: 404.                                                                                                                                          |
| 5 RAG chat session found by its uuid alone                 | Fixed: a session of another project or user answers 404.                                                                                             |
| 6 perspectives `cluster_id` not checked against the aspect | Open (same project only).                                                                                                                            |
| 7 outer and inner `export_job_type` may disagree           | Open.                                                                                                                                                |
| 8 user-id filters, `only_if_finished`, crawler URLs        | Open (pre-existing).                                                                                                                                 |
| 9 the positive control accepts 500 and 422                 | Fixed: 2xx required, exceptions listed in the test.                                                                                                  |
| 10 unknown fields in job start bodies                      | Fixed (D5): 422.                                                                                                                                     |
| 11 persisted slices carry row ids across projects          | Fixed.                                                                                                                                               |
| 12 47 reads of `state.project.projectId`                   | Open: follow-up below.                                                                                                                               |
| 13 Enter in the created API key may submit again           | Open.                                                                                                                                                |
| 14 pass-through retry validator, needless `TYPE_CHECKING`  | Fixed.                                                                                                                                               |
| New: a metadata filter or sort in a search answered 500    | Fixed: the metadata join grouped by `metadata.id`, which no longer determines the value since the key is `(project_id, id)`; found by the test of 4. |

### Open follow-ups

- The frontend reads the project id from Redux (`state.project.projectId`) in 47 places instead of from the route; issue to be filed.

## 1. Bugs seen in passing (not caused by the stack)

| #   | Finding                                                                                                                                                        | Source     | Checked                                                                                                                                                                  |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1.1 | One click on "Create API key" sends the `PUT` twice (`ApiKeyCreateDialog.tsx`).                                                                                | #954       | **Done in #956:** the dialog's two views shared DOM elements, so the click on Close became a submit. One click sends one `PUT` now.                                      |
| 1.2 | A change made through the API does not reach the same user's open page (seen on the COTA page); a reload is needed.                                            | #950       | By design: `WebsocketEmitter` excludes the acting user (`_actor_exclusion`). It only matters when the same user works in two tabs or through the API and the UI at once. |
| 1.3 | Nested `<button>` warning in the memo list card (console).                                                                                                     | #947, #953 | Not investigated.                                                                                                                                                        |
| 1.4 | A perspectives map with three documents fails in UMAP.                                                                                                         | #951       | Existing limitation, no guard or error message.                                                                                                                          |
| 1.5 | The shared test fixture's aspect and cluster rows miss settings and coordinates that the read schemas require; the perspectives tests fill them in themselves. | #951       | Test data debt.                                                                                                                                                          |
| 1.6 | The two tests of `feature/test_feature_activation_e2e.py` need spaCy on Ray; they cannot run when the shared services are down.                                | #954       | Open.                                                                                                                                                                    |

## 2. Decisions the sessions made on their own

Approved by the owner on 2026-11-26; 2.6, 2.8, 2.9 and 2.11 were changed afterwards by the review fixes (#956), as noted.

| #    | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Source           |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 2.1  | `GET /rag/models` moved to `GET /info/llms`: it belongs to no project and five other features use it.                                                                                                                                                                                                                                                                                                                                                         | #952             |
| 2.2  | Settings-only routes that return the same data for every project still sit under the project router: `…/classifiers/info`, `…/prompts/task-info`, `…/prompts/default` (one router per file).                                                                                                                                                                                                                                                                  | #952             |
| 2.3  | Two job starts are shaped differently: COTA uses `POST …/concept-over-time-analyses/{cota_id}/refine`, perspectives uses `POST …/jobs/perspectives?aspect_id=`.                                                                                                                                                                                                                                                                                               | #950, #951       |
| 2.4  | `GET …/members` returns the members followed by the virtual users, because the frontend's user lookups depend on it. The name says "members" only.                                                                                                                                                                                                                                                                                                            | #954             |
| 2.5  | Any member may update or delete the project and add or remove members. This is unchanged from before; there never was a stricter check.                                                                                                                                                                                                                                                                                                                       | #954             |
| 2.6  | Starting a job with another project in the body silently starts it in the project of the path. The job input still requires `project_id`, so the frontend keeps sending it. **Done in #956:** job start bodies are generated `<JobName>JobStart` models without `project_id`; the route builds the input in the project of the path.                                                                                                                          | #948             |
| 2.7  | Generated job routes check the feature only in `validate_input` (workers never pass the router), not through `project_router(feature=)`.                                                                                                                                                                                                                                                                                                                      | #948, #955       |
| 2.8  | Three files with routes inside and outside projects (`project`, `user`/`api_key`, `feature`) use a router without prefix that includes a `project_router`. A prefix or tag on both gets doubled; the pattern is documented in the endpoint instruction. **Done in #956:** one router per file: `me_endpoint.py` (`/users/me`), `user_endpoint.py` (project users), `GET /info/features`; only `project_endpoint.py` keeps `PUT /projects` on a second router. | #954             |
| 2.9  | The `Crud` enum stays with three members (`ASPECT`, `CLASSIFIER`, `SOURCE_DOCUMENT`) as dispatch key of the file CRUDs. **Done in #956:** the `Crud` enum is deleted; file CRUDs name their `owner` ORM class (`delete_by_owner`).                                                                                                                                                                                                                            | #955             |
| 2.10 | `Job.get_project_id()` stays as accessor of the job's meta.                                                                                                                                                                                                                                                                                                                                                                                                   | #955             |
| 2.11 | Tables keyed without `id` keep their keys: `sourcedocumentstepstatus` `(sdoc_id, step)`, `documentaspect`, `documentcluster`. Their reads are reached through an object read within the project. **Done in #956:** superseded: every key of a project-owned table starts with `project_id` (ADR 0013).                                                                                                                                                        | #946, #951, #955 |
| 2.12 | The test `test_migrate_assistant_users_to_virtual_users.py` was removed: the old migration it runs inserts handles without a project, which the new schema rejects.                                                                                                                                                                                                                                                                                           | #941             |
| 2.13 | User and memo object handles are gone (`AttachedObjectType` has neither); nothing created them any more.                                                                                                                                                                                                                                                                                                                                                      | #941             |

## 3. Routes and code without a caller

| #   | Finding                                                                                                                  | Source       | Checked                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------ | ------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| 3.1 | The frontend never calls the search-and-annotate route.                                                                  | #954 comment | Open: only the generated client refers to it.                                                                                |
| 3.2 | `GET …/jobs/cota-refinement` and `GET …/jobs/perspectives` (project job lists) are generated but unused by the frontend. | #948         | Open.                                                                                                                        |
| 3.3 | `GET …/rag/chat-session` was reported as unused.                                                                         | #952         | Wrong: the perspectives analysis assistant uses the chat session. Dropped as a finding, kept here so it is not raised again. |

## 4. Behaviour changes of the API (all intended, listed for the release notes)

- An id of another project in the path answers 404 (was 403, sometimes 400).
- An id of another project in the body of a write answers 409 from the foreign key (was 403/400/404).
- An id of another project as a filter matches nothing (was 403 or 404).
- A job of another project, or a job id under the wrong job type, answers 404.
- Reading a document's metadata by key is a filter now: a missing key returns an empty list (was 404).
- A document that exists in no project answers 409 in annotation and span group creates.
- Memos: `attached_object_id` without `attached_object_type` answers 400; attaching to another project answers 404.
- The tag recommendation results of a job that expired from Redis answer 404.
- Removing a user who is no member answers 404 (was 500).
- `/user/all`, `/user/by_id`, the old span group per-document routes and the per-user tag count route are gone.
- The four search `*_info` routes are `GET` now.
- In the generated client all job methods live on `JobService`.
- The MCP search tools keep their names but take `project_id` as a path argument.

## 5. Bugs fixed inside the stack (for the record)

- #903: span groups per document and user (#943).
- Code occurrences answered 500; code frequencies kept only the last of the span, sentence and box counts; a date field without values made the timeline fail (#949, #950).
- Code frequency, document sampler, tag statistics, timeline date range and COTA dates could pull in data of another project through a foreign id; they count only the project of the path now (#949, #950).
- Memo search read span groups by name across all projects (#943).
- Creating an annotation on a document of another project, when the user already had an annotation document there, crashed with 500; it answers 409 now (#945).
- The downgrade of the stack failed once the unique constraints were dropped; found by the migration tests and fixed (#955).

## 6. Tests and checks: what was not covered

- **Full backend suite**: sessions ran targeted tests only. CI ran the full suite on each PR. #944 and #945 are red on their own because their importer step calls an old tag route; the fix is in #946. This only matters if the PRs are merged one by one.
- **CI of the top**: #953, #954 and #955 are green. #956: see C1 in section 0.
- **Importer**: never run locally on the CI test data (needs `TESTDATA_PASSWORD`); always on small own samples. CI runs the real step.
- **Alembic downgrades**: never run by hand on a dev database (no `just` recipe). The migration tests downgrade to the revision before #941 and upgrade back, and pass at #955 and with the single migration of #956.
- **Production data**: the migration (one revision since #956) was not run on a copy of the production data (the issue's "Done when" asks for it). Local run with production row counts: 19 s; expect a few minutes on production. The later key swaps rewrite no rows. Deploy note: stop the stack; the migrations run when the backend starts.
- **Generic tests**: the foreign-id test reads routes as declared, not as mounted, so it misses a wrongly added prefix; only the non-member test catches that. **Done in #956:** the test has a positive control, and a second test pins the routes outside `/projects/{project_id}`.
- **Browser, never clicked in any session**: bulk delete on the annotation analysis pages; whiteboard nodes, edges and memo nodes; the classifier count step; the LLM memo suggestion; the multi-document tag menu; "apply tags" of tag recommendations; the health view; image and audio documents; folder drag and drop; project metadata in the settings; job abort and retry; COTA job results; experiment runs; annotation scaling; document sampler; exports and memo import/export; deleting a project; updating the own profile.

## 7. Code that relies on globally unique ids (fixed in #956)

Decision of the owner (2026-11-26): ids are unique per project and will not stay globally unique. A row is identified by `(project_id, id)` everywhere, so id-only matching is a bug, not a simplification. See S1 and S2 of `review.md`.

- All relationships over composite foreign keys join on the id column only. They must join on `(project_id, id)` and write only the id column.
- `crud_span_anno.read_by_user_and_sdoc` and other custom CRUD reads take no `project_id`.
- The hand-written joins of the annotation searches, analyses, classifier and perspectives queries join by plain id.
- The many-to-one loads cost one query per row since the key swap (identity map not used).
- Two primary keys carried pre-rename names (`documenttag_pkey`, `documenttagrecommendationlink_pkey`); all keys are to be named after their current tables.
- `lint/check_endpoints.py` still reports three existing violations (e.g. `search_endpoint.py` imports `core.memo.memo_dto`). Not made worse by the stack.

**Done in #956** (ADR 0013): relationships join on `(project_id, id)` and write the id column only; every key of a project-owned table starts with `project_id`; hand-written joins and reads match `project_id`; many-to-one loads come from the identity map again; the primary keys are named after their tables. Only `lint/check_endpoints.py` stays as it was. Still to check: C2 in section 0.

## 8. Process and tooling

- pyright misses calls made through dicts (and missed those through the `Crud` enum, deleted in #956), and `reportIncompatibleMethodOverride` is off; changed CRUD signatures need a grep for callers.
- The locked FastAPI no longer lists included routes in `app.routes`; the generic tests use `fastapi.routing.iter_route_contexts` (#942).
- The frontend's `AssertEqual` drift guards caught the removed `project_id` at once (#953).
- `cd .. && just …` from a worktree's root climbs to the main checkout's justfile (#944).
- Every DATS process checks Ray, the embedding provider and Docling at start, so an outage of the shared services stops tests, the dev API and CI even for code that never calls them (#953, #954).
- The three `agent` CI jobs (PR overview, documentation, review) failed on most PRs of the stack; the cause was an outage of their model provider. Restarted on #941 to #955 on 2026-11-26 (C3 in section 0).
- `backend_checks.yml` runs `tools/importer` before pytest; a tool that calls an old route hides all test results (#944).

## 9. Open from before the stack

- Span texts are never deleted: on the roadmap (D4).

## 10. Found by the review fixes (#956)

| #    | Finding                                                                                                                                                                                                      | Status                        |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| 10.1 | 10 primary keys and 6 unique constraints left out `project_id` and only worked while ids were globally unique.                                                                                               | Fixed (R2).                   |
| 10.2 | Query counts before and after the project-keyed joins: bulk metadata update with 9 values 13 to 5 queries, export of 29 spans 36 to 8. Many-to-one loads cost 0 extra queries, checked for 32 relationships. | Fixed, covered by tests.      |
| 10.3 | A twin project with the same ids in every table: no relationship, no CRUD read and none of the GET routes crosses projects (57 routes answer 200; the project and its members are not copied).               | Covered by tests.             |
| 10.4 | COTA answered 500 for an unknown sentence and did not check its date metadata; the similarity search searched all documents when its filter matched none.                                                    | Fixed (R4).                   |
| 10.5 | Old clients that send `project_id` in a job start body are not rejected.                                                                                                                                     | Fixed (D5): 422.              |
| 10.6 | A helper sub-agent of the fixing session stopped without committing; its work was taken over.                                                                                                                | Process note, no code effect. |
