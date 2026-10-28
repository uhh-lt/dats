"""The checks of the DATS project doctor. Every check only reads; it returns
the issues it found, each with the fix that `heal` would apply."""

import re
import sys
import time
import unicodedata
from collections.abc import Callable
from typing import Any

from doctor_report import (
    CheckName,
    DeleteAnnotations,
    DeleteEmbeddings,
    DeleteEsDocuments,
    DeleteEsIndex,
    DeleteSdocs,
    DeleteWeaviateTenant,
    Issue,
    QuarantinePath,
    ReindexEs,
)
from doctor_stores import (
    ALL_COLLECTIONS,
    ALL_STEPS,
    ANNOTATION_TABLES,
    PROCESSING_STEPS,
    SDOC_COLLECTIONS,
    STATUS_ERRONEOUS,
    STATUS_FINISHED,
    STATUS_PROCESSING,
    AnnotationKind,
    Stores,
)
from elasticsearch import helpers
from sqlalchemy import Connection, text

# how many ids a message lists before it abbreviates
_MAX_IDS_IN_MESSAGE = 10

_HINT_FAILED_PROCESSING = (
    "Retry the failed steps in the document health view of the project, or "
    "delete the documents."
)
_HINT_RECOMPUTE = (
    "Recompute the step '{step}' in the document health view of the project."
)
_HINT_CROSS_PROJECT = (
    "The rows reference entities of another project. Inspect them in the "
    "database and decide by hand."
)

# the steps that write the embeddings of a Weaviate collection
_EMBEDDING_STEPS = {
    "Sentence": "text_sentence_embedding",
    "Image": "image_embedding",
}


class SdocRow:
    """The columns of a source document that the checks need (no content)."""

    def __init__(self, row: dict[str, Any]) -> None:
        self.id: int = row["id"]
        self.filename: str = row["filename"]
        self.doctype: str = row["doctype"]
        self.project_id: int = row["project_id"]
        self.statuses: dict[str, int] = {
            step: row[step] for step in PROCESSING_STEPS.get(self.doctype, [])
        }

    def is_finished(self, step: str) -> bool:
        return self.statuses.get(step) == STATUS_FINISHED

    @property
    def is_processing(self) -> bool:
        return STATUS_PROCESSING in self.statuses.values()

    @property
    def failed_steps(self) -> list[str]:
        return [s for s, status in self.statuses.items() if status == STATUS_ERRONEOUS]


def _ids_text(ids: list[int]) -> str:
    shown = ", ".join(str(i) for i in ids[:_MAX_IDS_IN_MESSAGE])
    if len(ids) > _MAX_IDS_IN_MESSAGE:
        shown += f", ... ({len(ids) - _MAX_IDS_IN_MESSAGE} more)"
    return shown


def _normalize_filename(name: str) -> str:
    return unicodedata.normalize("NFC", name).casefold()


class Checker:
    def __init__(
        self, *, conn: Connection, stores: Stores, min_file_age_minutes: int
    ) -> None:
        self.conn = conn
        self.stores = stores
        self.min_file_age_seconds = min_file_age_minutes * 60

    def _ids(self, sql: str, **params: Any) -> list[int]:
        return [int(i) for i in self.conn.execute(text(sql), params).scalars()]

    # ==========================================================================
    # ENTRY POINT
    # ==========================================================================
    def run(self, *, project_ids: list[int] | None, instance: bool) -> list[Issue]:
        existing_ids = set(self._ids("SELECT id FROM project"))
        if project_ids is None:
            project_ids = sorted(existing_ids)
        unknown = [pid for pid in project_ids if pid not in existing_ids]
        if unknown:
            raise ValueError(f"Projects {unknown} do not exist")

        issues: list[Issue] = []
        for project_id in project_ids:
            print(f"Checking project {project_id} ...", file=sys.stderr)
            issues.extend(self.check_project(project_id=project_id))
        if instance:
            print("Checking for leftovers of deleted projects ...", file=sys.stderr)
            issues.extend(self.check_instance(existing_project_ids=existing_ids))
        return issues

    def check_project(self, *, project_id: int) -> list[Issue]:
        sdocs = self._read_sdocs(project_id=project_id)
        data_ids = set(
            self._ids(
                "SELECT d.id FROM sourcedocumentdata d "
                "JOIN sourcedocument s ON s.id = d.id WHERE s.project_id = :pid",
                pid=project_id,
            )
        )
        checks: list[Callable[[], list[Issue]]] = [
            lambda: self._check_files(project_id=project_id, sdocs=sdocs),
            lambda: self._check_processing(sdocs=sdocs, data_ids=data_ids),
            lambda: self._check_cross_project_references(project_id=project_id),
            lambda: self._check_annotation_bounds(project_id=project_id),
            lambda: self._check_elasticsearch(
                project_id=project_id, sdocs=sdocs, data_ids=data_ids
            ),
            lambda: self._check_weaviate(project_id=project_id, sdocs=sdocs),
        ]
        issues: list[Issue] = []
        for check in checks:
            issues.extend(check())
        return issues

    def check_instance(self, *, existing_project_ids: set[int]) -> list[Issue]:
        return (
            self._check_orphaned_project_dirs(existing_project_ids)
            + self._check_orphaned_es_indices(existing_project_ids)
            + self._check_orphaned_weaviate_tenants(existing_project_ids)
        )

    # ==========================================================================
    # POSTGRES <-> FILESYSTEM
    # ==========================================================================
    def _check_files(self, *, project_id: int, sdocs: list[SdocRow]) -> list[Issue]:
        docs_dir = self.stores.docs_dir(project_id)
        on_disk = {p.name: p for p in docs_dir.iterdir()} if docs_dir.is_dir() else {}
        normalized_on_disk = {_normalize_filename(n): n for n in on_disk}

        issues: list[Issue] = []
        owned: set[str] = set()
        for sdoc in sdocs:
            owned |= self.stores.owned_filenames(sdoc.filename, sdoc.doctype)
            name = self.stores.truncate_filename(sdoc.filename)

            # 1) the original file, which the export and the viewer need
            if name not in on_disk:
                similar = normalized_on_disk.get(_normalize_filename(name))
                if similar:
                    # not an orphan: the hint proposes to rename it
                    owned.add(similar)
                issues.append(
                    Issue(
                        key=f"{CheckName.MISSING_ORIGINAL_FILE.value}:sdoc:{sdoc.id}",
                        check=CheckName.MISSING_ORIGINAL_FILE,
                        project_id=project_id,
                        message=f"SourceDocument {sdoc.id} ({sdoc.filename}): "
                        f"original file {docs_dir / name} does not exist",
                        # a file that differs only in case or unicode normalization
                        # is probably the original: renaming it keeps the document
                        fix=None if similar else DeleteSdocs(sdoc_ids=[sdoc.id]),
                        hint=f"A file with a similar name exists: '{similar}'. Rename "
                        f"it to '{name}' to restore the document."
                        if similar
                        else "Restore the file to keep the document; heal deletes it.",
                    )
                )
                continue

            # 2) the image thumbnails, which the document views show
            if sdoc.doctype == "image" and sdoc.is_finished("image_thumbnail"):
                missing = [
                    fn
                    for fn in (f"{name}.webp", f"{name}.thumbnail.webp")
                    if fn not in on_disk
                ]
                if missing:
                    issues.append(
                        Issue(
                            key=f"{CheckName.MISSING_THUMBNAIL.value}:sdoc:{sdoc.id}",
                            check=CheckName.MISSING_THUMBNAIL,
                            project_id=project_id,
                            message=f"SourceDocument {sdoc.id} ({sdoc.filename}): "
                            f"missing {', '.join(missing)}",
                            fix=None,
                            hint=_HINT_RECOMPUTE.format(step="image_thumbnail"),
                        )
                    )

        # 3) files that no document owns (uploads that never became a document,
        #    leftovers of deleted documents). Young files may still be processed.
        now = time.time()
        for name, path in sorted(on_disk.items()):
            if name in owned:
                continue
            if now - path.stat().st_mtime < self.min_file_age_seconds:
                continue
            issues.append(
                Issue(
                    key=f"{CheckName.ORPHANED_FILE.value}:{path}",
                    check=CheckName.ORPHANED_FILE,
                    project_id=project_id,
                    message=f"{path} belongs to no SourceDocument",
                    fix=QuarantinePath(path=str(path)),
                )
            )
        return issues

    def _check_orphaned_project_dirs(
        self, existing_project_ids: set[int]
    ) -> list[Issue]:
        projects_dir = self.stores.projects_dir
        if not projects_dir.is_dir():
            return []
        return [
            Issue(
                key=f"{CheckName.ORPHANED_PROJECT_DIR.value}:{path}",
                check=CheckName.ORPHANED_PROJECT_DIR,
                project_id=None,
                message=f"{path} belongs to the deleted project {path.name}",
                fix=QuarantinePath(path=str(path)),
            )
            for path in sorted(projects_dir.iterdir())
            if path.is_dir()
            and path.name.isdigit()
            and int(path.name) not in existing_project_ids
        ]

    # ==========================================================================
    # POSTGRES
    # ==========================================================================
    def _read_sdocs(self, *, project_id: int) -> list[SdocRow]:
        columns = ", ".join(["id", "filename", "doctype", "project_id", *ALL_STEPS])
        rows = self.conn.execute(
            text(
                f"SELECT {columns} FROM sourcedocument "
                "WHERE project_id = :pid ORDER BY id"
            ),
            {"pid": project_id},
        ).mappings()
        return [SdocRow(dict(row)) for row in rows]

    def _check_processing(
        self, *, sdocs: list[SdocRow], data_ids: set[int]
    ) -> list[Issue]:
        issues: list[Issue] = []
        for sdoc in sdocs:
            if sdoc.failed_steps:
                issues.append(
                    Issue(
                        key=f"{CheckName.FAILED_PROCESSING.value}:sdoc:{sdoc.id}",
                        check=CheckName.FAILED_PROCESSING,
                        project_id=sdoc.project_id,
                        message=f"SourceDocument {sdoc.id} ({sdoc.filename}): "
                        f"failed steps {', '.join(sdoc.failed_steps)}",
                        fix=None,
                        hint=_HINT_FAILED_PROCESSING,
                    )
                )
            # the export needs the processed data of every document
            if sdoc.id not in data_ids and not sdoc.is_processing:
                issues.append(
                    Issue(
                        key=f"{CheckName.MISSING_SDOC_DATA.value}:sdoc:{sdoc.id}",
                        check=CheckName.MISSING_SDOC_DATA,
                        project_id=sdoc.project_id,
                        message=f"SourceDocument {sdoc.id} ({sdoc.filename}) has no "
                        "processed data (content, html, sentences), but no step is "
                        "processing anymore",
                        fix=None,
                        hint=_HINT_FAILED_PROCESSING,
                    )
                )
        return issues

    def _cross_project_issue(
        self, *, project_id: int, what: str, ids: list[int]
    ) -> list[Issue]:
        if not ids:
            return []
        return [
            Issue(
                key=f"{CheckName.CROSS_PROJECT_REFERENCE.value}:{project_id}:{what}",
                check=CheckName.CROSS_PROJECT_REFERENCE,
                project_id=project_id,
                message=f"{len(ids)} {what} reference another project: "
                f"{_ids_text(ids)}",
                fix=None,
                hint=_HINT_CROSS_PROJECT,
            )
        ]

    def _check_cross_project_references(self, *, project_id: int) -> list[Issue]:
        issues: list[Issue] = []
        for kind, table in ANNOTATION_TABLES.items():
            ids = self._ids(
                f"SELECT a.id FROM {table} a "
                "JOIN annotationdocument ad ON ad.id = a.annotation_document_id "
                "JOIN sourcedocument s ON s.id = ad.source_document_id "
                "JOIN code c ON c.id = a.code_id "
                "WHERE s.project_id = :pid "
                "AND (a.project_id <> :pid OR c.project_id <> :pid) ORDER BY a.id",
                pid=project_id,
            )
            issues += self._cross_project_issue(
                project_id=project_id, what=f"{kind} annotations", ids=ids
            )

        folder_ids = self._ids(
            "SELECT s.id FROM sourcedocument s JOIN folder f ON f.id = s.folder_id "
            "WHERE s.project_id = :pid AND f.project_id <> :pid ORDER BY s.id",
            pid=project_id,
        )
        issues += self._cross_project_issue(
            project_id=project_id, what="SourceDocuments (folder)", ids=folder_ids
        )

        tag_ids = self._ids(
            "SELECT DISTINCT s.id FROM sourcedocument s "
            "JOIN sourcedocumenttaglinktable l ON l.source_document_id = s.id "
            "JOIN tag t ON t.id = l.tag_id "
            "WHERE s.project_id = :pid AND t.project_id <> :pid ORDER BY s.id",
            pid=project_id,
        )
        issues += self._cross_project_issue(
            project_id=project_id, what="SourceDocuments (tags)", ids=tag_ids
        )

        metadata_ids = self._ids(
            "SELECT m.id FROM sourcedocumentmetadata m "
            "JOIN sourcedocument s ON s.id = m.source_document_id "
            "JOIN projectmetadata pm ON pm.id = m.project_metadata_id "
            "WHERE s.project_id = :pid AND pm.project_id <> :pid ORDER BY m.id",
            pid=project_id,
        )
        issues += self._cross_project_issue(
            project_id=project_id, what="SourceDocument metadata", ids=metadata_ids
        )
        return issues

    def _check_annotation_bounds(self, *, project_id: int) -> list[Issue]:
        join_data = (
            "JOIN annotationdocument ad ON ad.id = a.annotation_document_id "
            "JOIN sourcedocumentdata d ON d.id = ad.source_document_id "
        )
        found: list[tuple[AnnotationKind, str, list[int]]] = [
            (
                "span",
                "characters or tokens beyond the text",
                self._ids(
                    f"SELECT a.id FROM spanannotation a {join_data}"
                    'WHERE a.project_id = :pid AND (a.begin < 0 OR a."end" < a.begin '
                    'OR a."end" > length(d.content) OR a.begin_token < 0 '
                    "OR a.end_token < a.begin_token "
                    "OR a.end_token > cardinality(d.token_starts)) ORDER BY a.id",
                    pid=project_id,
                ),
            ),
            (
                "sentence",
                "sentences beyond the text",
                self._ids(
                    f"SELECT a.id FROM sentenceannotation a {join_data}"
                    "WHERE a.project_id = :pid AND (a.sentence_id_start < 0 "
                    "OR a.sentence_id_end < a.sentence_id_start "
                    # sentence_id_end is inclusive
                    "OR a.sentence_id_end >= cardinality(d.sentence_starts)) "
                    "ORDER BY a.id",
                    pid=project_id,
                ),
            ),
            (
                "bbox",
                "negative or inverted coordinates",
                self._ids(
                    "SELECT a.id FROM bboxannotation a WHERE a.project_id = :pid "
                    "AND (a.x_min < 0 OR a.y_min < 0 OR a.x_max < a.x_min "
                    "OR a.y_max < a.y_min) ORDER BY a.id",
                    pid=project_id,
                ),
            ),
        ]
        return [
            Issue(
                key=f"{CheckName.ANNOTATION_OUT_OF_BOUNDS.value}:{project_id}:{kind}",
                check=CheckName.ANNOTATION_OUT_OF_BOUNDS,
                project_id=project_id,
                message=f"{len(ids)} {kind} annotations lie outside their document "
                f"({rule}): {_ids_text(ids)}",
                fix=DeleteAnnotations(kind=kind, ids=ids),
                hint="The annotations cannot be displayed. Remove this issue from "
                "the report to keep them.",
            )
            for kind, rule, ids in found
            if ids
        ]

    # ==========================================================================
    # POSTGRES <-> ELASTICSEARCH
    # ==========================================================================
    def _check_elasticsearch(
        self, *, project_id: int, sdocs: list[SdocRow], data_ids: set[int]
    ) -> list[Issue]:
        es = self.stores.es
        index = self.stores.index_name(project_id)
        index_exists = bool(es.indices.exists(index=index))
        es_ids: set[int] = set()
        if index_exists:
            es_ids = {
                int(hit["_id"])
                for hit in helpers.scan(
                    es, index=index, query={"query": {"match_all": {}}}, _source=False
                )
            }

        sdoc_ids = {sdoc.id for sdoc in sdocs}
        missing = [
            sdoc.id
            for sdoc in sdocs
            if sdoc.is_finished("text_es_index")
            and sdoc.id in data_ids
            and sdoc.id not in es_ids
        ]
        orphaned = sorted(es_ids - sdoc_ids)

        issues: list[Issue] = []
        if missing:
            issues.append(
                Issue(
                    key=f"{CheckName.MISSING_ES_DOCUMENT.value}:{project_id}",
                    check=CheckName.MISSING_ES_DOCUMENT,
                    project_id=project_id,
                    message=f"{len(missing)} indexed SourceDocuments are missing in "
                    f"{index}: {_ids_text(missing)}",
                    # without the index, DATS has to create it with its mappings
                    fix=ReindexEs(sdoc_ids=missing) if index_exists else None,
                    hint=None
                    if index_exists
                    else f"The index {index} does not exist. "
                    + _HINT_RECOMPUTE.format(step="text_es_index"),
                )
            )
        if orphaned:
            issues.append(
                Issue(
                    key=f"{CheckName.ORPHANED_ES_DOCUMENT.value}:{project_id}",
                    check=CheckName.ORPHANED_ES_DOCUMENT,
                    project_id=project_id,
                    message=f"{len(orphaned)} documents in {index} belong to deleted "
                    f"SourceDocuments: {_ids_text(orphaned)}",
                    fix=DeleteEsDocuments(sdoc_ids=orphaned),
                )
            )
        return issues

    def _check_orphaned_es_indices(self, existing_project_ids: set[int]) -> list[Issue]:
        prefix = f"{self.stores.index_prefix}_project_"
        pattern = re.compile(rf"^{re.escape(prefix)}(\d+)_")
        indices = self.stores.es.indices.get(index=f"{prefix}*", allow_no_indices=True)
        issues: list[Issue] = []
        for index in sorted(indices.keys()):
            match = pattern.match(index)
            if match is None or int(match.group(1)) in existing_project_ids:
                continue
            issues.append(
                Issue(
                    key=f"{CheckName.ORPHANED_ES_INDEX.value}:{index}",
                    check=CheckName.ORPHANED_ES_INDEX,
                    project_id=None,
                    message=f"Index {index} belongs to the deleted project "
                    f"{match.group(1)}",
                    fix=DeleteEsIndex(index=index),
                )
            )
        return issues

    # ==========================================================================
    # POSTGRES <-> WEAVIATE
    # ==========================================================================
    def _embedded_sdoc_ids(self, collection: str, project_id: int) -> set[int]:
        client = self.stores.weaviate
        if not client.collections.exists(collection):
            return set()
        handle = client.collections.get(collection)
        tenant = self.stores.tenant_name(project_id)
        if not handle.tenants.exists(tenant):
            return set()
        ids: set[int] = set()
        for obj in handle.with_tenant(tenant).iterator(return_properties=["sdoc_id"]):
            value = obj.properties.get("sdoc_id")
            if isinstance(value, (int, float)):
                ids.add(int(value))
        return ids

    def _check_weaviate(self, *, project_id: int, sdocs: list[SdocRow]) -> list[Issue]:
        sdoc_ids = {sdoc.id for sdoc in sdocs}
        sentence_counts: dict[int, int] = {
            int(sdoc_id): int(count)
            for sdoc_id, count in self.conn.execute(
                text(
                    "SELECT d.id, COALESCE(cardinality(d.sentence_starts), 0) "
                    "FROM sourcedocumentdata d JOIN sourcedocument s ON s.id = d.id "
                    "WHERE s.project_id = :pid"
                ),
                {"pid": project_id},
            ).tuples()
        }

        issues: list[Issue] = []
        for name in SDOC_COLLECTIONS:
            collection = self.stores.collection_name(name)
            embedded = self._embedded_sdoc_ids(collection, project_id)

            orphaned = sorted(embedded - sdoc_ids)
            if orphaned:
                issues.append(
                    Issue(
                        key=f"{CheckName.ORPHANED_EMBEDDINGS.value}:{project_id}:{collection}",
                        check=CheckName.ORPHANED_EMBEDDINGS,
                        project_id=project_id,
                        message=f"{collection} holds embeddings of {len(orphaned)} "
                        f"deleted SourceDocuments: {_ids_text(orphaned)}",
                        fix=DeleteEmbeddings(collection=collection, sdoc_ids=orphaned),
                    )
                )

            step = _EMBEDDING_STEPS.get(name)
            if step is None:
                continue
            missing = [
                sdoc.id
                for sdoc in sdocs
                if sdoc.is_finished(step)
                and sdoc.id not in embedded
                # documents without sentences have no sentence embeddings
                and (
                    step != "text_sentence_embedding"
                    or sentence_counts.get(sdoc.id, 0) > 0
                )
            ]
            if missing:
                issues.append(
                    Issue(
                        key=f"{CheckName.MISSING_EMBEDDINGS.value}:{project_id}:{collection}",
                        check=CheckName.MISSING_EMBEDDINGS,
                        project_id=project_id,
                        message=f"{len(missing)} SourceDocuments have no embeddings in "
                        f"{collection}: {_ids_text(missing)}",
                        fix=None,
                        hint=_HINT_RECOMPUTE.format(step=step),
                    )
                )
        return issues

    def _check_orphaned_weaviate_tenants(
        self, existing_project_ids: set[int]
    ) -> list[Issue]:
        client = self.stores.weaviate
        pattern = re.compile(r"^Project(\d+)$")
        issues: list[Issue] = []
        for name in ALL_COLLECTIONS:
            collection = self.stores.collection_name(name)
            if not client.collections.exists(collection):
                continue
            tenants = client.collections.get(collection).tenants.get()
            for tenant in sorted(tenants.keys()):
                match = pattern.match(tenant)
                if match is None or int(match.group(1)) in existing_project_ids:
                    continue
                issues.append(
                    Issue(
                        key=f"{CheckName.ORPHANED_WEAVIATE_TENANT.value}:{collection}:{tenant}",
                        check=CheckName.ORPHANED_WEAVIATE_TENANT,
                        project_id=None,
                        message=f"Tenant {tenant} of {collection} belongs to the "
                        f"deleted project {match.group(1)}",
                        fix=DeleteWeaviateTenant(collection=collection, tenant=tenant),
                    )
                )
        return issues
