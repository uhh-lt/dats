# DATS Hotspots

Failure classes that recur in DATS. Reviewers check every change against them. The list grows from reviews (SKILL.md, step 5): one line per class, general enough to apply across modules.

- Project scoping: endpoints authorize the `project_id` or the entity in the path, but IDs in the request body (document, code, tag, annotation IDs) may belong to another project unless something checks them.
- Data in several stores: SQL, Elasticsearch, Weaviate and the filesystem must stay consistent on create, update and delete.
- Export and import: a new column, entity or relation must survive a project export and import, including older export files without it.
- Websocket sync: mutations emit their event, and the frontend cache-sync handles it.
- Migrations: production holds live data, so a schema change may need a data migration, and nullable/default choices must fit the existing rows.
- Performance: N+1 queries, reading large data (document texts, all annotations) where counts or IDs would do, unbatched writes in loops.
- Analyses and exports must not silently drop or hide data; users filter themselves.
