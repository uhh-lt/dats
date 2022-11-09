from typing import List, Dict

from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase, UpdateDTOType, ORMModelType
from app.core.data.dto.source_document_link import SourceDocumentLinkCreate
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.source_document_link import SourceDocumentLinkORM


class CRUDSourceDocumentLink(CRUDBase[SourceDocumentLinkORM,
                                      SourceDocumentLinkCreate,
                                      None]):

    def update(self, db: Session, *, id: int, update_dto: UpdateDTOType) -> ORMModelType:
        raise NotImplementedError()

    def resolve_filenames_to_sdoc_ids(self, db: Session) -> None:
        unresolved_links: List[SourceDocumentLinkORM] = db.query(self.model).filter(
            self.model.linked_source_document_id.is_(None)).all()

        # noinspection PyTypeChecker
        sdoc_fn_to_id: Dict[str, int] = dict(db.query(SourceDocumentORM.filename, SourceDocumentORM.id).filter(
            SourceDocumentORM.filename.in_([link.linked_source_document_filename for link in unresolved_links])).all())

        for link in unresolved_links:
            if link.linked_source_document_filename not in sdoc_fn_to_id:
                continue
            link.linked_source_document_id = sdoc_fn_to_id[link.linked_source_document_filename]
            db.add(link)
            db.commit()
            db.refresh(link)

    def get_linked_sdocs(self, db: Session, parent_sdoc_id: int) -> List[SourceDocumentLinkORM]:
        db_obj = db.query(self.model).filter(self.model.parent_source_document_id == parent_sdoc_id).all()
        return db_obj


crud_sdoc_link = CRUDSourceDocumentLink(SourceDocumentLinkORM)
