from typing import Optional, List

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase, UpdateDTOType, ORMModelType, NoSuchElementError
from app.core.data.crud.user import SYSTEM_USER_ID
from app.core.data.dto.action import ActionType, ActionTargetObjectType, ActionCreate
from app.core.data.dto.annotation_document import AnnotationDocumentCreate
from app.core.data.orm.annotation_document import AnnotationDocumentORM


class CRUDAnnotationDocument(CRUDBase[AnnotationDocumentORM, AnnotationDocumentCreate, None]):

    def update(self, db: Session, *, id: int, update_dto: UpdateDTOType) -> ORMModelType:
        # Flo: We no not want to update AnnotationDocument
        raise NotImplementedError()

    def read_by_sdoc_and_user(self, db: Session, *, sdoc_id: int, user_id: int, raise_error: bool = True) -> Optional[AnnotationDocumentORM]:
        db_obj = db.query(self.model).filter(self.model.source_document_id == sdoc_id,
                                             self.model.user_id == user_id).first()
        if raise_error and not db_obj:
            raise NoSuchElementError(self.model, sdoc_id=sdoc_id, user_id=user_id)
        return db_obj

    def exists_by_sdoc_and_user(self, db: Session, *, sdoc_id: int, user_id: int, raise_error: bool = False) -> \
            Optional[bool]:
        exists = db.query(self.model).filter(self.model.source_document_id == sdoc_id,
                                             self.model.user_id == user_id).first() is not None
        if not exists and raise_error:
            raise NoSuchElementError(self.model, id=id)
        return exists

    def remove_by_sdoc(self, db: Session, *, sdoc_id: int) -> List[int]:
        statement = delete(self.model).where(self.model.source_document_id == sdoc_id).returning(self.model.id)
        removed_ids = db.execute(statement).fetchall()
        db.commit()

        removed_ids = list(map(lambda t: t[0], removed_ids))

        from app.core.data.crud.source_document import crud_sdoc
        proj_id = crud_sdoc.read(db=db, id=sdoc_id).project_id

        from app.core.data.crud.action import crud_action
        for rid in removed_ids:
            create_dto = ActionCreate(project_id=proj_id,
                                      user_id=SYSTEM_USER_ID,
                                      action_type=ActionType.DELETE,
                                      target_id=rid,
                                      target_type=ActionTargetObjectType.annotation_document)
            crud_action.create(db=db, create_dto=create_dto)
        return removed_ids


crud_adoc = CRUDAnnotationDocument(AnnotationDocumentORM)
