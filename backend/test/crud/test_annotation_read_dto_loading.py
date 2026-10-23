"""Annotation Read DTOs are built with a constant number of queries (no N+1)."""

from sqlalchemy.orm import Session

from core.annotation.span_annotation_crud import crud_span_anno
from core.annotation.span_annotation_dto import (
    SpanAnnotationRead,
    SpanAnnotationUpdateBulk,
)
from core.annotation.span_annotation_service import SpanAnnotationService

from .conftest import SdocWithSpanAnnotations, count_queries

# One query for the annotations plus one per eager-loaded relationship. Lazy loading
# needed about four queries per annotation, i.e. over 100 for the 30 fixture spans.
MAX_READ_QUERIES = 6


def test_read_by_user_and_sdoc_dtos_use_constant_queries(
    db_session: Session, sdoc_with_span_annotations: SdocWithSpanAnnotations
) -> None:
    db_session.expire_all()

    with count_queries(db_session) as queries:
        dtos = [
            SpanAnnotationRead.model_validate(span)
            for span in crud_span_anno.read_by_user_and_sdoc(
                db=db_session,
                user_id=sdoc_with_span_annotations["user_id"],
                sdoc_id=sdoc_with_span_annotations["sdoc_id"],
            )
        ]

    assert len(dtos) == 30
    assert {dto.text for dto in dtos} == {f"span {i}" for i in range(30)}
    assert queries() <= MAX_READ_QUERIES


def test_read_by_ids_dtos_use_constant_queries(
    db_session: Session, sdoc_with_span_annotations: SdocWithSpanAnnotations
) -> None:
    ids = sdoc_with_span_annotations["span_ids"][::-1]
    db_session.expire_all()

    with count_queries(db_session) as queries:
        dtos = [
            SpanAnnotationRead.model_validate(span)
            for span in crud_span_anno.read_by_ids(db=db_session, ids=ids)
        ]

    assert [dto.id for dto in dtos] == ids
    assert queries() <= MAX_READ_QUERIES


def test_service_update_multi_dtos_use_constant_queries(
    db_session: Session, sdoc_with_span_annotations: SdocWithSpanAnnotations
) -> None:
    ids = sdoc_with_span_annotations["span_ids"]
    code_id = sdoc_with_span_annotations["code_id"]
    db_session.expire_all()

    with count_queries(db_session) as queries:
        dtos = SpanAnnotationService().update_multi(
            db=db_session,
            update_dtos=[
                SpanAnnotationUpdateBulk(span_annotation_id=id, code_id=code_id)
                for id in ids
            ],
        )

    assert [dto.id for dto in dtos] == ids
    # read + UPDATE + adoc timestamp + the eager re-read for the DTOs
    assert queries() <= MAX_READ_QUERIES + 6
