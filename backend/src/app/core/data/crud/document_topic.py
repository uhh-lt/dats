from fastapi.encoders import jsonable_encoder
from sqlalchemy import tuple_, update
from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase, NoSuchElementError
from app.core.data.dto.document_topic import (
    DocumentTopicCreate,
    DocumentTopicUpdate,
)
from app.core.data.orm.document_topic import DocumentTopicORM
from app.core.data.orm.topic import TopicORM


class CRUDDocumentTopic(
    CRUDBase[DocumentTopicORM, DocumentTopicCreate, DocumentTopicUpdate]
):
    def read_by_aspect(self, db: Session, *, aspect_id: int) -> list[DocumentTopicORM]:
        return (
            db.query(self.model)
            .join(TopicORM, TopicORM.id == self.model.topic_id)
            .filter(TopicORM.aspect_id == aspect_id)
            .all()
        )

    def read_by_aspect_and_topic_id(
        self, db: Session, *, aspect_id: int, topic_id: int
    ) -> list[DocumentTopicORM]:
        return (
            db.query(self.model)
            .join(TopicORM, TopicORM.id == self.model.topic_id)
            .filter(TopicORM.aspect_id == aspect_id, self.model.topic_id == topic_id)
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

    def merge_topics(
        self,
        db: Session,
        *,
        topic_to_keep: int,
        topic_to_merge: int,
    ) -> None:
        """
        Merge two topics by updating the topic_id of all DocumentTopicORM entries
        that belong to the topic being merged into the topic that is kept.
        Args:
            db: The database session
            topic_to_keep: The ID of the topic that will be kept
            topic_to_merge: The ID of the topic that will be merged into the kept topic
        Raises:
            NoSuchElementError: If the topic to merge does not exist
            IntegrityError: If the merge operation violates database constraints
        """
        # No actual merge operation needed.
        if topic_to_keep == topic_to_merge:
            return

        # Check if the topic to merge exists
        self.read(db=db, id=topic_to_merge)
        self.read(db=db, id=topic_to_keep)

        # Update all DocumentTopicORM entries that reference the topic to merge
        stmt = (
            update(self.model)
            .where(self.model.topic_id == topic_to_merge)
            .values(topic_id=topic_to_keep)
            .execution_options(
                synchronize_session=False
            )  # Recommended for bulk updates
        )

        try:
            db.execute(stmt)
            db.commit()
        except Exception:
            db.rollback()
            raise  # Re-raise the database exception (e.g., IntegrityError)

    def set_labels(
        self,
        db: Session,
        *,
        aspect_id: int,
        sdoc_ids: list[int],
        is_accepted: bool,
    ) -> int:
        """
        Accepts the labels for the provided SourceDocuments (by ID) of the aspect.
        Args:
            db: The database session
            aspect_id: The ID of the aspect to which the topic belongs
            sdoc_ids: List of SourceDocument IDs to accept labels for
            is_accepted: Whether to set the labels as accepted
        Returns:
            The number of DocumentTopicORM objects that were updated
        """
        if not sdoc_ids:
            return 0

        stmt = (
            update(self.model)
            .where(
                self.model.sdoc_id.in_(sdoc_ids),
                self.model.topic_id == TopicORM.id,
                TopicORM.aspect_id == aspect_id,
            )
            .values(is_accepted=is_accepted)
            .execution_options(synchronize_session=False)
        )
        results = db.execute(stmt)
        db.commit()

        return results.rowcount if results.rowcount is not None else 0

    def set_labels2(
        self,
        db: Session,
        *,
        aspect_id: int,
        topic_id: int,
        sdoc_ids: list[int],
        is_accepted: bool,
    ) -> int:
        """
        Sets the Topic <-> SourceDocument assignments to the provided Topic.
        Args:
            db: The database session
            aspect_id: The ID of the aspect to which the topic belongs
            topic_id: The ID of the topic to which the SourceDocuments should be assigned
            sdoc_ids: List of SourceDocument IDs to set topic for
            is_accepted: Whether to set the labels as accepted
        Returns:
            The number of DocumentTopicORM objects that were updated
        """
        if not sdoc_ids:
            return 0

        stmt = (
            update(self.model)
            .where(
                self.model.sdoc_id.in_(sdoc_ids),
                self.model.topic_id == TopicORM.id,
                TopicORM.aspect_id == aspect_id,
            )
            .values(topic_id=topic_id, is_accepted=is_accepted)
            .execution_options(synchronize_session=False)
        )
        results = db.execute(stmt)
        db.commit()

        return results.rowcount if results.rowcount is not None else 0


crud_document_topic = CRUDDocumentTopic(DocumentTopicORM)
