from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase, UpdateDTOType, ORMModelType
from app.core.data.crud.document_tag import crud_document_tag
from app.core.data.dto.source_document import SourceDocumentCreate
from app.core.data.orm.source_document import SourceDocumentORM


class CRUDSourceDocument(CRUDBase[SourceDocumentORM, SourceDocumentCreate, None]):

    def update(self, db: Session, *, id: int, update_dto: UpdateDTOType) -> ORMModelType:
        # Flo: We no not want to update SourceDocument
        raise NotImplementedError()

    def link_document_tag(self, db: Session, *, sdoc_id: int, tag_id: int) -> SourceDocumentORM:
        sdoc_db_obj = self.read(db=db, id=sdoc_id)
        doc_tag_db_obj = crud_document_tag.read(db=db, id=tag_id)
        sdoc_db_obj.document_tags.append(doc_tag_db_obj)
        db.add(sdoc_db_obj)
        db.commit()
        db.refresh(sdoc_db_obj)
        return sdoc_db_obj

    def unlink_document_tag(self, db: Session, *, sdoc_id: int, tag_id: int) -> SourceDocumentORM:
        sdoc_db_obj = self.read(db=db, id=sdoc_id)
        doc_tag_db_obj = crud_document_tag.read(db=db, id=tag_id)
        sdoc_db_obj.document_tags.remove(doc_tag_db_obj)
        db.commit()
        db.refresh(sdoc_db_obj)
        return sdoc_db_obj

    def unlink_all_document_tags(self, db: Session, *, sdoc_id: int) -> SourceDocumentORM:
        db_obj = self.read(db=db, id=sdoc_id)
        db_obj.document_tags = []
        db.commit()
        db.refresh(db_obj)
        return db_obj


crud_sdoc = CRUDSourceDocument(SourceDocumentORM)
