from sqlalchemy.orm import Session

from common.singleton_meta import SingletonMeta
from core.annotation.annotation_document_crud import crud_adoc
from core.annotation.span_annotation_crud import crud_span_anno
from core.annotation.span_annotation_dto import SpanAnnotationRead
from core.annotation.span_group_crud import crud_span_group
from core.annotation.span_group_dto import (
    SpanGroupCreate,
    SpanGroupCreateIntern,
    SpanGroupRead,
    SpanGroupWithAnnotationsRead,
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

    def read_annotations(self, db: Session, *, id: int) -> list[SpanAnnotationRead]:
        """
        Read the span annotations of a span group.

        Args:
            id: The span group.

        Returns:
            The span annotations of the span group, ordered by id.

        Raises:
            NoSuchElementError: If the span group does not exist.
        """
        crud_span_group.exists(db=db, id=id, raise_error=True)
        span_ids = crud_span_group.read_span_annotation_ids(db=db, ids=[id])[id]
        return [
            SpanAnnotationRead.model_validate(span)
            for span in crud_span_anno.read_by_ids(db=db, ids=span_ids)
        ]

    def read_with_annotations_by_user_and_sdoc(
        self, db: Session, *, user_id: int, sdoc_id: int
    ) -> list[SpanGroupWithAnnotationsRead]:
        """
        Read the span groups of a user in a document, with their span annotations.

        Args:
            user_id: The user the span groups belong to.
            sdoc_id: The document.

        Returns:
            The span groups, each with its span annotations ordered by id.
        """
        groups = crud_span_group.read_by_user_and_sdoc(
            db=db, user_id=user_id, sdoc_id=sdoc_id
        )

        # the spans through crud_span_anno, which eager-loads what their DTO reads
        span_ids_by_group = crud_span_group.read_span_annotation_ids(
            db=db, ids=[group.id for group in groups]
        )
        span_dtos = {
            span.id: SpanAnnotationRead.model_validate(span)
            for span in crud_span_anno.read_by_ids(
                db=db,
                ids=[id for ids in span_ids_by_group.values() for id in ids],
            )
        }

        return [
            SpanGroupWithAnnotationsRead(
                **SpanGroupRead.model_validate(group).model_dump(),
                span_annotations=[
                    span_dtos[span_id] for span_id in span_ids_by_group[group.id]
                ],
            )
            for group in groups
        ]
