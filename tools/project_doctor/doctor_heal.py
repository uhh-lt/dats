"""The fixes of the DATS project doctor. They do what DATS does when it deletes
documents or annotations (SourceDocumentService, *AnnotationService): the
database cascades remove the dependent rows, the fixes clean up the files,
Elasticsearch and Weaviate."""

import shutil
from datetime import datetime
from pathlib import Path

from doctor_json_repair import repair_timeline_concepts, repair_whiteboard
from doctor_portability import PortabilityChecker
from doctor_report import (
    AddProjectMembers,
    ClampBBoxes,
    DeleteAnnotations,
    DeleteEmbeddings,
    DeleteEsDocuments,
    DeleteEsIndex,
    DeleteSdocMetadata,
    DeleteSdocs,
    DeleteTagLinks,
    DeleteWeaviateTenant,
    Fix,
    Issue,
    QuarantinePath,
    ReattachMemos,
    ReindexEs,
    RepairSdocMetadata,
    RepairSpanTexts,
    RepairTimelineFilters,
    RepairWhiteboard,
    SetParents,
    SetValues,
)
from doctor_stores import (
    ANNOTATION_TABLES,
    CSV_NA_VALUES,
    SDOC_COLLECTIONS,
    SETTABLE_COLUMNS,
    Stores,
)
from elasticsearch import helpers
from sqlalchemy import Connection, text
from weaviate.classes.query import Filter


class Healer:
    def __init__(
        self, *, conn: Connection, stores: Stores, quarantine_dir: Path
    ) -> None:
        self.conn = conn
        self.stores = stores
        self.quarantine_dir = quarantine_dir

    @staticmethod
    def new_quarantine_dir(stores: Stores) -> Path:
        """The folder of one heal run, inside the DATS filesystem (so that moving
        a file there never crosses a volume)."""
        return stores.root_dir.joinpath(
            "quarantine", datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        )

    def apply(self, issue: Issue) -> str:
        """Applies the fix of the issue and returns what it did."""
        fix: Fix | None = issue.fix
        match fix:
            case None:
                return "nothing to do (needs a manual decision)"
            case DeleteSdocs():
                return self._delete_sdocs(fix.sdoc_ids)
            case QuarantinePath():
                return self._quarantine(Path(fix.path))
            case ReindexEs():
                return self._reindex_es(project_id=self._project_id(issue), fix=fix)
            case DeleteEsDocuments():
                deleted = self._delete_es_documents(
                    project_id=self._project_id(issue), sdoc_ids=fix.sdoc_ids
                )
                return f"deleted {deleted} Elasticsearch documents"
            case DeleteEsIndex():
                self.stores.es.indices.delete(index=fix.index)
                return f"deleted index {fix.index}"
            case DeleteEmbeddings():
                self._delete_embeddings(
                    collection=fix.collection,
                    project_id=self._project_id(issue),
                    sdoc_ids=fix.sdoc_ids,
                )
                return f"deleted embeddings of {len(fix.sdoc_ids)} SourceDocuments"
            case DeleteWeaviateTenant():
                self.stores.weaviate.collections.get(fix.collection).tenants.remove(
                    [fix.tenant]
                )
                return f"deleted tenant {fix.tenant} of {fix.collection}"
            case DeleteAnnotations():
                return self._delete_annotations(fix)
            case SetValues():
                return self._set_values(fix)
            case SetParents():
                return self._set_parents(fix)
            case RepairSpanTexts():
                return self._repair_span_texts(fix.ids)
            case ClampBBoxes():
                return self._clamp_bboxes(fix.ids)
            case RepairSdocMetadata():
                return self._repair_sdoc_metadata(fix.ids)
            case DeleteSdocMetadata():
                self.conn.execute(
                    text("DELETE FROM sourcedocumentmetadata WHERE id = ANY(:ids)"),
                    {"ids": fix.ids},
                )
                return f"deleted {len(fix.ids)} document metadata"
            case DeleteTagLinks():
                for sdoc_id, tag_id in fix.links:
                    self.conn.execute(
                        text(
                            "DELETE FROM sourcedocumenttaglinktable "
                            "WHERE source_document_id = :sdoc AND tag_id = :tag"
                        ),
                        {"sdoc": sdoc_id, "tag": tag_id},
                    )
                return f"deleted {len(fix.links)} tag links"
            case AddProjectMembers():
                return self._add_members(self._project_id(issue), fix.user_ids)
            case ReattachMemos():
                return self._reattach_memos(self._project_id(issue), fix.memo_ids)
            case RepairWhiteboard():
                return self._repair_whiteboard(
                    self._project_id(issue), fix.whiteboard_id
                )
            case RepairTimelineFilters():
                return self._repair_timeline(
                    self._project_id(issue), fix.timeline_analysis_id
                )
        raise ValueError(f"Unknown fix {fix}")

    @staticmethod
    def _project_id(issue: Issue) -> int:
        if issue.project_id is None:
            raise ValueError(f"Issue {issue.key} has no project")
        return issue.project_id

    # ==========================================================================
    # FILESYSTEM
    # ==========================================================================
    def _quarantine(self, path: Path) -> str:
        # only paths inside the DATS filesystem, the report may have been edited
        root = self.stores.root_dir.resolve()
        path = path.resolve()
        if not path.is_relative_to(root):
            raise ValueError(f"{path} lies outside of {root}")
        dst = self.quarantine_dir / path.relative_to(root)
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(path, dst)
        return f"moved to {dst}"

    # ==========================================================================
    # DOCUMENTS AND ANNOTATIONS
    # ==========================================================================
    def _delete_sdocs(self, sdoc_ids: list[int]) -> str:
        # 1) read the documents
        sdocs = self.conn.execute(
            text(
                "SELECT id, filename, doctype, project_id, folder_id "
                "FROM sourcedocument WHERE id = ANY(:ids)"
            ),
            {"ids": sdoc_ids},
        ).all()
        if not sdocs:
            return "nothing to do (deleted already)"

        # 2) delete them; the foreign keys cascade to their data, annotations,
        #    tags, metadata, memos, ...
        self.conn.execute(
            text("DELETE FROM sourcedocument WHERE id = ANY(:ids)"), {"ids": sdoc_ids}
        )

        # 3) delete their SDOC_FOLDERs that are empty now (the folder type is
        #    stored as name or as value, depending on the DATS version)
        self.conn.execute(
            text(
                "DELETE FROM folder f WHERE f.id = ANY(:ids) "
                "AND lower(f.folder_type::text) = 'sdoc_folder' "
                "AND NOT EXISTS (SELECT 1 FROM sourcedocument s WHERE s.folder_id = f.id) "
                "AND NOT EXISTS (SELECT 1 FROM folder c WHERE c.parent_id = f.id)"
            ),
            {"ids": list({sdoc.folder_id for sdoc in sdocs if sdoc.folder_id})},
        )

        # 4) quarantine their files (the original and the derived files)
        for sdoc in sdocs:
            docs_dir = self.stores.docs_dir(sdoc.project_id)
            for name in self.stores.owned_filenames(sdoc.filename, sdoc.doctype):
                if (docs_dir / name).exists():
                    self._quarantine(docs_dir / name)

        # 5) delete their Elasticsearch documents and Weaviate objects
        by_project: dict[int, list[int]] = {}
        for sdoc in sdocs:
            by_project.setdefault(sdoc.project_id, []).append(sdoc.id)
        for project_id, ids in by_project.items():
            self._delete_es_documents(project_id=project_id, sdoc_ids=ids)
            for name in SDOC_COLLECTIONS:
                self._delete_embeddings(
                    collection=self.stores.collection_name(name),
                    project_id=project_id,
                    sdoc_ids=ids,
                )
        return f"deleted SourceDocuments {[sdoc.id for sdoc in sdocs]}"

    def _delete_annotations(self, fix: DeleteAnnotations) -> str:
        table = ANNOTATION_TABLES[fix.kind]
        adoc_ids = self.conn.execute(
            text(
                f"DELETE FROM {table} WHERE id = ANY(:ids) "
                "RETURNING annotation_document_id"
            ),
            {"ids": fix.ids},
        ).scalars()
        # like DATS, mark the annotation documents as changed
        self.conn.execute(
            text("UPDATE annotationdocument SET updated = now() WHERE id = ANY(:ids)"),
            {"ids": list(set(adoc_ids))},
        )
        return f"deleted {len(fix.ids)} {fix.kind} annotations"

    # ==========================================================================
    # ELASTICSEARCH
    # ==========================================================================
    def _reindex_es(self, *, project_id: int, fix: ReindexEs) -> str:
        rows = self.conn.execute(
            text(
                "SELECT s.id, s.filename, s.created, d.content FROM sourcedocument s "
                "JOIN sourcedocumentdata d ON d.id = s.id "
                "WHERE s.id = ANY(:ids) AND s.project_id = :pid"
            ),
            {"ids": fix.sdoc_ids, "pid": project_id},
        ).all()
        index = self.stores.index_name(project_id)
        for row in rows:
            # the document of core/doc/sdoc_elastic_dto.py, with the sdoc id as id
            self.stores.es.index(
                index=index,
                id=str(row.id),
                document={
                    "filename": row.filename,
                    "content": row.content,
                    "sdoc_id": row.id,
                    "project_id": project_id,
                    "created": row.created,
                },
            )
        return f"indexed {len(rows)} SourceDocuments"

    def _delete_es_documents(self, *, project_id: int, sdoc_ids: list[int]) -> int:
        index = self.stores.index_name(project_id)
        if not self.stores.es.indices.exists(index=index):
            return 0
        deleted, _ = helpers.bulk(
            self.stores.es,
            ({"_op_type": "delete", "_index": index, "_id": str(i)} for i in sdoc_ids),
            raise_on_error=False,
            refresh=True,
        )
        return deleted

    # ==========================================================================
    # WEAVIATE
    # ==========================================================================
    def _delete_embeddings(
        self, *, collection: str, project_id: int, sdoc_ids: list[int]
    ) -> None:
        client = self.stores.weaviate
        if not sdoc_ids or not client.collections.exists(collection):
            return
        handle = client.collections.get(collection)
        tenant = self.stores.tenant_name(project_id)
        if not handle.tenants.exists(tenant):
            return
        where = Filter.by_property("sdoc_id").contains_any(sdoc_ids)
        # one call deletes at most QUERY_MAXIMUM_RESULTS objects, so repeat
        # until nothing matches (or nothing could be deleted)
        while True:
            result = handle.with_tenant(tenant).data.delete_many(where=where)
            if result.matches == 0 or result.successful == 0:
                break

    # ==========================================================================
    # VALUES THE EXPORT OR IMPORT CANNOT HANDLE
    # ==========================================================================
    def _set_values(self, fix: SetValues) -> str:
        # the report may have been edited: only allowlisted columns
        if fix.column not in SETTABLE_COLUMNS.get(fix.table, set()):
            raise ValueError(f"{fix.table}.{fix.column} cannot be set by heal")
        for row_id, value in fix.values.items():
            self.conn.execute(
                text(f"UPDATE {fix.table} SET {fix.column} = :value WHERE id = :id"),
                {"value": value, "id": row_id},
            )
        return f"set {len(fix.values)} {fix.table}.{fix.column} values"

    def _set_parents(self, fix: SetParents) -> str:
        if fix.table not in ("code", "tag", "folder"):
            raise ValueError(f"{fix.table} has no parents heal can set")
        for row_id, parent_id in fix.parents.items():
            self.conn.execute(
                text(f"UPDATE {fix.table} SET parent_id = :parent WHERE id = :id"),
                {"parent": parent_id, "id": row_id},
            )
        return f"set the parent of {len(fix.parents)} {fix.table}s"

    def _repair_span_texts(self, ids: list[int]) -> str:
        rows = self.conn.execute(
            text(
                'SELECT a.id, a.begin, a."end", d.content FROM spanannotation a '
                "JOIN annotationdocument ad ON ad.id = a.annotation_document_id "
                "JOIN sourcedocumentdata d ON d.id = ad.source_document_id "
                "WHERE a.id = ANY(:ids)"
            ),
            {"ids": ids},
        ).all()
        repaired, unusable = 0, [int(i) for i in ids]
        for row in rows:
            span = (row.content or "")[row.begin : row.end]
            if not span.strip() or span.strip() in CSV_NA_VALUES:
                continue
            # reuse the span text row of an equal text, like DATS does
            span_text_id = self.conn.execute(
                text("SELECT id FROM spantext WHERE text = :t ORDER BY id LIMIT 1"),
                {"t": span},
            ).scalar()
            if span_text_id is None:
                span_text_id = self.conn.execute(
                    text("INSERT INTO spantext (text) VALUES (:t) RETURNING id"),
                    {"t": span},
                ).scalar()
            self.conn.execute(
                text("UPDATE spanannotation SET span_text_id = :t WHERE id = :id"),
                {"t": span_text_id, "id": row.id},
            )
            unusable.remove(int(row.id))
            repaired += 1
        result = f"took the text of {repaired} span annotations from their document"
        if unusable:
            self._delete_annotations(DeleteAnnotations(kind="span", ids=unusable))
            result += f", deleted {len(unusable)} with a blank text there"
        return result

    def _clamp_bboxes(self, ids: list[int]) -> str:
        # all right-hand sides see the old values
        self.conn.execute(
            text(
                "UPDATE bboxannotation SET "
                "x_min = GREATEST(LEAST(x_min, x_max), 0), "
                "x_max = GREATEST(x_min, x_max, 0), "
                "y_min = GREATEST(LEAST(y_min, y_max), 0), "
                "y_max = GREATEST(y_min, y_max, 0) "
                "WHERE id = ANY(:ids)"
            ),
            {"ids": ids},
        )
        return f"clamped {len(ids)} bbox annotations"

    def _repair_sdoc_metadata(self, ids: list[int]) -> str:
        # exactly one value column may be set (CC_source_document_metadata_has_exactly_one_value)
        self.conn.execute(
            text(
                "UPDATE sourcedocumentmetadata m SET "
                "str_value = CASE WHEN pm.metatype = 'STRING' THEN COALESCE(m.str_value, '') END, "
                "int_value = CASE WHEN pm.metatype = 'NUMBER' THEN COALESCE(m.int_value, 0) END, "
                "boolean_value = CASE WHEN pm.metatype = 'BOOLEAN' "
                "THEN COALESCE(m.boolean_value, false) END, "
                "date_value = CASE WHEN pm.metatype = 'DATE' "
                "THEN COALESCE(m.date_value, current_date) END, "
                "list_value = CASE WHEN pm.metatype = 'LIST' "
                "THEN array_remove(COALESCE(m.list_value, '{}'), NULL) END "
                "FROM projectmetadata pm "
                "WHERE pm.id = m.project_metadata_id AND m.id = ANY(:ids)"
            ),
            {"ids": ids},
        )
        return f"repaired {len(ids)} document metadata"

    def _add_members(self, project_id: int, user_ids: list[int]) -> str:
        for user_id in user_ids:
            self.conn.execute(
                text(
                    "INSERT INTO projectuserlinktable (project_id, user_id) "
                    "SELECT :pid, :uid WHERE NOT EXISTS (SELECT 1 FROM projectuserlinktable "
                    "WHERE project_id = :pid AND user_id = :uid)"
                ),
                {"pid": project_id, "uid": user_id},
            )
        return f"added {len(user_ids)} users to the project"

    def _reattach_memos(self, project_id: int, memo_ids: list[int]) -> str:
        handle_id = self.conn.execute(
            text("SELECT id FROM objecthandle WHERE project_id = :pid"),
            {"pid": project_id},
        ).scalar()
        if handle_id is None:
            handle_id = self.conn.execute(
                text(
                    "INSERT INTO objecthandle (project_id) VALUES (:pid) RETURNING id"
                ),
                {"pid": project_id},
            ).scalar()
        self.conn.execute(
            text(
                "UPDATE memo SET attached_to_id = :handle "
                "WHERE id = ANY(:ids) AND project_id = :pid"
            ),
            {"handle": handle_id, "ids": memo_ids, "pid": project_id},
        )
        return f"attached {len(memo_ids)} memos to the project"

    def _repair_whiteboard(self, project_id: int, whiteboard_id: int) -> str:
        content = self.conn.execute(
            text("SELECT content FROM whiteboard WHERE id = :id AND project_id = :pid"),
            {"id": whiteboard_id, "pid": project_id},
        ).scalar()
        valid, code_parents = PortabilityChecker(
            conn=self.conn, stores=self.stores
        ).whiteboard_references(project_id)
        repaired = repair_whiteboard(content, valid, code_parents)
        if repaired is None:
            return "nothing to do"
        new_content, changes = repaired
        self.conn.execute(
            text("UPDATE whiteboard SET content = :c WHERE id = :id"),
            {"c": new_content, "id": whiteboard_id},
        )
        return "; ".join(changes)

    def _repair_timeline(self, project_id: int, timeline_id: int) -> str:
        concepts = self.conn.execute(
            text(
                "SELECT concepts FROM timelineanalysis WHERE id = :id AND project_id = :pid"
            ),
            {"id": timeline_id, "pid": project_id},
        ).scalar()
        valid = PortabilityChecker(
            conn=self.conn, stores=self.stores
        ).timeline_references(project_id)
        repaired = repair_timeline_concepts(concepts, valid)
        if repaired is None:
            return "nothing to do"
        new_concepts, changes = repaired
        self.conn.execute(
            text("UPDATE timelineanalysis SET concepts = :c WHERE id = :id"),
            {"c": new_concepts, "id": timeline_id},
        )
        return "; ".join(changes)
