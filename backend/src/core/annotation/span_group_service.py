from sqlalchemy.orm import Session

from common.singleton_meta import SingletonMeta
from core.annotation.annotation_document_crud import crud_adoc
from core.annotation.span_annotation_crud import crud_span_anno
from core.annotation.span_annotation_dto import (
    SpanAnnotationCreateIntern,
    SpanAnnotationRead,
)
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
        self,
        db: Session,
        *,
        project_id: int,
        user_id: int,
        create_dto: SpanGroupCreate,
    ) -> SpanGroupRead:
        """
        Create a span group of a user, creating a missing annotation document. The
        composite foreign key rejects a document of another project (409).

        Args:
            project_id: The project of the span group.
            user_id: The user the span group belongs to.
            create_dto: The span group to create.

        Returns:
            The created span group.
        """
        # 1) find or create the user's annotation document
        adoc = crud_adoc.exists_or_create(
            db=db, project_id=project_id, user_id=user_id, sdoc_id=create_dto.sdoc_id
        )

        # 2) create the span group
        db_obj = crud_span_group.create(
            db=db,
            project_id=project_id,
            create_dto=SpanGroupCreateIntern(
                name=create_dto.name, annotation_document_id=adoc.id
            ),
        )
        return SpanGroupRead.model_validate(db_obj)

    def read_annotations(
        self, db: Session, *, project_id: int, id: int
    ) -> list[SpanAnnotationRead]:
        """
        Read the span annotations of a span group.

        Args:
            project_id: The project of the span group.
            id: The span group.

        Returns:
            The span annotations of the span group, ordered by id.

        Raises:
            NoSuchElementError: If the span group does not exist in the project.
        """
        crud_span_group.exists(db=db, project_id=project_id, id=id, raise_error=True)
        span_ids = crud_span_group.read_span_annotation_ids(
            db=db, project_id=project_id, ids=[id]
        )[id]
        return [
            SpanAnnotationRead.model_validate(span)
            for span in crud_span_anno.read_by_ids(
                db=db, project_id=project_id, ids=span_ids
            )
        ]

    def read_with_annotations_by_user(
        self, db: Session, *, project_id: int, user_id: int, sdoc_id: int | None
    ) -> list[SpanGroupWithAnnotationsRead]:
        """
        Read the span groups of a user in the project, optionally only those in a
        document, with their span annotations.

        Args:
            project_id: The project of the span groups.
            user_id: The user the span groups belong to.
            sdoc_id: Only the span groups in this document.

        Returns:
            The span groups ordered by id, each with its span annotations ordered by
            id.
        """
        groups = crud_span_group.read_by_user(
            db=db, project_id=project_id, user_id=user_id, sdoc_id=sdoc_id
        )

        # the spans through crud_span_anno, which eager-loads what their DTO reads
        span_ids_by_group = crud_span_group.read_span_annotation_ids(
            db=db, project_id=project_id, ids=[group.id for group in groups]
        )
        span_dtos = {
            span.id: SpanAnnotationRead.model_validate(span)
            for span in crud_span_anno.read_by_ids(
                db=db,
                project_id=project_id,
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

    def replace_groups(
        self,
        *,
        db: Session,
        project_id: int,
        annotation_document_id: int,
        name: str,
        code_ids: list[int],
        groups: list[list[SpanAnnotationCreateIntern]],
    ) -> None:
        """
        Replace the span annotations with these codes and the span groups of that
        name in an annotation document, e.g. the result of a recomputation.

        Args:
            project_id: The project of the annotation document.
            annotation_document_id: The annotation document to replace them in.
            name: The name of the span groups.
            code_ids: The codes of the span annotations to replace.
            groups: One list of span annotations per span group to create.

        Raises:
            ValueError: If a span annotation is not in the annotation document or has
                none of the codes, so that the next replacement would not remove it.
        """
        spans = [span for group in groups for span in group]
        foreign = [
            span.uuid
            for span in spans
            if span.annotation_document_id != annotation_document_id
            or span.code_id not in code_ids
        ]
        if foreign:
            raise ValueError(
                f"Span annotations {foreign} are not in annotation document "
                f"{annotation_document_id} or have none of the codes {code_ids}."
            )

        # 1) delete the span annotations with these codes and the groups of that name
        crud_span_anno.delete_by_adoc_and_codes(
            db=db,
            project_id=project_id,
            adoc_id=annotation_document_id,
            code_ids=code_ids,
        )
        crud_span_group.delete_by_adoc_and_name(
            db=db,
            project_id=project_id,
            annotation_document_id=annotation_document_id,
            name=name,
        )

        # 2) create the span annotations and one span group per inner list
        db_spans = iter(
            crud_span_anno.create_multi(db=db, project_id=project_id, create_dtos=spans)
        )
        db_groups = crud_span_group.create_multi(
            db=db,
            project_id=project_id,
            create_dtos=[
                SpanGroupCreateIntern(
                    name=name, annotation_document_id=annotation_document_id
                )
                for _ in groups
            ],
        )

        # 3) link each group to its span annotations
        crud_span_group.link_spans_multi(
            db=db,
            project_id=project_id,
            links={
                db_group.id: [next(db_spans).id for _ in group]
                for db_group, group in zip(db_groups, groups, strict=True)
            },
        )
