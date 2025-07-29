from core.doc.folder_crud import crud_folder
from core.doc.source_document_link_dto import SourceDocumentLinkCreate
from core.doc.source_document_link_orm import SourceDocumentLinkORM
from core.doc.source_document_orm import SourceDocumentORM
from repos.db.crud_base import CRUDBase, UpdateNotAllowed
from sqlalchemy.orm import Session


class CRUDSourceDocumentLink(
    CRUDBase[SourceDocumentLinkORM, SourceDocumentLinkCreate, UpdateNotAllowed]
):
    def update(self, db: Session, *, id: int, update_dto):
        raise NotImplementedError()

    def resolve_filenames_to_sdoc_ids(
        self, db: Session, proj_id: int
    ) -> list[SourceDocumentLinkORM]:
        query = db.query(self.model)
        query = query.join(
            SourceDocumentORM,
            SourceDocumentORM.id == self.model.parent_source_document_id,
        )
        query = query.filter(
            self.model.linked_source_document_id.is_(None),
            SourceDocumentORM.project_id == proj_id,
        )
        unresolved_links: list[SourceDocumentLinkORM] = query.all()

        query2 = db.query(SourceDocumentORM.filename, SourceDocumentORM.id)
        query2 = query2.filter(
            SourceDocumentORM.filename.in_(
                [link.linked_source_document_filename for link in unresolved_links]
            ),
            SourceDocumentORM.project_id == proj_id,
        )
        sdoc_fn_to_id: dict[str, int] = {filename: id for filename, id in query2.all()}

        resolved_links: list[SourceDocumentLinkORM] = []
        resolved_folders: list[SourceDocumentORM] = []
        folders_to_be_deleted: list[int] = []
        for link in unresolved_links:
            # resolve links
            if link.linked_source_document_filename not in sdoc_fn_to_id:
                continue
            link.linked_source_document_id = sdoc_fn_to_id[
                link.linked_source_document_filename
            ]
            resolved_links.append(link)

            # resolve folders: change folder_id of linked document, remove old folder
            linked_doc = db.get(SourceDocumentORM, link.linked_source_document_id)
            parent_doc = db.get(SourceDocumentORM, link.parent_source_document_id)
            if not linked_doc or not parent_doc:
                continue
            folders_to_be_deleted.append(linked_doc.folder_id)
            linked_doc.folder_id = parent_doc.folder_id
            resolved_folders.append(linked_doc)

        db.add_all(resolved_links)
        db.add_all(resolved_folders)
        db.commit()
        crud_folder.remove_multi(db=db, ids=folders_to_be_deleted)
        return resolved_links

    def get_linked_sdocs(
        self, db: Session, parent_sdoc_id: int
    ) -> list[SourceDocumentLinkORM]:
        db_obj = (
            db.query(self.model)
            .filter(self.model.parent_source_document_id == parent_sdoc_id)
            .all()
        )
        return db_obj


crud_sdoc_link = CRUDSourceDocumentLink(SourceDocumentLinkORM)
