from sqlalchemy.orm import Session

from common.singleton_meta import SingletonMeta
from core.annotation.annotation_document_crud import crud_adoc
from core.annotation.span_group_crud import crud_span_group
from core.annotation.span_group_dto import (
    SpanGroupCreate,
    SpanGroupCreateIntern,
    SpanGroupRead,
)


class SpanGroupService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        return super(SpanGroupService, cls).__new__(cls)

    def create(
        self, db: Session, *, user_id: int, create_dto: SpanGroupCreate
    ) -> SpanGroupRead:
        """
        Create a span group of a user, creating a missing annotation document.

        Args:
            user_id: The user the span group belongs to.
            create_dto: The span group to create.

        Returns:
            The created span group.
        """
        # 1) find or create the user's annotation document
        adoc = crud_adoc.exists_or_create(
            db=db, user_id=user_id, sdoc_id=create_dto.sdoc_id
        )

        # 2) create the span group
        db_obj = crud_span_group.create(
            db=db,
            create_dto=SpanGroupCreateIntern(
                name=create_dto.name, annotation_document_id=adoc.id
            ),
        )
        return SpanGroupRead.model_validate(db_obj)
