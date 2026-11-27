from collections.abc import Callable, Iterator
from contextlib import contextmanager
from datetime import datetime
from typing import Any, TypedDict
from uuid import uuid4

import pytest
from sqlalchemy import event
from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from common.meta_type_enum import MetaType
from composite_keys_test_utils import (
    TenantRows,
    TwinProjects,
    TwoTenants,
    create_tenant_rows,
    create_twin,
    create_twin_projects,
    create_two_tenants,
)
from core.annotation.span_annotation_dto import SpanAnnotationCreate
from core.annotation.span_annotation_service import SpanAnnotationService
from core.annotation.span_group_crud import crud_span_group
from core.annotation.span_group_dto import SpanGroupCreate
from core.annotation.span_group_service import SpanGroupService
from core.artefacts.word_frequencies.word_frequency_crud import crud_word_frequency
from core.artefacts.word_frequencies.word_frequency_dto import WordFrequencyCreate
from core.code.code_crud import crud_code
from core.code.code_dto import CodeCreate
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_dto import SourceDocumentCreate
from core.doc.source_document_orm import SourceDocumentORM
from core.memo.memo_crud import crud_memo
from core.memo.memo_dto import MemoCreateIntern
from core.memo.memo_enum import AttachedObjectType
from core.metadata.project_metadata_orm import ProjectMetadataORM
from core.metadata.source_document_metadata_orm import SourceDocumentMetadataORM
from core.project.project_orm import ProjectORM
from core.tag.tag_crud import crud_tag
from core.tag.tag_dto import TagCreate
from core.tag.tag_orm import TagORM
from dats_test_utils import create_text_document
from feature_test_utils import create_project_with_features
from modules.timeline_analysis.timeline_analysis_enum import TimelineAnalysisType
from pipeline_test_utils import set_step_status


@contextmanager
def count_queries(db: Session) -> Iterator[Callable[[], int]]:
    """Count the SQL statements the session executes inside the block."""
    count = 0

    def on_execute(*args: object, **kwargs: object) -> None:
        nonlocal count
        count += 1

    engine = db.get_bind()
    event.listen(engine, "before_cursor_execute", on_execute)
    try:
        yield lambda: count
    finally:
        event.remove(engine, "before_cursor_execute", on_execute)


class ProjectWithTags(TypedDict):
    project: ProjectORM
    tags: list[TagORM]


@pytest.fixture(scope="function")
def project_with_tags(db_session, test_project) -> ProjectWithTags:
    """
    This fixture sets up the following project:

    - The test project of the test user.
    - Five root tags (no parent, no description) named "Tag 0" to "Tag 4", created in
      this order with one `create_multi` call. `tags[i]` is "Tag i".

    Non-obvious derived behavior:

    - The tag ids ascend with the names, so reading them in any other order tests
      that the CRUD restores the input order instead of returning id order.
    """
    tags = crud_tag.create_multi(
        db=db_session,
        project_id=test_project.id,
        create_dtos=[TagCreate(name=f"Tag {i}", color="#000000") for i in range(5)],
    )
    db_session.commit()

    return {"project": test_project, "tags": tags}


class SdocWithWordFrequencies(TypedDict):
    sdoc_id: int
    words: list[str]


@pytest.fixture(scope="function")
def sdoc_with_word_frequencies(
    db_session, project_with_sdoc
) -> SdocWithWordFrequencies:
    """
    This fixture sets up the following project:

    - The project and source document of `project_with_sdoc`.
    - Four word frequencies of that document, created in this order with one
      `create_multi` call: "crud-alpha" (count 1), "crud-beta" (count 2),
      "crud-gamma" (count 3), "crud-delta" (count 4). `words[i]` has count i + 1.

    Non-obvious derived behavior:

    - Word frequencies have the composite primary key (sdoc_id, word), so their ids
      are `(sdoc_id, word)` tuples.
    """
    sdoc_id = project_with_sdoc["source_document"].id
    words = ["crud-alpha", "crud-beta", "crud-gamma", "crud-delta"]
    crud_word_frequency.create_multi(
        db=db_session,
        create_dtos=[
            WordFrequencyCreate(
                project_id=project_with_sdoc["source_document"].project_id,
                sdoc_id=sdoc_id,
                word=word,
                count=i + 1,
            )
            for i, word in enumerate(words)
        ],
    )
    db_session.commit()

    return {"sdoc_id": sdoc_id, "words": words}


class SdocWithSpanAnnotations(TypedDict):
    project_id: int
    sdoc_id: int
    user_id: int
    code_id: int
    span_ids: list[int]


@pytest.fixture(scope="function")
def sdoc_with_span_annotations(
    db_session, project_with_sdoc, test_user
) -> SdocWithSpanAnnotations:
    """
    This fixture sets up the following project:

    - The project and source document of `project_with_sdoc`, and the test user.
    - One code "crud-code".
    - 30 span annotations of the test user on that document with code "crud-code",
      span i covering characters [i, i + 1) with the text "span i" (all texts differ).

    Non-obvious derived behavior:

    - All spans share one annotation document (test user, document), have no span
      groups and no memos.
    """
    project = project_with_sdoc["project"]
    sdoc_id = project_with_sdoc["source_document"].id
    code = crud_code.create(
        db=db_session,
        project_id=project.id,
        create_dto=CodeCreate(
            name="crud-code",
            color="red",
            description="",
            is_system=False,
        ),
    )
    spans = SpanAnnotationService().create_multi(
        db=db_session,
        project_id=project.id,
        user_id=test_user.id,
        create_dtos=[
            SpanAnnotationCreate(
                span_text=f"span {i}",
                begin=i,
                end=i + 1,
                begin_token=i,
                end_token=i + 1,
                code_id=code.id,
                sdoc_id=sdoc_id,
            )
            for i in range(30)
        ],
    )
    db_session.commit()

    return {
        "project_id": project.id,
        "sdoc_id": sdoc_id,
        "user_id": test_user.id,
        "code_id": code.id,
        "span_ids": [span.id for span in spans],
    }


class SdocWithMemosAndSpanGroup(TypedDict):
    sdoc_id: int
    user_id: int
    project_id: int
    code_id: int
    span_ids: list[int]
    span_group_id: int
    memo_ids: list[int]
    memo_targets: dict[int, tuple[int, AttachedObjectType]]
    favorite_memo_ids: set[int]


@pytest.fixture(scope="function")
def sdoc_with_memos_and_span_group(
    db_session, sdoc_with_span_annotations, test_project
) -> SdocWithMemosAndSpanGroup:
    """
    This fixture sets up the following project:

    - Everything of `sdoc_with_span_annotations` (30 spans "span 0" .. "span 29" of
      the test user with code "crud-code").
    - One span group "crud-group" of the test user on the document, containing all
      30 spans.
    - 34 memos of the test user, titled "memo 0" .. "memo 33":
      - "memo i" (i < 30) is attached to span i,
      - "memo 30" to the span group, "memo 31" to the code "crud-code",
        "memo 32" to the document and "memo 33" to the project.
    - The test user favorited every memo with an even number.

    `memo_ids` lists the memos in this order, `memo_targets` maps each memo id to
    the (id, type) of the object it is attached to.

    Non-obvious derived behavior:

    - Every span has exactly one memo and belongs to the span group, so its
      SpanAnnotationRead has one memo id and the group id.
    """
    sdoc_id = sdoc_with_span_annotations["sdoc_id"]
    user_id = sdoc_with_span_annotations["user_id"]
    code_id = sdoc_with_span_annotations["code_id"]
    span_ids = sdoc_with_span_annotations["span_ids"]

    span_group = SpanGroupService().create(
        db=db_session,
        project_id=test_project.id,
        user_id=user_id,
        create_dto=SpanGroupCreate(name="crud-group", sdoc_id=sdoc_id),
    )
    crud_span_group.link_groups_spans_batch(
        db=db_session, project_id=test_project.id, links={span_group.id: span_ids}
    )

    targets: list[tuple[int, AttachedObjectType]] = [
        *((span_id, AttachedObjectType.span_annotation) for span_id in span_ids),
        (span_group.id, AttachedObjectType.span_group),
        (code_id, AttachedObjectType.code),
        (sdoc_id, AttachedObjectType.source_document),
        (test_project.id, AttachedObjectType.project),
    ]
    memos = [
        crud_memo.create_for_attached_object(
            db=db_session,
            project_id=test_project.id,
            attached_object_id=object_id,
            attached_object_type=object_type,
            create_dto=MemoCreateIntern(
                uuid=str(uuid4()),
                title=f"memo {i}",
                content=f"content {i}",
                content_json='{"blocks": []}',
                user_id=user_id,
            ),
        )
        for i, (object_id, object_type) in enumerate(targets)
    ]
    favorite_memo_ids = {memo.id for i, memo in enumerate(memos) if i % 2 == 0}
    crud_memo.favorite_multi(
        db=db_session,
        project_id=test_project.id,
        memo_ids=list(favorite_memo_ids),
        user_id=user_id,
    )
    db_session.commit()

    return {
        "sdoc_id": sdoc_id,
        "user_id": user_id,
        "project_id": test_project.id,
        "code_id": code_id,
        "span_ids": span_ids,
        "span_group_id": span_group.id,
        "memo_ids": [memo.id for memo in memos],
        "memo_targets": {
            memo.id: target for memo, target in zip(memos, targets, strict=True)
        },
        "favorite_memo_ids": favorite_memo_ids,
    }


class StepStatusProject(TypedDict):
    project: ProjectORM
    done: SourceDocumentORM
    running: SourceDocumentORM
    failed: SourceDocumentORM
    image: SourceDocumentORM
    other_project_doc: SourceDocumentORM


@pytest.fixture(scope="function")
def step_status_project(db_session, test_project, test_user) -> StepStatusProject:
    """
    This fixture sets up the following documents with these step statuses
    (1 finished, 0 processing, -100 erroneous; steps not listed are not planned):

    - In the test project:
      - text "done.txt" (`done`): html_extraction 1, text_extraction 1,
        language_detection 1, tokens_sentences 1
      - text "running.txt" (`running`): html_extraction 1, text_extraction 1,
        language_detection 0, tokens_sentences 0
      - text "failed.txt" (`failed`): html_extraction 1, text_extraction -100,
        language_detection 0
      - image "image.png" (`image`): no step planned
    - In the project "Other Project" of the test user:
      - text "other.txt" (`other_project_doc`): html_extraction 1,
        language_detection 0

    Non-obvious derived behavior:

    - The overall status is finished for done and image (no step planned),
      processing for running, erroneous for failed (it also has a processing
      step) and processing for other_project_doc.
    """
    other_project = create_project_with_features(
        db_session, test_user, title="Other Project", features=[]
    )
    statuses = {
        "done": (
            test_project,
            DocType.text,
            {
                "html_extraction": 1,
                "text_extraction": 1,
                "language_detection": 1,
                "tokens_sentences": 1,
            },
        ),
        "running": (
            test_project,
            DocType.text,
            {
                "html_extraction": 1,
                "text_extraction": 1,
                "language_detection": 0,
                "tokens_sentences": 0,
            },
        ),
        "failed": (
            test_project,
            DocType.text,
            {
                "html_extraction": 1,
                "text_extraction": -100,
                "language_detection": 0,
            },
        ),
        "image": (test_project, DocType.image, {}),
        "other_project_doc": (
            other_project,
            DocType.text,
            {
                "html_extraction": 1,
                "language_detection": 0,
            },
        ),
    }
    names = {
        "done": "done.txt",
        "running": "running.txt",
        "failed": "failed.txt",
        "image": "image.png",
        "other_project_doc": "other.txt",
    }
    sdocs: dict[str, SourceDocumentORM] = {}
    for key, (project, doctype, status) in statuses.items():
        sdoc = crud_sdoc.create(
            db=db_session,
            project_id=project.id,
            create_dto=SourceDocumentCreate(
                filename=names[key],
                name=names[key],
                doctype=doctype,
            ),
        )
        set_step_status(db_session, sdoc.id, status)
        sdocs[key] = sdoc
    db_session.commit()
    return {
        "project": test_project,
        "done": sdocs["done"],
        "running": sdocs["running"],
        "failed": sdocs["failed"],
        "image": sdocs["image"],
        "other_project_doc": sdocs["other_project_doc"],
    }


@pytest.fixture(scope="function")
def tenants(db_session: Session, test_user, test_project) -> TwoTenants:
    """The rows of every project-owned table in two projects (see TwoTenants)."""
    return create_two_tenants(db_session, user=test_user, project=test_project)


@pytest.fixture(scope="function")
def twin_projects(db_session: Session, test_user, test_project) -> TwinProjects:
    """Two projects that hold the same ids in every project-owned table (see
    TwinProjects)."""
    return create_twin_projects(db_session, user=test_user, project=test_project)


# the timeline concept of a type, over all of its rows
def _timeline_concept(timeline_analysis_type: TimelineAnalysisType) -> dict[str, Any]:
    return {
        "timeline_analysis_type": timeline_analysis_type.value,
        "id": timeline_analysis_type.value,
        "name": timeline_analysis_type.value,
        "description": "",
        "color": "#000000",
        "visible": True,
        "ta_specific_filter": {
            "timeline_analysis_type": timeline_analysis_type.value,
            "filter": {"id": "root", "logic_operator": "and", "items": []},
        },
        "filter_hash": 0,
        "results": [],
    }


class LoneProject(TypedDict):
    """The rows of `create_tenant_rows` (see TenantRows) in the test project
    (`project`, `rows`) and its date metadata (`date_metadata`), alone with their
    ids until `create_twin()` creates "Twin Project" with the same features and a
    copy of every row of the test project with the same id (`copy_project_rows`),
    and returns it."""

    project: ProjectORM
    rows: TenantRows
    date_metadata: ProjectMetadataORM
    create_twin: Callable[[], ProjectORM]


@pytest.fixture(scope="function")
def lone_project(db_session: Session, test_user, test_project) -> LoneProject:
    """
    This fixture sets up the test project with one row of every project-owned
    table (see TenantRows), and no other project until `create_twin()`. In
    addition to the rows of TenantRows:

    - the date metadata "date" (text documents), whose value for "doc_<p>.txt"
      is 2024-01-01
    - "Timeline <p>" uses "date" and has one concept per timeline analysis type
      (document, sentence, span and bbox annotations), each without filter and
      without results
    """
    rows = create_tenant_rows(db_session, project=test_project, user=test_user)
    p = test_project.id
    date_metadata = ProjectMetadataORM(
        key="date",
        metatype=MetaType.DATE,
        read_only=False,
        doctype=DocType.text,
        description="",
        project_id=p,
    )
    db_session.add(date_metadata)
    db_session.flush()
    db_session.add(
        SourceDocumentMetadataORM(
            date_value=datetime(2024, 1, 1),
            project_id=p,
            project_metadata_id=date_metadata.id,
            source_document_id=rows["sdoc"].id,
        )
    )
    rows["timeline_analysis"].settings = {"date_metadata_id": date_metadata.id}
    rows["timeline_analysis"].concepts = [
        _timeline_concept(t) for t in TimelineAnalysisType
    ]
    db_session.commit()

    return {
        "project": test_project,
        "rows": rows,
        "date_metadata": date_metadata,
        "create_twin": lambda: create_twin(
            db_session, user=test_user, project=test_project
        ),
    }


class ProjectWithNotes(TypedDict):
    project_id: int
    note_ids: list[int]


@pytest.fixture(scope="function")
def project_with_notes(db_session: Session, test_project) -> ProjectWithNotes:
    """
    This fixture sets up the following project:

    - The test project with the writable text metadata key "note" (string).
    - Ten text documents "note_0.txt" to "note_9.txt" (without the initial
      metadata of the project), each with the "note" value "note i".
      `note_ids[i]` is the id of the value of "note_i.txt".
    """
    p = test_project.id
    key = ProjectMetadataORM(
        key="note",
        metatype=MetaType.STRING,
        read_only=False,
        doctype=DocType.text,
        description="",
        project_id=p,
    )
    db_session.add(key)
    db_session.flush()
    note_ids = []
    for i in range(10):
        sdoc = create_text_document(
            db_session,
            project=test_project,
            filename=f"note_{i}.txt",
            name=f"note_{i}",
            sentences=["A note."],
            initialize_metadata=False,
        )
        note = SourceDocumentMetadataORM(
            str_value=f"note {i}",
            project_id=p,
            project_metadata_id=key.id,
            source_document_id=sdoc.id,
        )
        db_session.add(note)
        db_session.flush()
        note_ids.append(note.id)
    db_session.commit()
    return {"project_id": p, "note_ids": note_ids}
