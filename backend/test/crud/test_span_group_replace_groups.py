"""SpanGroupService.replace_groups replaces the generated spans and groups of an
annotation document, e.g. when coreferences or quotations are recomputed."""

from uuid import uuid4

import pytest
from sqlalchemy.orm import Session

from core.annotation.annotation_document_crud import crud_adoc
from core.annotation.span_annotation_crud import crud_span_anno
from core.annotation.span_annotation_dto import SpanAnnotationCreateIntern
from core.annotation.span_group_service import SpanGroupService

from .conftest import SdocWithMemosAndSpanGroup

GROUP_NAME = "replaced"


def _adoc_id(db: Session, fixture: SdocWithMemosAndSpanGroup) -> int:
    [adoc] = crud_adoc.read_by_user_and_sdocs(
        db=db, user_id=fixture["user_id"], sdoc_ids=[fixture["sdoc_id"]]
    )
    return adoc.id


def _spans(
    fixture: SdocWithMemosAndSpanGroup, adoc_id: int, texts: list[str]
) -> list[SpanAnnotationCreateIntern]:
    """One span of the fixture's code per text, span i covering characters
    [i, i + 1)."""
    return [
        SpanAnnotationCreateIntern(
            project_id=fixture["project_id"],
            uuid=str(uuid4()),
            begin=i,
            end=i + 1,
            begin_token=i,
            end_token=i + 1,
            span_text=text,
            code_id=fixture["code_id"],
            annotation_document_id=adoc_id,
        )
        for i, text in enumerate(texts)
    ]


def _groups_by_name(
    db: Session, fixture: SdocWithMemosAndSpanGroup
) -> dict[str, list[list[str]]]:
    """The texts of the spans of each group, by group name."""
    groups = SpanGroupService().read_with_annotations_by_user_and_sdoc(
        db=db, user_id=fixture["user_id"], sdoc_id=fixture["sdoc_id"]
    )
    by_name: dict[str, list[list[str]]] = {}
    for group in groups:
        by_name.setdefault(group.name, []).append(
            [span.text for span in group.span_annotations]
        )
    return by_name


def test_replace_groups_twice_leaves_exactly_the_second_set(
    db_session: Session, sdoc_with_memos_and_span_group: SdocWithMemosAndSpanGroup
) -> None:
    """The second call deletes the spans and groups of the first one; the first
    call deletes the fixture's 30 spans, which have the replaced code, but keeps
    its group "crud-group", which has another name."""
    fixture = sdoc_with_memos_and_span_group
    adoc_id = _adoc_id(db_session, fixture)

    for texts_by_group in (
        [["a", "b"], ["c"]],
        [["d"], ["e", "f", "g"], []],
    ):
        flat_texts = [text for texts in texts_by_group for text in texts]
        spans = iter(_spans(fixture, adoc_id, flat_texts))
        SpanGroupService().replace_groups(
            db=db_session,
            annotation_document_id=adoc_id,
            name=GROUP_NAME,
            code_ids=[fixture["code_id"]],
            groups=[[next(spans) for _ in texts] for texts in texts_by_group],
        )
    db_session.commit()

    assert _groups_by_name(db_session, fixture) == {
        "crud-group": [[]],
        GROUP_NAME: [["d"], ["e", "f", "g"], []],
    }
    remaining_texts = sorted(
        span.span_text.text
        for span in crud_span_anno.read_by_user_and_sdoc(
            db=db_session, user_id=fixture["user_id"], sdoc_id=fixture["sdoc_id"]
        )
    )
    assert remaining_texts == ["d", "e", "f", "g"]


def test_replace_groups_rejects_a_span_with_another_code(
    db_session: Session, sdoc_with_memos_and_span_group: SdocWithMemosAndSpanGroup
) -> None:
    """A span without one of the replaced codes would survive the next
    replacement, so it is rejected before anything is deleted."""
    fixture = sdoc_with_memos_and_span_group
    adoc_id = _adoc_id(db_session, fixture)
    [span] = _spans(fixture, adoc_id, ["a"])

    with pytest.raises(ValueError, match=span.uuid):
        SpanGroupService().replace_groups(
            db=db_session,
            annotation_document_id=adoc_id,
            name=GROUP_NAME,
            code_ids=[fixture["code_id"] + 1],
            groups=[[span]],
        )

    assert _groups_by_name(db_session, fixture) == {
        "crud-group": [[f"span {i}" for i in range(30)]]
    }


def test_replace_groups_without_codes_deletes_only_the_groups_of_that_name(
    db_session: Session, sdoc_with_memos_and_span_group: SdocWithMemosAndSpanGroup
) -> None:
    """With no codes and no groups, the call deletes the fixture's group
    "crud-group" and keeps all 30 spans."""
    fixture = sdoc_with_memos_and_span_group
    adoc_id = _adoc_id(db_session, fixture)

    SpanGroupService().replace_groups(
        db=db_session,
        annotation_document_id=adoc_id,
        name="crud-group",
        code_ids=[],
        groups=[],
    )
    db_session.commit()

    assert _groups_by_name(db_session, fixture) == {}
    remaining_ids = sorted(
        span.id
        for span in crud_span_anno.read_by_user_and_sdoc(
            db=db_session, user_id=fixture["user_id"], sdoc_id=fixture["sdoc_id"]
        )
    )
    assert remaining_ids == fixture["span_ids"]
