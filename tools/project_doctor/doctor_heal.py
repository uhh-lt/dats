"""The fixes of the DATS project doctor. Each fix goes through the same services
and CRUDs that DATS itself uses, so it cleans up all stores at once."""

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
    RecomputeStep,
    ReindexEs,
)
from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from common.languages_enum import Language
from core.annotation.bbox_annotation_service import BBoxAnnotationService
from core.annotation.sentence_annotation_service import SentenceAnnotationService
from core.annotation.span_annotation_service import SpanAnnotationService
from core.doc.sdoc_elastic_crud import crud_sdoc_elastic
from core.doc.sdoc_elastic_dto import ElasticSearchDocumentCreate
from core.doc.sdoc_elastic_index import SdocIndex
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_data_crud import crud_sdoc_data
from core.doc.source_document_service import SourceDocumentService
from modules.doc_processing.doc_processing_dto import ProcessingSettings
from modules.doc_processing.doc_processing_service import DocProcessingService
from repos.elastic.elastic_repo import ElasticSearchRepo
from repos.filesystem_repo import FilesystemRepo
from repos.vector.collection_base import BaseCollection
from repos.vector.weaviate_repo import WeaviateRepo

# The steps that heal recomputes (thumbnails, embeddings) ignore the settings,
# but the recompute requires them
_RECOMPUTE_SETTINGS = ProcessingSettings(
    extract_images=False,
    pages_per_chunk=10,
    keyword_number=5,
    keyword_deduplication_threshold=0.5,
    keyword_max_ngram_size=2,
    language=Language.auto,
    model="",
)


class Healer:
    def __init__(self, *, db: Session, quarantine_dir: Path) -> None:
        self.db = db
        self.quarantine_dir = quarantine_dir
        self.fsr = FilesystemRepo()
        self.es = ElasticSearchRepo().get_client()
        self.weaviate = WeaviateRepo().get_client()

    @staticmethod
    def new_quarantine_dir() -> Path:
        """The folder of one heal run, inside the DATS filesystem (so that moving
        a file there never crosses a volume)."""
        return FilesystemRepo().root_dir.joinpath(
            "quarantine", datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        )

    def apply(self, issue: Issue) -> str:
        """Applies the fix of the issue and returns what it did."""
        fix: Fix | None = issue.fix
        match fix:
            case None:
                return "nothing to do (needs a manual decision)"
            case DeleteSdocs():
                result = SourceDocumentService().delete_multi(
                    db=self.db, sdoc_ids=fix.sdoc_ids
                )
                return f"deleted SourceDocuments {[s.id for s in result.sdocs]}"
            case QuarantinePath():
                return self._quarantine(Path(fix.path))
            case ReindexEs():
                return self._reindex_es(project_id=self._project_id(issue), fix=fix)
            case DeleteEsDocuments():
                deleted = crud_sdoc_elastic.delete_multi(
                    client=self.es, project_id=self._project_id(issue), ids=fix.sdoc_ids
                )
                return f"deleted {deleted} Elasticsearch documents"
            case DeleteEsIndex():
                self.es.indices.delete(index=fix.index)
                return f"deleted index {fix.index}"
            case RecomputeStep():
                return self._recompute(project_id=self._project_id(issue), fix=fix)
            case DeleteEmbeddings():
                collection = self._collection(fix.collection)
                collection.delete_by_sdoc_ids(
                    self.weaviate, self._project_id(issue), fix.sdoc_ids
                )
                return f"deleted embeddings of {len(fix.sdoc_ids)} SourceDocuments"
            case DeleteWeaviateTenant():
                self.weaviate.collections.get(fix.collection).tenants.remove(
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

    @staticmethod
    def _collection(name: str) -> type[BaseCollection]:
        for collection in BaseCollection.all_collections():
            if collection.get_collection_name() == name:
                return collection
        raise ValueError(f"Unknown Weaviate collection {name}")

    def _quarantine(self, path: Path) -> str:
        # only paths inside the DATS filesystem, the report may have been edited
        path = path.resolve()
        if not path.is_relative_to(self.fsr.root_dir.resolve()):
            raise ValueError(f"{path} lies outside of {self.fsr.root_dir}")
        dst = self.quarantine_dir / path.relative_to(self.fsr.root_dir.resolve())
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(path, dst)
        return f"moved to {dst}"

    def _reindex_es(self, *, project_id: int, fix: ReindexEs) -> str:
        SdocIndex.create_index(self.es, project_id=project_id)
        for sdoc in crud_sdoc.read_by_ids(db=self.db, ids=fix.sdoc_ids):
            sdoc_data = crud_sdoc_data.read(db=self.db, id=sdoc.id)
            crud_sdoc_elastic.create(
                client=self.es,
                project_id=project_id,
                create_dto=ElasticSearchDocumentCreate(
                    filename=sdoc.filename,
                    content=sdoc_data.content,
                    sdoc_id=sdoc.id,
                    project_id=project_id,
                    created=sdoc.created,
                ),
            )
        return f"indexed {len(fix.sdoc_ids)} SourceDocuments"

    def _recompute(self, *, project_id: int, fix: RecomputeStep) -> str:
        # the recompute needs documents of one doctype per call
        by_doctype: dict[DocType, list[int]] = {}
        for sdoc in crud_sdoc.read_by_ids(db=self.db, ids=fix.sdoc_ids):
            by_doctype.setdefault(DocType(sdoc.doctype), []).append(sdoc.id)
        jobs = []
        for sdoc_ids in by_doctype.values():
            jobs += DocProcessingService().recompute_processing_step(
                db=self.db,
                project_id=project_id,
                sdoc_ids=sdoc_ids,
                settings=_RECOMPUTE_SETTINGS,
                processing_step=fix.step,
            )
        return f"started {len(jobs)} {fix.step} jobs (see the worker logs)"

    def _delete_annotations(self, fix: DeleteAnnotations) -> str:
        match fix.kind:
            case "span":
                SpanAnnotationService().delete_multi(self.db, ids=fix.ids)
            case "sentence":
                SentenceAnnotationService().delete_multi(self.db, ids=fix.ids)
            case "bbox":
                BBoxAnnotationService().delete_multi(self.db, ids=fix.ids)
        return f"deleted {len(fix.ids)} {fix.kind} annotations"
