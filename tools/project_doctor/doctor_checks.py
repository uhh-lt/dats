"""The checks of the DATS project doctor. Every check only reads; it returns
the issues it found, each with the fix that `heal` would apply."""

import re
import sys
import time
import unicodedata
from collections.abc import Callable
from pathlib import Path
from typing import Literal

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
    RecomputeStep,
    ReindexEs,
)
from elasticsearch import helpers
from sqlalchemy import ColumnElement, func, or_, select
from sqlalchemy.orm import Session

from common.doc_processing_steps import PROCESSING_JOBS
from common.doc_type_enum import DocType
from common.sdoc_status_enum import SDocStatus
from config import conf
from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.annotation.bbox_annotation_orm import BBoxAnnotationORM
from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.code.code_orm import CodeORM
from core.doc.folder_orm import FolderORM
from core.doc.image_collection import ImageCollection
from core.doc.sdoc_elastic_index import SdocIndex
from core.doc.sentence_collection import SentenceCollection
from core.doc.source_document_data_orm import SourceDocumentDataORM
from core.doc.source_document_orm import SourceDocumentORM
from core.metadata.project_metadata_orm import ProjectMetadataORM
from core.metadata.source_document_metadata_orm import SourceDocumentMetadataORM
from core.project.project_orm import ProjectORM
from core.tag.tag_orm import SourceDocumentTagLinkTable, TagORM
from repos.elastic.elastic_repo import ElasticSearchRepo
from repos.filesystem_repo import FilesystemRepo
from repos.vector.collection_base import BaseCollection
from repos.vector.weaviate_repo import WeaviateRepo

# the processing steps that have a status column in the sourcedocument table
_ALL_STEPS = sorted({step for steps in PROCESSING_JOBS.values() for step in steps})

# how many ids a message lists before it abbreviates
_MAX_IDS_IN_MESSAGE = 10

_HINT_FAILED_PROCESSING = (
    "Retry the failed steps in the document health view of the project, or "
    "delete the documents."
)
_HINT_CROSS_PROJECT = (
    "The rows reference entities of another project. Inspect them in the "
    "database and decide by hand."
)


class SdocRow:
    """The columns of a source document that the checks need (no content)."""

    def __init__(self, row: dict) -> None:
        self.id: int = row["id"]
        self.filename: str = row["filename"]
        self.doctype = DocType(row["doctype"])
        self.project_id: int = row["project_id"]
        self.statuses: dict[str, SDocStatus] = {
            step: SDocStatus(row[step]) for step in PROCESSING_JOBS[self.doctype]
        }

    def is_finished(self, step: str) -> bool:
        return self.statuses.get(step) == SDocStatus.finished

    @property
    def is_processing(self) -> bool:
        return SDocStatus.processing in self.statuses.values()

    @property
    def failed_steps(self) -> list[str]:
        return [
            s for s, status in self.statuses.items() if status == SDocStatus.erroneous
        ]


def _ids_text(ids: list[int]) -> str:
    shown = ", ".join(str(i) for i in ids[:_MAX_IDS_IN_MESSAGE])
    if len(ids) > _MAX_IDS_IN_MESSAGE:
        shown += f", ... ({len(ids) - _MAX_IDS_IN_MESSAGE} more)"
    return shown


def _normalize_filename(name: str) -> str:
    return unicodedata.normalize("NFC", name).casefold()


class Checker:
    def __init__(self, *, db: Session, min_file_age_minutes: int) -> None:
        self.db = db
        self.min_file_age_seconds = min_file_age_minutes * 60
        self.fsr = FilesystemRepo()
        self.es = ElasticSearchRepo().get_client()
        self.weaviate = WeaviateRepo().get_client()

    # ==========================================================================
    # ENTRY POINT
    # ==========================================================================
    def run(self, *, project_ids: list[int] | None, instance: bool) -> list[Issue]:
        existing_ids = set(self.db.scalars(select(ProjectORM.id)))
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
            self.db.scalars(
                select(SourceDocumentDataORM.id)
                .join(SourceDocumentORM)
                .where(SourceDocumentORM.project_id == project_id)
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
    def _docs_dir(self, project_id: int) -> Path:
        return self.fsr.get_project_root_dir_path(project_id=project_id) / "docs"

    def _owned_filenames(self, sdoc: SdocRow) -> set[str]:
        """The files in the docs folder that belong to the document: the
        original, and the files the processing derives from it."""
        name = self.fsr.truncate_filename(sdoc.filename)
        owned = {name}
        if sdoc.doctype in (DocType.image, DocType.audio, DocType.video):
            owned.add(self.fsr.generate_sdoc_filename(name, webp=True))
            owned.add(self.fsr.generate_sdoc_filename(name, webp=True, thumbnail=True))
            owned.add(self.fsr.generate_sdoc_filename(name, thumbnail=True))
        if sdoc.doctype == DocType.video:
            owned.add(Path(name).with_suffix(".mp3").name)
        return owned

    def _check_files(self, *, project_id: int, sdocs: list[SdocRow]) -> list[Issue]:
        docs_dir = self._docs_dir(project_id)
        on_disk = {p.name: p for p in docs_dir.iterdir()} if docs_dir.is_dir() else {}
        normalized_on_disk = {_normalize_filename(n): n for n in on_disk}

        issues: list[Issue] = []
        owned: set[str] = set()
        for sdoc in sdocs:
            owned |= self._owned_filenames(sdoc)
            name = self.fsr.truncate_filename(sdoc.filename)

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
            if sdoc.doctype == DocType.image and sdoc.is_finished("image_thumbnail"):
                missing = [
                    fn
                    for fn in (
                        self.fsr.generate_sdoc_filename(name, webp=True),
                        self.fsr.generate_sdoc_filename(
                            name, webp=True, thumbnail=True
                        ),
                    )
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
                            fix=RecomputeStep(
                                step="image_thumbnail", sdoc_ids=[sdoc.id]
                            ),
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
        if not self.fsr.proj_root.is_dir():
            return []
        return [
            Issue(
                key=f"{CheckName.ORPHANED_PROJECT_DIR.value}:{path}",
                check=CheckName.ORPHANED_PROJECT_DIR,
                project_id=None,
                message=f"{path} belongs to the deleted project {path.name}",
                fix=QuarantinePath(path=str(path)),
            )
            for path in sorted(self.fsr.proj_root.iterdir())
            if path.is_dir()
            and path.name.isdigit()
            and int(path.name) not in existing_project_ids
        ]

    # ==========================================================================
    # POSTGRES
    # ==========================================================================
    def _read_sdocs(self, *, project_id: int) -> list[SdocRow]:
        columns = [
            SourceDocumentORM.id,
            SourceDocumentORM.filename,
            SourceDocumentORM.doctype,
            SourceDocumentORM.project_id,
            *(getattr(SourceDocumentORM, step) for step in _ALL_STEPS),
        ]
        rows = self.db.execute(
            select(*columns)
            .where(SourceDocumentORM.project_id == project_id)
            .order_by(SourceDocumentORM.id)
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
        annotation_orms: list[
            tuple[
                str, type[SpanAnnotationORM | SentenceAnnotationORM | BBoxAnnotationORM]
            ]
        ] = [
            ("span annotations", SpanAnnotationORM),
            ("sentence annotations", SentenceAnnotationORM),
            ("bbox annotations", BBoxAnnotationORM),
        ]
        for what, orm in annotation_orms:
            ids = self.db.scalars(
                select(orm.id)
                .join(AnnotationDocumentORM)
                .join(SourceDocumentORM)
                .join(CodeORM, CodeORM.id == orm.code_id)
                .where(SourceDocumentORM.project_id == project_id)
                .where(
                    or_(
                        orm.project_id != project_id,
                        CodeORM.project_id != project_id,
                    )
                )
                .order_by(orm.id)
            ).all()
            issues += self._cross_project_issue(
                project_id=project_id, what=what, ids=list(ids)
            )

        folder_ids = self.db.scalars(
            select(SourceDocumentORM.id)
            .join(FolderORM, FolderORM.id == SourceDocumentORM.folder_id)
            .where(SourceDocumentORM.project_id == project_id)
            .where(FolderORM.project_id != project_id)
        ).all()
        issues += self._cross_project_issue(
            project_id=project_id,
            what="SourceDocuments (folder)",
            ids=list(folder_ids),
        )

        tag_ids = self.db.scalars(
            select(SourceDocumentORM.id)
            .join(SourceDocumentTagLinkTable)
            .join(TagORM, TagORM.id == SourceDocumentTagLinkTable.tag_id)
            .where(SourceDocumentORM.project_id == project_id)
            .where(TagORM.project_id != project_id)
            .distinct()
        ).all()
        issues += self._cross_project_issue(
            project_id=project_id, what="SourceDocuments (tags)", ids=list(tag_ids)
        )

        metadata_ids = self.db.scalars(
            select(SourceDocumentMetadataORM.id)
            .join(SourceDocumentORM)
            .join(
                ProjectMetadataORM,
                ProjectMetadataORM.id == SourceDocumentMetadataORM.project_metadata_id,
            )
            .where(SourceDocumentORM.project_id == project_id)
            .where(ProjectMetadataORM.project_id != project_id)
        ).all()
        issues += self._cross_project_issue(
            project_id=project_id,
            what="SourceDocument metadata",
            ids=list(metadata_ids),
        )
        return issues

    def _out_of_bounds_issue(
        self,
        *,
        project_id: int,
        kind: Literal["span", "sentence", "bbox"],
        ids: list[int],
        rule: str,
    ) -> list[Issue]:
        if not ids:
            return []
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
        ]

    def _annotation_ids(
        self,
        *,
        project_id: int,
        orm: type[SpanAnnotationORM | SentenceAnnotationORM],
        condition: ColumnElement[bool],
    ) -> list[int]:
        return list(
            self.db.scalars(
                select(orm.id)
                .join(AnnotationDocumentORM)
                .join(
                    SourceDocumentDataORM,
                    SourceDocumentDataORM.id
                    == AnnotationDocumentORM.source_document_id,
                )
                .where(orm.project_id == project_id)
                .where(condition)
                .order_by(orm.id)
            )
        )

    def _check_annotation_bounds(self, *, project_id: int) -> list[Issue]:
        span = SpanAnnotationORM
        span_ids = self._annotation_ids(
            project_id=project_id,
            orm=span,
            condition=or_(
                span.begin < 0,
                span.end < span.begin,
                span.end > func.length(SourceDocumentDataORM.content),
                span.begin_token < 0,
                span.end_token < span.begin_token,
                span.end_token > func.cardinality(SourceDocumentDataORM.token_starts),
            ),
        )
        sent = SentenceAnnotationORM
        sentence_ids = self._annotation_ids(
            project_id=project_id,
            orm=sent,
            condition=or_(
                sent.sentence_id_start < 0,
                sent.sentence_id_end < sent.sentence_id_start,
                # sentence_id_end is inclusive
                sent.sentence_id_end
                >= func.cardinality(SourceDocumentDataORM.sentence_starts),
            ),
        )
        bbox = BBoxAnnotationORM
        bbox_ids = list(
            self.db.scalars(
                select(bbox.id)
                .where(bbox.project_id == project_id)
                .where(
                    or_(
                        bbox.x_min < 0,
                        bbox.y_min < 0,
                        bbox.x_max < bbox.x_min,
                        bbox.y_max < bbox.y_min,
                    )
                )
                .order_by(bbox.id)
            )
        )
        return (
            self._out_of_bounds_issue(
                project_id=project_id,
                kind="span",
                ids=span_ids,
                rule="characters or tokens beyond the text",
            )
            + self._out_of_bounds_issue(
                project_id=project_id,
                kind="sentence",
                ids=sentence_ids,
                rule="sentences beyond the text",
            )
            + self._out_of_bounds_issue(
                project_id=project_id,
                kind="bbox",
                ids=bbox_ids,
                rule="negative or inverted coordinates",
            )
        )

    # ==========================================================================
    # POSTGRES <-> ELASTICSEARCH
    # ==========================================================================
    def _check_elasticsearch(
        self, *, project_id: int, sdocs: list[SdocRow], data_ids: set[int]
    ) -> list[Issue]:
        index = SdocIndex.get_index_name(project_id=project_id)
        es_ids: set[int] = set()
        if self.es.indices.exists(index=index):
            es_ids = {
                int(hit["_id"])
                for hit in helpers.scan(
                    self.es,
                    index=index,
                    query={"query": {"match_all": {}}},
                    _source=False,
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
                    fix=ReindexEs(sdoc_ids=missing),
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
        prefix = f"{conf.elasticsearch.index_prefix}_project_"
        pattern = re.compile(rf"^{re.escape(prefix)}(\d+)_")
        indices = self.es.indices.get(index=f"{prefix}*", allow_no_indices=True)
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
    def _embedded_sdoc_ids(
        self, collection: type[BaseCollection], project_id: int
    ) -> set[int]:
        if not self.weaviate.collections.exists(collection.get_collection_name()):
            return set()
        handle = self.weaviate.collections.get(collection.get_collection_name())
        tenant = collection.get_tenant_name(project_id)
        if not handle.tenants.exists(tenant):
            return set()
        prop = collection.properties["sdoc_id"].name
        return {
            int(obj.properties[prop])  # type: ignore[arg-type]
            for obj in handle.with_tenant(tenant).iterator(return_properties=[prop])
            if obj.properties.get(prop) is not None
        }

    def _check_weaviate(self, *, project_id: int, sdocs: list[SdocRow]) -> list[Issue]:
        sdoc_ids = {sdoc.id for sdoc in sdocs}
        # the steps that write the embeddings of a collection
        embedding_steps: dict[str, str] = {
            SentenceCollection.name: "text_sentence_embedding",
            ImageCollection.name: "image_embedding",
        }
        sentence_counts: dict[int, int] = {
            sdoc_id: count
            for sdoc_id, count in self.db.execute(
                select(
                    SourceDocumentDataORM.id,
                    func.coalesce(
                        func.cardinality(SourceDocumentDataORM.sentence_starts), 0
                    ),
                )
                .join(SourceDocumentORM)
                .where(SourceDocumentORM.project_id == project_id)
            ).tuples()
        }

        issues: list[Issue] = []
        for collection in BaseCollection.all_collections():
            if "sdoc_id" not in collection.properties:
                continue
            embedded = self._embedded_sdoc_ids(collection, project_id)
            name = collection.get_collection_name()

            orphaned = sorted(embedded - sdoc_ids)
            if orphaned:
                issues.append(
                    Issue(
                        key=f"{CheckName.ORPHANED_EMBEDDINGS.value}:{project_id}:{name}",
                        check=CheckName.ORPHANED_EMBEDDINGS,
                        project_id=project_id,
                        message=f"{name} holds embeddings of {len(orphaned)} deleted "
                        f"SourceDocuments: {_ids_text(orphaned)}",
                        fix=DeleteEmbeddings(collection=name, sdoc_ids=orphaned),
                    )
                )

            step = embedding_steps.get(collection.name)
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
                        key=f"{CheckName.MISSING_EMBEDDINGS.value}:{project_id}:{name}",
                        check=CheckName.MISSING_EMBEDDINGS,
                        project_id=project_id,
                        message=f"{len(missing)} SourceDocuments have no embeddings in "
                        f"{name}: {_ids_text(missing)}",
                        fix=RecomputeStep(step=step, sdoc_ids=missing),
                        hint="Needs a running worker and the embedding service.",
                    )
                )
        return issues

    def _check_orphaned_weaviate_tenants(
        self, existing_project_ids: set[int]
    ) -> list[Issue]:
        pattern = re.compile(r"^Project(\d+)$")
        issues: list[Issue] = []
        for collection in BaseCollection.all_collections():
            name = collection.get_collection_name()
            if not self.weaviate.collections.exists(name):
                continue
            tenants = self.weaviate.collections.get(name).tenants.get()
            for tenant in sorted(tenants.keys()):
                match = pattern.match(tenant)
                if match is None or int(match.group(1)) in existing_project_ids:
                    continue
                issues.append(
                    Issue(
                        key=f"{CheckName.ORPHANED_WEAVIATE_TENANT.value}:{name}:{tenant}",
                        check=CheckName.ORPHANED_WEAVIATE_TENANT,
                        project_id=None,
                        message=f"Tenant {tenant} of {name} belongs to the deleted "
                        f"project {match.group(1)}",
                        fix=DeleteWeaviateTenant(collection=name, tenant=tenant),
                    )
                )
        return issues
