from typing import List

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase, UpdateDTOType, ORMModelType
from app.core.data.crud.document_tag import crud_document_tag
from app.core.data.dto.source_document import SourceDocumentCreate
from app.core.data.orm.document_tag import DocumentTagORM
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

    def remove_by_project(self, db: Session, *, proj_id: int) -> List[int]:
        statement = delete(self.model).where(self.model.project_id == proj_id).returning(self.model.id)
        removed_ids = db.execute(statement).fetchall()
        db.commit()
        return list(map(lambda t: t[0], removed_ids))

    def read_by_project_and_document_tag(self, db: Session, *, proj_id: int, tag_id: int) -> List[SourceDocumentORM]:
        return db.query(self.model).join(SourceDocumentORM, DocumentTagORM.source_documents) \
            .filter(self.model.project_id == proj_id, DocumentTagORM.id == tag_id).all()


crud_sdoc = CRUDSourceDocument(SourceDocumentORM)
