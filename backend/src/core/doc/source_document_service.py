from loguru import logger
from sqlalchemy.orm import Session

from common.singleton_meta import SingletonMeta
from core.doc.sdoc_elastic_crud import crud_sdoc_elastic
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_dto import SourceDocumentRead
from repos.elastic.elastic_repo import ElasticSearchRepo
from repos.filesystem_exceptions import SourceDocumentNotFoundInFilesystemError
from repos.filesystem_repo import FilesystemRepo
from repos.vector.collection_base import BaseCollection
from repos.vector.weaviate_repo import WeaviateRepo


class SourceDocumentService(metaclass=SingletonMeta):
    """Service to delete SourceDocuments from all stores."""

    def __new__(cls, *args, **kwargs):
        cls.fsr = FilesystemRepo()
        cls.es_repo = ElasticSearchRepo()
        cls.weaviate = WeaviateRepo()
        return super(SourceDocumentService, cls).__new__(cls)

    def delete(self, *, db: Session, sdoc_id: int) -> SourceDocumentRead:
        return self.delete_multi(db=db, sdoc_ids=[sdoc_id])[0]

    def delete_multi(
        self, *, db: Session, sdoc_ids: list[int]
    ) -> list[SourceDocumentRead]:
        """Deletes the SourceDocuments with their files, Elasticsearch documents
        and Weaviate objects. Raises NoSuchElementError if an ID does not exist."""
        if not sdoc_ids:
            return []

        # 1) read the documents (raises if one does not exist)
        sdocs = [
            SourceDocumentRead.model_validate(sdoc)
            for sdoc in crud_sdoc.read_by_ids(db=db, ids=sdoc_ids)
        ]

        # 2) delete the documents and all connected rows via cascading delete
        crud_sdoc.delete_multi(db=db, ids=sdoc_ids)

        # 3) delete the files from the filesystem (a missing file does not
        #    block the deletion, the document is gone either way)
        for sdoc in sdocs:
            try:
                self.fsr.remove_sdoc_file(sdoc=sdoc)
            except SourceDocumentNotFoundInFilesystemError:
                logger.warning(f"File of SourceDocument {sdoc.id} was already missing")

        # 4) delete the Elasticsearch documents and Weaviate objects per project
        ids_by_project: dict[int, list[int]] = {}
        for sdoc in sdocs:
            ids_by_project.setdefault(sdoc.project_id, []).append(sdoc.id)
        es_client = self.es_repo.get_client()
        weaviate_client = self.weaviate.get_client()
        for project_id, ids in ids_by_project.items():
            crud_sdoc_elastic.delete_multi(
                client=es_client, project_id=project_id, ids=ids
            )
            for collection in BaseCollection.all_collections():
                collection.delete_by_sdoc_ids(weaviate_client, project_id, ids)

        return sdocs
