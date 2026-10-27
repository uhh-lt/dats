"""Shared constants and request helpers for the annotation provenance tests."""

from typing import Any, Literal

from fastapi.testclient import TestClient

from core.annotation.bbox_annotation_dto import BBoxAnnotationCreate, BBoxAnnotationRead
from core.annotation.sentence_annotation_dto import (
    SentenceAnnotationCreate,
    SentenceAnnotationRead,
)
from core.annotation.span_annotation_dto import SpanAnnotationCreate, SpanAnnotationRead
from core.memo.memo_dto import MemoRead
from core.memo.memo_enum import AttachedObjectType

AnnotationKind = Literal["span", "sentence", "bbox"]
ANNOTATION_KINDS: list[AnnotationKind] = ["span", "sentence", "bbox"]

ATTACHED_OBJECT_TYPE: dict[AnnotationKind, AttachedObjectType] = {
    "span": AttachedObjectType.span_annotation,
    "sentence": AttachedObjectType.sentence_annotation,
    "bbox": AttachedObjectType.bbox_annotation,
}


AnnotationRead = SpanAnnotationRead | SentenceAnnotationRead | BBoxAnnotationRead

READ_DTO: dict[AnnotationKind, type[AnnotationRead]] = {
    "span": SpanAnnotationRead,
    "sentence": SentenceAnnotationRead,
    "bbox": BBoxAnnotationRead,
}


def create_payload(
    kind: AnnotationKind,
    *,
    sdoc_id: int,
    code_id: int,
    position: int,
    source_annotation_id: int | None = None,
) -> dict[str, Any]:
    """The create body of an annotation at a position, as in the fixture docstring."""
    match kind:
        case "span":
            return SpanAnnotationCreate(
                span_text=f"span {position}",
                begin=10 * position,
                end=10 * position + 4,
                begin_token=2 * position,
                end_token=2 * position + 1,
                code_id=code_id,
                sdoc_id=sdoc_id,
                source_annotation_id=source_annotation_id,
            ).model_dump()
        case "sentence":
            return SentenceAnnotationCreate(
                sentence_id_start=position,
                sentence_id_end=position,
                code_id=code_id,
                sdoc_id=sdoc_id,
                source_annotation_id=source_annotation_id,
            ).model_dump()
        case "bbox":
            return BBoxAnnotationCreate(
                x_min=10 * position,
                x_max=10 * position + 5,
                y_min=10 * position,
                y_max=10 * position + 5,
                code_id=code_id,
                sdoc_id=sdoc_id,
                source_annotation_id=source_annotation_id,
            ).model_dump()


def get_annotation(
    client: TestClient, kind: AnnotationKind, annotation_id: int
) -> AnnotationRead:
    response = client.get(f"/{kind}/{annotation_id}")
    assert response.status_code == 200, response.text
    return READ_DTO[kind].model_validate(response.json())


def get_memos(
    client: TestClient, kind: AnnotationKind, annotation_id: int
) -> list[MemoRead]:
    response = client.get(
        f"/memo/attached_obj/{ATTACHED_OBJECT_TYPE[kind].value}/to/{annotation_id}"
    )
    assert response.status_code == 200, response.text
    return [MemoRead.model_validate(memo) for memo in response.json()]


def get_user_annotation_ids(
    client: TestClient, kind: AnnotationKind, sdoc_id: int, user_id: int
) -> set[int]:
    response = client.get(f"/{kind}/sdoc/{sdoc_id}/user/{user_id}")
    assert response.status_code == 200, response.text
    if kind == "sentence":
        # sentence annotations come grouped by sentence
        return {
            annotation["id"]
            for annotations in response.json()["sentence_annotations"].values()
            for annotation in annotations
        }
    return {annotation["id"] for annotation in response.json()}
