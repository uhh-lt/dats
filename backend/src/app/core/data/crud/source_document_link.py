from typing import Dict, List

from loguru import logger
from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import (
    CRUDBase,
    UpdateNotAllowed,
)
from app.core.data.crud.folder import crud_folder
from app.core.data.dto.source_document_link import SourceDocumentLinkCreate
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.source_document_link import SourceDocumentLinkORM


class CRUDSourceDocumentLink(
    CRUDBase[SourceDocumentLinkORM, SourceDocumentLinkCreate, UpdateNotAllowed]
):
    def update(self, db: Session, *, id: int, update_dto):
        raise NotImplementedError()

    def resolve_filenames_to_sdoc_ids(
        self, db: Session, proj_id: int
    ) -> List[SourceDocumentLinkORM]:
        query = db.query(self.model)
        query = query.join(
            SourceDocumentORM,
            SourceDocumentORM.id == self.model.parent_source_document_id,
        )
        query = query.filter(
            self.model.linked_source_document_id.is_(None),
            SourceDocumentORM.project_id == proj_id,
        )
        unresolved_links: List[SourceDocumentLinkORM] = query.all()

        query2 = db.query(SourceDocumentORM.filename, SourceDocumentORM.id)
        query2 = query2.filter(
            SourceDocumentORM.filename.in_(
                [link.linked_source_document_filename for link in unresolved_links]
            ),
            SourceDocumentORM.project_id == proj_id,
        )
        sdoc_fn_to_id: Dict[str, int] = {filename: id for filename, id in query2.all()}

        resolved_links: List[SourceDocumentLinkORM] = []
        folders_to_be_deleted: List[int] = []
        for link in unresolved_links:
            if link.linked_source_document_filename not in sdoc_fn_to_id:
                continue
            link.linked_source_document_id = sdoc_fn_to_id[
                link.linked_source_document_filename
            ]
            resolved_links.append(link)

            try:
                # changing the folder_id of the linked document to the parent document's folder and deleting original folder
                linked_doc = db.get(SourceDocumentORM, link.linked_source_document_id)
                parent_doc = db.get(SourceDocumentORM, link.parent_source_document_id)
                if not linked_doc or not parent_doc:
                    continue
                logger.info("----------", linked_doc.folder_id, parent_doc.folder_id)
                folders_to_be_deleted.append(linked_doc.folder_id)
                linked_doc.folder_id = parent_doc.folder_id
            except Exception as e:
                logger.error(f"Error processing link {link.id}: {e}")
                continue

        db.add_all(resolved_links)
        db.commit()
        crud_folder.remove_multi(db=db, ids=folders_to_be_deleted)
        return resolved_links

    def get_linked_sdocs(
        self, db: Session, parent_sdoc_id: int
    ) -> List[SourceDocumentLinkORM]:
        db_obj = (
            db.query(self.model)
            .filter(self.model.parent_source_document_id == parent_sdoc_id)
            .all()
        )
        return db_obj


crud_sdoc_link = CRUDSourceDocumentLink(SourceDocumentLinkORM)
