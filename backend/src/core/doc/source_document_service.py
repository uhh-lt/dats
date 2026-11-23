from sqlalchemy.orm import Session

from common.crud_enum import Crud
from common.singleton_meta import SingletonMeta
from core.artefacts.thumbnail.thumbnail_artefact import THUMBNAIL
from core.artefacts.thumbnail.thumbnail_file_crud import (
    IMAGE_FILENAME,
    THUMBNAIL_FILENAME,
)
from core.doc.folder_crud import crud_folder
from core.doc.folder_dto import FolderRead
from core.doc.sdoc_elastic_crud import crud_sdoc_elastic
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_dto import (
    SourceDocumentDeleteResult,
    SourceDocumentRead,
    SourceDocumentUrls,
)
from core.doc.source_document_file_crud import crud_sdoc_file
from repos.elastic.elastic_repo import ElasticSearchRepo
from repos.filesystem.file_crud_base import FileCRUDBase
from repos.vector.collection_base import BaseCollection
from repos.vector.weaviate_repo import WeaviateRepo


class SourceDocumentService(metaclass=SingletonMeta):
    """Service to read the file URLs of SourceDocuments and to delete them
    from all stores."""

    def __new__(cls, *args, **kwargs):
        cls.es_repo = ElasticSearchRepo()
        cls.weaviate = WeaviateRepo()
        return super(SourceDocumentService, cls).__new__(cls)

    def read_urls(self, *, db: Session, sdoc_id: int) -> SourceDocumentUrls:
        """The URLs of the uploaded file and of the WebP image and thumbnail
        (None if they do not exist)."""
        sdoc = crud_sdoc.read(db=db, id=sdoc_id)

        def thumbnail_url(name: str) -> str | None:
            if not THUMBNAIL.store.exists(
                project_id=sdoc.project_id, id=sdoc.id, name=name
            ):
                return None
            return THUMBNAIL.store.url(
                project_id=sdoc.project_id, id=sdoc.id, name=name
            )

        return SourceDocumentUrls(
            file_url=crud_sdoc_file.url(
                project_id=sdoc.project_id, id=sdoc.id, name=sdoc.filename
            ),
            image_url=thumbnail_url(IMAGE_FILENAME),
            thumbnail_url=thumbnail_url(THUMBNAIL_FILENAME),
        )

    def delete(self, *, db: Session, sdoc_id: int) -> SourceDocumentDeleteResult:
        return self.delete_multi(db=db, sdoc_ids=[sdoc_id])

    def delete_multi(
        self, *, db: Session, sdoc_ids: list[int]
    ) -> SourceDocumentDeleteResult:
        """Deletes the SourceDocuments with their files, Elasticsearch documents
        and Weaviate objects, and their SDOC_FOLDERs that are empty afterwards.
        Raises NoSuchElementError if an ID does not exist."""
        if not sdoc_ids:
            return SourceDocumentDeleteResult(sdocs=[], folders=[])

        # 1) read the documents (raises if one does not exist)
        sdocs = [
            SourceDocumentRead.model_validate(sdoc)
            for sdoc in crud_sdoc.read_by_ids(db=db, ids=sdoc_ids)
        ]

        # 2) delete the documents and all connected rows via cascading delete
        crud_sdoc.delete_multi(db=db, ids=sdoc_ids)

        # 3) delete the SDOC_FOLDERs that are empty now (an SDOC_FOLDER may hold
        #    further documents, e.g. chunks of the same file, then it stays)
        folders = [
            FolderRead.model_validate(folder)
            for folder in crud_folder.read_empty_sdoc_folders(
                db=db, folder_ids=list({sdoc.folder_id for sdoc in sdocs})
            )
        ]
        crud_folder.delete_multi(db=db, ids=[folder.id for folder in folders])

        # 4) delete the files, Elasticsearch documents and Weaviate objects per
        #    project: the folders of the documents in every file CRUD
        ids_by_project: dict[int, list[int]] = {}
        for sdoc in sdocs:
            ids_by_project.setdefault(sdoc.project_id, []).append(sdoc.id)
        es_client = self.es_repo.get_client()
        weaviate_client = self.weaviate.get_client()
        for project_id, ids in ids_by_project.items():
            FileCRUDBase.delete_by_entity(
                Crud.SOURCE_DOCUMENT, project_id=project_id, ids=ids
            )
            crud_sdoc_elastic.delete_multi(
                client=es_client, project_id=project_id, ids=ids
            )
            for collection in BaseCollection.all_collections():
                collection.delete_by_sdoc_ids(weaviate_client, project_id, ids)

        return SourceDocumentDeleteResult(sdocs=sdocs, folders=folders)
