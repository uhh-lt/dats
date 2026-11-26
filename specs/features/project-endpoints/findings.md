# Project endpoints (#928): findings

Collected from the final reports and PR descriptions of all sub-sessions of the #927/#928 stack (PRs #941 to #955).
Items that a later PR of the stack solved are not listed. Each item says where it comes from and whether it was checked against the top of the stack (`agentic/api-g8-cleanup-f7a5f1`, #955).

Status on 2026-11-26: 15 PRs open and stacked, nothing merged. Every endpoint file is converted; `auth`, `info` and `websocket` belong to no project and stay.

## 1. Bugs seen in passing (not fixed, not caused by the stack)

| #   | Finding                                                                                                                                                        | Source     | Checked                                                                                                                                                                  |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1.1 | One click on "Create API key" sends the `PUT` twice (`ApiKeyCreateDialog.tsx`).                                                                                | #954       | Not investigated. The dialog is a form with a submit button; the cause is not obvious from the code.                                                                     |
| 1.2 | A change made through the API does not reach the same user's open page (seen on the COTA page); a reload is needed.                                            | #950       | By design: `WebsocketEmitter` excludes the acting user (`_actor_exclusion`). It only matters when the same user works in two tabs or through the API and the UI at once. |
| 1.3 | Nested `<button>` warning in the memo list card (console).                                                                                                     | #947, #953 | Not investigated.                                                                                                                                                        |
| 1.4 | A perspectives map with three documents fails in UMAP.                                                                                                         | #951       | Existing limitation, no guard or error message.                                                                                                                          |
| 1.5 | The shared test fixture's aspect and cluster rows miss settings and coordinates that the read schemas require; the perspectives tests fill them in themselves. | #951       | Test data debt.                                                                                                                                                          |
| 1.6 | The two tests of `feature/test_feature_activation_e2e.py` need spaCy on Ray; they cannot run when the shared services are down.                                | #954       | Open.                                                                                                                                                                    |

## 2. Decisions the sessions made on their own

Approved by the owner on 2026-11-26, except 2.8 and 2.9, which are still to be discussed.

| #    | Decision                                                                                                                                                                                                                                                | Source           |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 2.1  | `GET /rag/models` moved to `GET /info/llms`: it belongs to no project and five other features use it.                                                                                                                                                   | #952             |
| 2.2  | Settings-only routes that return the same data for every project still sit under the project router: `…/classifiers/info`, `…/prompts/task-info`, `…/prompts/default` (one router per file).                                                            | #952             |
| 2.3  | Two job starts are shaped differently: COTA uses `POST …/concept-over-time-analyses/{cota_id}/refine`, perspectives uses `POST …/jobs/perspectives?aspect_id=`.                                                                                         | #950, #951       |
| 2.4  | `GET …/members` returns the members followed by the virtual users, because the frontend's user lookups depend on it. The name says "members" only.                                                                                                      | #954             |
| 2.5  | Any member may update or delete the project and add or remove members. This is unchanged from before; there never was a stricter check.                                                                                                                 | #954             |
| 2.6  | Starting a job with another project in the body silently starts it in the project of the path. The job input still requires `project_id`, so the frontend keeps sending it.                                                                             | #948             |
| 2.7  | Generated job routes check the feature only in `validate_input` (workers never pass the router), not through `project_router(feature=)`.                                                                                                                | #948, #955       |
| 2.8  | Three files with routes inside and outside projects (`project`, `user`/`api_key`, `feature`) use a router without prefix that includes a `project_router`. A prefix or tag on both gets doubled; the pattern is documented in the endpoint instruction. | #954             |
| 2.9  | The `Crud` enum stays with three members (`ASPECT`, `CLASSIFIER`, `SOURCE_DOCUMENT`) as dispatch key of the file CRUDs.                                                                                                                                 | #955             |
| 2.10 | `Job.get_project_id()` stays as accessor of the job's meta.                                                                                                                                                                                             | #955             |
| 2.11 | Tables keyed without `id` keep their keys: `sourcedocumentstepstatus` `(sdoc_id, step)`, `documentaspect`, `documentcluster`. Their reads are reached through an object read within the project.                                                        | #946, #951, #955 |
| 2.12 | The test `test_migrate_assistant_users_to_virtual_users.py` was removed: the old migration it runs inserts handles without a project, which the new schema rejects.                                                                                     | #941             |
| 2.13 | User and memo object handles are gone (`AttachedObjectType` has neither); nothing created them any more.                                                                                                                                                | #941             |

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
- **CI of the top**: backend checks of #953 (re-run after the outage), #954 and #955 were still running when this was written.
- **Importer**: never run locally on the CI test data (needs `TESTDATA_PASSWORD`); always on small own samples. CI runs the real step.
- **Alembic downgrades**: never run by hand on a dev database (no `just` recipe). The migration tests downgrade to the revision before #941 and upgrade back, and pass at #955.
- **Production data**: the #941 migration was not run on a copy of the production data (the issue's "Done when" asks for it). Local run with production row counts: 19 s; expect a few minutes on production. The later key swaps rewrite no rows. Deploy note: stop the stack; the migrations run when the backend starts.
- **Generic tests**: the foreign-id test reads routes as declared, not as mounted, so it misses a wrongly added prefix; only the non-member test catches that.
- **Browser, never clicked in any session**: bulk delete on the annotation analysis pages; whiteboard nodes, edges and memo nodes; the classifier count step; the LLM memo suggestion; the multi-document tag menu; "apply tags" of tag recommendations; the health view; image and audio documents; folder drag and drop; project metadata in the settings; job abort and retry; COTA job results; experiment runs; annotation scaling; document sampler; exports and memo import/export; deleting a project; updating the own profile.

## 7. Code that relies on globally unique ids (to fix)

Decision of the owner (2026-11-26): ids are unique per project and will not stay globally unique. A row is identified by `(project_id, id)` everywhere, so id-only matching is a bug, not a simplification. See S1 and S2 of `review.md`.

- All relationships over composite foreign keys join on the id column only. They must join on `(project_id, id)` and write only the id column.
- `crud_span_anno.read_by_user_and_sdoc` and other custom CRUD reads take no `project_id`.
- The hand-written joins of the annotation searches, analyses, classifier and perspectives queries join by plain id.
- The many-to-one loads cost one query per row since the key swap (identity map not used).
- Two primary keys carried pre-rename names (`documenttag_pkey`, `documenttagrecommendationlink_pkey`); all keys are to be named after their current tables.
- `lint/check_endpoints.py` still reports three existing violations (e.g. `search_endpoint.py` imports `core.memo.memo_dto`). Not made worse by the stack.

In work: session "review fixes" on top of #955 (project-keyed joins with tests and an ADR, one squashed migration, S3 to S7, the double `PUT` of 1.1).

## 8. Process and tooling

- pyright misses calls made through dicts or the `Crud` enum, and `reportIncompatibleMethodOverride` is off; changed CRUD signatures need a grep for callers.
- The locked FastAPI no longer lists included routes in `app.routes`; the generic tests use `fastapi.routing.iter_route_contexts` (#942).
- The frontend's `AssertEqual` drift guards caught the removed `project_id` at once (#953).
- `cd .. && just …` from a worktree's root climbs to the main checkout's justfile (#944).
- Every DATS process checks Ray, the embedding provider and Docling at start, so an outage of the shared services stops tests, the dev API and CI even for code that never calls them (#953, #954).
- The three `agent` CI jobs (PR overview, documentation, review) failed on most PRs of the stack; one session saw 503s from their model provider. Not looked into.
- `backend_checks.yml` runs `tools/importer` before pytest; a tool that calls an old route hides all test results (#944).

## 9. Open from before the stack

- Span texts are never deleted (no issue filed yet).
