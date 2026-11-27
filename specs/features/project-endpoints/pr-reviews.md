# Project endpoints (#928): comments of the PR reviewers

Collected from the pull requests of the stack (#941 to #956 and #973). Sources: the workflow "Agent PR Review" (posts one comment per PR), review comments of people or Copilot, and other PR comments that raise a concern. The comments of the documentation and overview workflows are left out; the documentation updates are in the stack (#973).

Each review looked at one PR at the commit named in it, not at the top of the stack. Later PRs may have fixed a finding.

## Overview

| PR   | Review workflow                     | Other reviews | Inline comments |
| ---- | ----------------------------------- | ------------- | --------------- |
| #941 | 1 finding(s)                        | 0             | 0               |
| #942 | no issues found                     | 0             | 0               |
| #943 | no issues found                     | 0             | 0               |
| #944 | 6 finding(s)                        | 0             | 0               |
| #945 | no review (workflow did not finish) | 0             | 0               |
| #946 | no review (workflow did not finish) | 0             | 0               |
| #947 | no issues found                     | 0             | 0               |
| #948 | no issues found                     | 0             | 0               |
| #949 | no issues found                     | 0             | 0               |
| #950 | no issues found                     | 0             | 0               |
| #951 | 3 finding(s)                        | 0             | 0               |
| #952 | 1 finding(s)                        | 0             | 0               |
| #953 | no issues found                     | 0             | 0               |
| #954 | no issues found                     | 0             | 0               |
| #955 | no issues found                     | 0             | 0               |
| #956 | no issues found                     | 0             | 0               |
| #973 | no issues found                     | 0             | 0               |

## #941 feat(db): key every project-owned table by its project (#927)

https://github.com/uhh-lt/dats/pull/941

Review workflow, 2026-11-26, on current head (https://github.com/uhh-lt/dats/pull/941#issuecomment-7196748454):

Reviewed commit: `d28541581e0d62dbbcb4c6eb9601e9e81e945f47`

**Summary**

This PR adds `project_id` and composite foreign keys across project-owned tables, updates ORM relationships and creation paths, and adds migration and cross-project integrity coverage. I reviewed the migration, ORM mappings, CRUD/service/DTO propagation, import/export paths, and tests.

**Findings**

- **F1** 🔴 `backend/src/migrations/alembic/versions/e9c943a5f56d_composite_keys_per_project.py:114-148`: The backfill leaves `project_id` NULL for legacy `objecthandle.user_id` rows, so enforcing NOT NULL rolls back the upgrade. This is a supported historical state: released migration `2bbc904aa055_virtual_users.py:189-194` inserts such handles for assistant-user memos. Although the current production pre-flight found none, older installations upgrading through that release can hit this. Handle these rows and their attached memos explicitly before enforcing the constraints and dropping `user_id`, and add an upgrade test covering that path.

## #942 feat(api): annotations under /projects/{project_id} (#928 pilot)

https://github.com/uhh-lt/dats/pull/942

Review workflow, 2026-11-26, on current head (https://github.com/uhh-lt/dats/pull/942#issuecomment-7204926260):

Reviewed commit: `708df75deadae6300d68244e5cd37cc470d80ab5`

No issues found. ✅

## #943 feat(api): span groups and annotation documents under /projects/{project_id} (#928)

https://github.com/uhh-lt/dats/pull/943

Review workflow, 2026-11-26, on current head (https://github.com/uhh-lt/dats/pull/943#issuecomment-7205522925):

Reviewed commit: `09fa1622ce44cc94cb5e6661c98d86c00c77c517`

No issues found. ✅

## #944 feat(api): codes and tags under /projects/{project_id} (#928)

https://github.com/uhh-lt/dats/pull/944

Review workflow, 2026-11-26, on current head (https://github.com/uhh-lt/dats/pull/944#issuecomment-7201009573):

Reviewed commit: `24b1efcb577acd39cc38cff5756dbcf3bac9ac8e`

**Summary**

This PR project-scopes code/tag CRUD and changes both tables to composite `(project_id, id)` keys. The route and CRUD updates are broad, but several hand-written queries still join or group by the bare ID; two occurrence/statistics queries can now fail in PostgreSQL, while others can mix project data when IDs are reused.

**Findings**

- **F1** 🔴 high `backend/src/modules/code_frequency/code_frequency_service.py:149-176, 189-228, 248-279`: All three code-occurrence queries select the full `CodeORM` but group only by `CodeORM.id`. With the new composite primary key, PostgreSQL no longer treats the other selected code columns as functionally dependent, so these requests can fail with a `GROUP BY` error. Use the composite code join and group by both `CodeORM.project_id` and `CodeORM.id`.
- **F2** 🔴 high `backend/src/modules/statistics/statistics_service.py:22-41`: `compute_tag_statistics` has the same full-entity/bare-ID `GROUP BY` failure. It also joins the link table only on `tag_id` and computes global counts without a project predicate, allowing tags and counts from different projects to be combined when IDs collide. Pass the authorized project ID into this service, use a composite join/filter/group, and scope the global count as well.
- **F3** 🔴 high `backend/src/core/search/span_anno_search/span_anno_search.py:84-96` (also `sent_anno_search.py:80-92` and `bbox_anno_search.py:80-91`): Annotation searches explicitly join `CodeORM` only with `CodeORM.id == annotation.code_id`. After IDs become project-local, a local annotation can join another project's code with the same numeric ID, returning foreign code metadata and/or duplicate rows despite the source-document project filter. Use the composite relationship or add the project predicate to every list and group query.
- **F4** 🟡 medium `backend/src/modules/code_frequency/code_frequency_service.py:41-110`: The span, sentence, and bbox frequency aggregates accept `project_id` but never filter `SourceDocumentORM.project_id`. Once equal code IDs exist in two projects, annotations from the other project are included in the requested project's counts. Add the source-document project predicate to all three queries.
- **F5** 🟡 medium `backend/src/modules/document_sampler/document_sampler_service.py:79-99`: `sample_sdocs_by_tags` does not use its `project_id` in the query. With project-local tag IDs, a requested local tag ID can match another project's tag links and return that project's documents. Filter `SourceDocumentORM.project_id == project_id` (and keep tag resolution project-scoped).
- **F6** 🟡 medium `backend/src/systems/search_system/filtering.py:48-56`: The recursive code/tag CTE roots on bare `id` and recursively joins only `parent_id`. ID collisions can therefore pull another project's descendants into a recursive filter and produce false matches. Thread `project_id` through recursive-filter resolution and include it in both the CTE root and recursive join.

## #945 feat(api): documents under /projects/{project_id} (#928)

https://github.com/uhh-lt/dats/pull/945

Review workflow: no review. The run hit the workflow's 40-minute limit.

## #946 feat(api): folders and metadata under /projects/{project_id} (#928)

https://github.com/uhh-lt/dats/pull/946

Review workflow: no review. The run hit the workflow's 40-minute limit.

## #947 feat(api): memos under /projects/{project_id} (#928)

https://github.com/uhh-lt/dats/pull/947

Review workflow, 2026-11-27, on current head (https://github.com/uhh-lt/dats/pull/947#issuecomment-7206888004):

Reviewed commit: `8de04cdad9700155091497a08f0eaa7a80729451`

No issues found. ✅

## #948 feat(api): jobs under /projects/{project_id} (#928)

https://github.com/uhh-lt/dats/pull/948

Review workflow, 2026-11-26, on current head (https://github.com/uhh-lt/dats/pull/948#issuecomment-7198843022):

Reviewed commit: `a6457a94a1d6c69e01bb0a380cd0b62f0b5c68c1`

No issues found. ✅

## #949 feat(api): analyses under /projects/{project_id} (#928)

https://github.com/uhh-lt/dats/pull/949

Review workflow, 2026-11-26, on current head (https://github.com/uhh-lt/dats/pull/949#issuecomment-7198980122):

Reviewed commit: `530593bd19326f84caed486f26af81f6e523b9c4`

No issues found. ✅

## #950 feat(api): whiteboards, timeline analyses, COTA and experiments under /projects/{project_id} (#928)

https://github.com/uhh-lt/dats/pull/950

Review workflow, 2026-11-26, on current head (https://github.com/uhh-lt/dats/pull/950#issuecomment-7198588050):

Reviewed commit: `fb8894797052c190c92dc419c5c08fddca43cb59`

No issues found. ✅

## #951 feat(api): classifiers, perspectives and tag recommendations under /projects/{project_id} (#928)

https://github.com/uhh-lt/dats/pull/951

Review workflow, 2026-11-26, on current head (https://github.com/uhh-lt/dats/pull/951#issuecomment-7198930318):

Reviewed commit: `05620d71238d04fb001eb1775cb4cc65afe4951a`

**Summary**

This PR moves classifiers, perspectives, and tag recommendations under project-scoped routes and converts their main tables to `(project_id, id)` CRUD keys. I reviewed the migration, ORM relationships, custom perspective queries, endpoint/service callers, and generated frontend usage. The composite-key conversion is not yet propagated through several dependent ORM and query paths.

**Findings**

- **F1** 🔴 high `backend/src/modules/perspectives/document_cluster_crud.py:23-40,50-76,113-121` (also `document_aspect_crud.py:29-97`): These hand-written reads, joins, merges, and label updates still identify rows only by aspect/cluster/document IDs. The project-scoped visualization, accept/revert-label, and service paths do not pass a project into these methods, so reused IDs can read or modify another project's rows. Pass the path/job project through every caller and include it in every join, filter, and update predicate.
- **F2** 🔴 high `backend/src/modules/classifier/classifier_orm.py:50-56,126-130` (also `perspectives/aspect_orm.py:58-73` and `cluster_orm.py:44-75`): Relationships to newly composite-keyed classifier/aspect/cluster rows still specify only bare foreign IDs. With equal IDs in two projects, evaluations, clusters, hierarchy, and document links can resolve across tenants. Define explicit primary joins matching both `project_id` and the ID, marking only the actual foreign ID as `foreign(...)` so relationships do not write `project_id`.
- **F3** 🟡 medium `backend/src/modules/classifier/classifier_orm.py:146-174` and `perspectives/document_aspect_orm.py:19-27` / `document_cluster_orm.py:19-27`: These dependent association primary keys still omit `project_id` although their parent IDs are now project-scoped. Equivalent links in separate projects can therefore collide; classifier `_link` uses `on_conflict_do_nothing()`, which can silently drop the requested link. Include `project_id` in these primary keys and add the corresponding migration.

## #952 feat(api): prompts, LLM assistant and RAG under /projects/{project_id} (#928)

https://github.com/uhh-lt/dats/pull/952

Review workflow, 2026-11-26, on current head (https://github.com/uhh-lt/dats/pull/952#issuecomment-7202557532):

Reviewed commit: `5930e62c7bd93e2bdc0f299c837dd56ab2c857db`

**Summary**

This PR moves prompt, LLM assistant, and RAG endpoints under project-scoped routes and converts prompt storage to composite project/ID keys. I reviewed the backend authorization and CRUD changes, migration, frontend callers and generated client, tests, and related documentation.

**Findings**

- **F1** 🔵 low `backend/src/core/prompt/README.md:10,20,30,36`: The README still documents removed unscoped `/prompt/...` routes (including `task_info`). Update these references to `/projects/{project_id}/prompts/...` and `task-info` so developers do not call endpoints that no longer exist.

## #953 feat(api): search, search views and similarity search under /projects/{project_id} (#928)

https://github.com/uhh-lt/dats/pull/953

Review workflow, 2026-11-26, on current head (https://github.com/uhh-lt/dats/pull/953#issuecomment-7197216975):

Reviewed commit: `a3521493f18bf505df46765ac3434a47fe18b74e`

No issues found. ✅

## #954 feat(api): users, members, virtual users, projects, API keys and features under /projects/{project_id} and /users/me (#928)

https://github.com/uhh-lt/dats/pull/954

Review workflow, 2026-11-26, on current head (https://github.com/uhh-lt/dats/pull/954#issuecomment-7196831880):

Reviewed commit: `d9083d96de5213d410337c4a4ee4442a2f8a1e65`

No issues found. ✅

## #955 refactor(api): remove the generic project checks (#928)

https://github.com/uhh-lt/dats/pull/955

Review workflow, 2026-11-26, on current head (https://github.com/uhh-lt/dats/pull/955#issuecomment-7196887029):

Reviewed commit: `e0f9d5d6436d508b8f7e1bd39afb289949a4e430`

No issues found. ✅

## #956 Review fixes for #927/#928: project-keyed rows, one migration, tests, job starts, routers, file owners

https://github.com/uhh-lt/dats/pull/956

Review workflow, 2026-11-26, on current head (https://github.com/uhh-lt/dats/pull/956#issuecomment-7197364505):

Reviewed commit: `6b8f216768b89122738c576ebda6cd01eef35406`

No issues found. ✅

## #973 fix: second review of the project endpoints (#928)

https://github.com/uhh-lt/dats/pull/973

Review workflow, 2026-11-26, on current head (https://github.com/uhh-lt/dats/pull/973#issuecomment-7200715489):

Reviewed commit: `5ea880880827e8159260f2d6d4c11b737cf24de8`

No issues found. ✅
