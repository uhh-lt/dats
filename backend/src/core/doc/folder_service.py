from sqlalchemy.orm import Session

from common.singleton_meta import SingletonMeta
from core.doc.folder_crud import crud_folder
from core.doc.folder_dto import FolderRead
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_service import SourceDocumentService


class FolderService(metaclass=SingletonMeta):
    """Service to delete folders together with their SourceDocuments."""

    def __new__(cls, *args, **kwargs):
        cls.sdocs = SourceDocumentService()
        return super(FolderService, cls).__new__(cls)

    def delete_folder(self, *, db: Session, folder_id: int) -> FolderRead:
        # 1) find the SourceDocuments in the folder and all of its subfolders
        folder_ids = [
            folder.id
            for folder in crud_folder.read_with_children(db=db, folder_id=folder_id)
        ]
        sdoc_ids = crud_sdoc.read_ids_by_folder_ids(db=db, folder_ids=folder_ids)

        # 2) delete them from all stores (the cascade would only delete the rows)
        self.sdocs.delete_multi(db=db, sdoc_ids=sdoc_ids)

        # 3) delete the folder and its subfolders via cascading delete
        return FolderRead.model_validate(crud_folder.delete(db=db, id=folder_id))
