from fastapi.encoders import jsonable_encoder
from sqlalchemy import tuple_
from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase, NoSuchElementError
from app.core.data.dto.document_topic import (
    DocumentTopicCreate,
    DocumentTopicUpdate,
)
from app.core.data.orm.aspect import AspectORM
from app.core.data.orm.document_topic import DocumentTopicORM
from app.core.data.orm.topic import TopicORM


class CRUDDocumentTopic(
    CRUDBase[DocumentTopicORM, DocumentTopicCreate, DocumentTopicUpdate]
):
    def read_by_aspect(self, db: Session, *, aspect_id: int) -> list[DocumentTopicORM]:
        return (
            db.query(self.model)
            .join(TopicORM, TopicORM.id == self.model.topic_id)
            .join(AspectORM, AspectORM.id == TopicORM.aspect_id)
            .filter(AspectORM.id == aspect_id)
            .all()
        )

    def read_by_sdoc_topic(
        self, db: Session, *, sdoc_id: int, topic_id: int
    ) -> DocumentTopicORM:
        db_obj = (
            db.query(self.model)
            .filter(
                self.model.sdoc_id == sdoc_id,
                self.model.topic_id == topic_id,
            )
            .first()
        )
        if db_obj is None:
            raise NoSuchElementError(self.model, sdoc_id=sdoc_id, topic_id=topic_id)
        return db_obj

    def read_by_sdoc_topic_ids(
        self, db: Session, *, sdoc_topic_ids: list[tuple[int, int]]
    ) -> list[DocumentTopicORM]:
        return (
            db.query(self.model)
            .filter(tuple_(self.model.sdoc_id, self.model.topic_id).in_(sdoc_topic_ids))
            .all()
        )

    def update_by_sdoc_topic(
        self,
        db: Session,
        *,
        sdoc_id: int,
        topic_id: int,
        update_dto: DocumentTopicUpdate,
    ) -> DocumentTopicORM:
        db_obj = self.read_by_sdoc_topic(db=db, sdoc_id=sdoc_id, topic_id=topic_id)

        obj_data = jsonable_encoder(db_obj.as_dict())
        update_data = update_dto.model_dump(exclude_unset=True)
        for field in obj_data:
            if field in update_data:
                setattr(db_obj, field, update_data[field])
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)

        return db_obj

    def update_multi_by_sdoc_topic_ids(
        self,
        db: Session,
        *,
        sdoc_topic_ids: list[tuple[int, int]],
        update_dtos: list[DocumentTopicUpdate],
    ) -> list[DocumentTopicORM]:
        db_objs = self.read_by_sdoc_topic_ids(db=db, sdoc_topic_ids=sdoc_topic_ids)

        for db_obj, update_dto in zip(db_objs, update_dtos):
            obj_data = jsonable_encoder(db_obj.as_dict())
            update_data = update_dto.model_dump(exclude_unset=True)
            for field in obj_data:
                if field in update_data:
                    setattr(db_obj, field, update_data[field])
        db.add_all(db_objs)
        db.commit()
        return db_objs


crud_document_topic = CRUDDocumentTopic(DocumentTopicORM)
