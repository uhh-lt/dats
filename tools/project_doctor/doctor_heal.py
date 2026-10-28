"""The fixes of the DATS project doctor. They do what DATS does when it deletes
documents or annotations (SourceDocumentService, *AnnotationService): the
database cascades remove the dependent rows, the fixes clean up the files,
Elasticsearch and Weaviate."""

import shutil
from datetime import datetime
from pathlib import Path

from doctor_report import (
    DeleteAnnotations,
    DeleteEmbeddings,
    DeleteEsDocuments,
    DeleteEsIndex,
    DeleteSdocs,
    DeleteWeaviateTenant,
    Fix,
    Issue,
    QuarantinePath,
    ReindexEs,
)
from doctor_stores import ANNOTATION_TABLES, SDOC_COLLECTIONS, Stores
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
