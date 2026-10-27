from typing import TypedDict
from uuid import uuid4

import pytest

from common.doc_type_enum import DocType
from core.annotation.bbox_annotation_dto import BBoxAnnotationCreate
from core.annotation.bbox_annotation_service import BBoxAnnotationService
from core.annotation.sentence_annotation_dto import SentenceAnnotationCreate
from core.annotation.sentence_annotation_service import SentenceAnnotationService
from core.annotation.span_annotation_dto import SpanAnnotationCreate
from core.annotation.span_annotation_service import SpanAnnotationService
from core.code.code_crud import crud_code
from core.code.code_dto import CodeCreate
from core.code.code_orm import CodeORM
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_data_crud import crud_sdoc_data
from core.doc.source_document_data_dto import SourceDocumentDataCreate
from core.doc.source_document_dto import SourceDocumentCreate, SourceDocumentRead
from core.doc.source_document_orm import SourceDocumentORM
from core.memo.memo_crud import crud_memo
from core.memo.memo_dto import MemoCreateIntern
from core.memo.memo_orm import MemoORM
from core.project.project_crud import crud_project
from core.project.project_dto import ProjectCreate
from core.project.project_orm import ProjectORM
from core.project.project_service import ProjectService
from core.user.user_crud import crud_user
from core.user.user_dto import UserCreate
from core.user.user_orm import UserORM
from repos.filesystem_repo import FilesystemRepo

from .provenance_utils import ANNOTATION_KINDS, ATTACHED_OBJECT_TYPE, AnnotationKind


class KindAnnotations(TypedDict):
    sdoc_id: int
    other_sdoc_id: int
    source_id: int
    source_plain_id: int
    other_sdoc_source_id: int
    other_project_source_id: int
    source_memos: list[MemoORM]


class ProvenanceProject(TypedDict):
    project: ProjectORM
    other_project: ProjectORM
    user: UserORM
    assistant: UserORM
    code_a: CodeORM
    code_b: CodeORM
    span: KindAnnotations
    sentence: KindAnnotations
    bbox: KindAnnotations


def _create_annotation(
    db_session,
    *,
    kind: AnnotationKind,
    user_id: int,
    sdoc_id: int,
    code_id: int,
    position: int,
    source_annotation_id: int | None = None,
) -> int:
    """Create an annotation of the kind at a position (0, 1, ...) and return its id."""
    match kind:
        case "span":
            return (
                SpanAnnotationService()
                .create(
                    db=db_session,
                    user_id=user_id,
                    create_dto=SpanAnnotationCreate(
                        source_annotation_id=source_annotation_id,
                        span_text=f"span {position}",
                        begin=10 * position,
                        end=10 * position + 4,
                        begin_token=2 * position,
                        end_token=2 * position + 1,
                        code_id=code_id,
                        sdoc_id=sdoc_id,
                    ),
                )
                .id
            )
        case "sentence":
            return (
                SentenceAnnotationService()
                .create(
                    db=db_session,
                    user_id=user_id,
                    create_dto=SentenceAnnotationCreate(
                        source_annotation_id=source_annotation_id,
                        sentence_id_start=position,
                        sentence_id_end=position,
                        code_id=code_id,
                        sdoc_id=sdoc_id,
                    ),
                )
                .id
            )
        case "bbox":
            return (
                BBoxAnnotationService()
                .create(
                    db=db_session,
                    user_id=user_id,
                    create_dto=BBoxAnnotationCreate(
                        source_annotation_id=source_annotation_id,
                        x_min=10 * position,
                        x_max=10 * position + 5,
                        y_min=10 * position,
                        y_max=10 * position + 5,
                        code_id=code_id,
                        sdoc_id=sdoc_id,
                    ),
                )
                .id
            )


def _create_sdoc(
    db_session, *, project_id: int, filename: str, doctype: DocType
) -> SourceDocumentORM:
    return crud_sdoc.create(
        db=db_session,
        create_dto=SourceDocumentCreate(
            filename=filename,
            name=filename,
            doctype=doctype,
            project_id=project_id,
            folder_id=None,
        ),
    )


def _create_code(db_session, *, project_id: int, name: str) -> CodeORM:
    return crud_code.create(
        db=db_session,
        create_dto=CodeCreate(
            name=name,
            color="red",
            description=f"description of {name}",
            parent_id=None,
            enabled=True,
            project_id=project_id,
            is_system=False,
        ),
    )


@pytest.fixture(scope="function")
def provenance_project(db_session, test_user, project_with_sdoc) -> ProvenanceProject:
    """
    This fixture sets up the following projects:

    - Project "Simple Test Project" (`project`) of the test user (`user`,
      testuser@dats.org), who copies annotations in the tests. Its second member is
      the user "Assistant User" (`assistant`, assistant@dats.org), whose
      annotations are copied.
    - Codes "Code A" (`code_a`) and "Code B" (`code_b`) in `project`.
    - Documents of `project`:
      - "test_document.txt" (text, from `project_with_sdoc`): the document of the
        span and sentence annotations,
      - "other_document.txt" (text): the other document of span and sentence,
        with the same text (and sentences) as "test_document.txt",
      - "image.jpg" (image): the document of the bbox annotations,
      - "other_image.jpg" (image): the other document of bbox.
      An empty file stands in for the webp version of both images on the
      filesystem.
    - Project "Other Project" (`other_project`) of the test user, with code
      "Other Code" and the documents "other_project_document.txt" (text) and
      "other_project_image.jpg" (image).

    For each annotation kind ("span", "sentence", "bbox"), `provenance_project[kind]`
    holds the ids of these annotations, all with code "Code A" unless noted:

    - `source_id`: the assistant's annotation at position 0 of the kind's document
      (`sdoc_id`). It has two memos (`source_memos`, in creation order):
      "Assistant rationale" by the assistant and "User remark" by the test user.
    - `source_plain_id`: the assistant's annotation at position 1 of the same
      document, without memos.
    - `other_sdoc_source_id`: the assistant's annotation on the kind's other
      document (`other_sdoc_id`).
    - `other_project_source_id`: the test user's annotation in "Other Project"
      (code "Other Code").

    Position p of a span is characters 10p..10p+4 / tokens 2p..2p+1, of a sentence
    annotation sentence p, of a bbox the square (10p, 10p)..(10p+5, 10p+5).

    Non-obvious derived behavior:

    - The test user has no annotations in `project` yet, so every annotation the
      tests create is the first one of the test user.
    - None of the fixture annotations is a copy: they have no provenance.
    """
    project = project_with_sdoc["project"]
    text_sdoc = project_with_sdoc["source_document"]

    # 1) the assistant user, a member of the project
    assistant = crud_user.create(
        db=db_session,
        create_dto=UserCreate(
            first_name="Assistant",
            last_name="User",
            email="assistant@dats.org",
            password="MyTestPassword123",
        ),
    )
    crud_project.associate_user(
        db=db_session, project_id=project.id, user_id=assistant.id
    )

    # 2) codes and documents
    code_a = _create_code(db_session, project_id=project.id, name="Code A")
    code_b = _create_code(db_session, project_id=project.id, name="Code B")
    other_text_sdoc = _create_sdoc(
        db_session,
        project_id=project.id,
        filename="other_document.txt",
        doctype=DocType.text,
    )
    # search rows of sentence annotations read the sentences of the document
    text_sdoc_data = project_with_sdoc["source_document_data"]
    crud_sdoc_data.create(
        db=db_session,
        create_dto=SourceDocumentDataCreate(
            id=other_text_sdoc.id,
            content=text_sdoc_data.content,
            repo_url=text_sdoc_data.repo_url,
            raw_html=text_sdoc_data.raw_html,
            html=text_sdoc_data.html,
            token_starts=text_sdoc_data.token_starts,
            token_ends=text_sdoc_data.token_ends,
            sentence_starts=text_sdoc_data.sentence_starts,
            sentence_ends=text_sdoc_data.sentence_ends,
            token_time_starts=None,
            token_time_ends=None,
        ),
    )
    image_sdoc = _create_sdoc(
        db_session, project_id=project.id, filename="image.jpg", doctype=DocType.image
    )
    # bbox search rows link the webp version of the image, which must exist
    other_image_sdoc = _create_sdoc(
        db_session,
        project_id=project.id,
        filename="other_image.jpg",
        doctype=DocType.image,
    )
    for sdoc in (image_sdoc, other_image_sdoc):
        webp_path = FilesystemRepo().get_path_to_sdoc_file(
            SourceDocumentRead.model_validate(sdoc), webp=True
        )
        webp_path.parent.mkdir(parents=True, exist_ok=True)
        webp_path.write_bytes(b"")

    # 3) the other project
    other_project = crud_project.read(
        db=db_session,
        id=ProjectService()
        .create_project(
            db=db_session,
            create_dto=ProjectCreate(
                title="Other Project", description="Another project of the user"
            ),
            creating_user_id=test_user.id,
        )
        .id,
    )
    other_code = _create_code(
        db_session, project_id=other_project.id, name="Other Code"
    )
    other_project_sdoc_by_doctype = {
        DocType.text: _create_sdoc(
            db_session,
            project_id=other_project.id,
            filename="other_project_document.txt",
            doctype=DocType.text,
        ),
        DocType.image: _create_sdoc(
            db_session,
            project_id=other_project.id,
            filename="other_project_image.jpg",
            doctype=DocType.image,
        ),
    }

    # 4) the annotations and memos of each kind
    sdocs_by_kind: dict[AnnotationKind, tuple[SourceDocumentORM, SourceDocumentORM]] = {
        "span": (text_sdoc, other_text_sdoc),
        "sentence": (text_sdoc, other_text_sdoc),
        "bbox": (image_sdoc, other_image_sdoc),
    }
    annotations_by_kind: dict[AnnotationKind, KindAnnotations] = {}
    for kind, (sdoc, other_sdoc) in sdocs_by_kind.items():
        source_id = _create_annotation(
            db_session,
            kind=kind,
            user_id=assistant.id,
            sdoc_id=sdoc.id,
            code_id=code_a.id,
            position=0,
        )
        source_memos = [
            crud_memo.create_for_attached_object(
                db=db_session,
                attached_object_id=source_id,
                attached_object_type=ATTACHED_OBJECT_TYPE[kind],
                create_dto=MemoCreateIntern(
                    uuid=str(uuid4()),
                    title=title,
                    icon=icon,
                    content=f"{title} content",
                    content_json='{"blocks": []}',
                    user_id=author.id,
                    project_id=project.id,
                ),
            )
            for title, icon, author in [
                ("Assistant rationale", "🤖", assistant),
                ("User remark", None, test_user),
            ]
        ]
        annotations_by_kind[kind] = {
            "sdoc_id": sdoc.id,
            "other_sdoc_id": other_sdoc.id,
            "source_id": source_id,
            "source_plain_id": _create_annotation(
                db_session,
                kind=kind,
                user_id=assistant.id,
                sdoc_id=sdoc.id,
                code_id=code_a.id,
                position=1,
            ),
            "other_sdoc_source_id": _create_annotation(
                db_session,
                kind=kind,
                user_id=assistant.id,
                sdoc_id=other_sdoc.id,
                code_id=code_a.id,
                position=0,
            ),
            "other_project_source_id": _create_annotation(
                db_session,
                kind=kind,
                user_id=test_user.id,
                sdoc_id=other_project_sdoc_by_doctype[DocType(sdoc.doctype)].id,
                code_id=other_code.id,
                position=0,
            ),
            "source_memos": source_memos,
        }

    db_session.commit()

    return {
        "project": project,
        "other_project": other_project,
        "user": test_user,
        "assistant": assistant,
        "code_a": code_a,
        "code_b": code_b,
        "span": annotations_by_kind["span"],
        "sentence": annotations_by_kind["sentence"],
        "bbox": annotations_by_kind["bbox"],
    }


class KindCopies(TypedDict):
    copy_id: int
    own_id: int


class ProvenanceProjectWithCopies(ProvenanceProject):
    span_copies: KindCopies
    sentence_copies: KindCopies
    bbox_copies: KindCopies


@pytest.fixture(scope="function")
def provenance_project_with_copies(
    db_session, provenance_project
) -> ProvenanceProjectWithCopies:
    """
    This fixture sets up the project of `provenance_project` (see there), in which
    the test user has, for each annotation kind, `provenance_project_with_copies[
    f"{kind}_copies"]`:

    - `copy_id`: a copy of the assistant's `source_id` annotation (position 0 of the
      kind's document) with code "Code B": the test user accepted it and changed
      the code from "Code A" to "Code B". It has copies of the source's two memos.
    - `own_id`: the test user's own annotation at position 1 of the kind's document
      with code "Code B", no copy and without memos.

    Non-obvious derived behavior:

    - The copy records the assistant as source user and "Code A" as source code.
    - Deleting "Code A" deletes all of the assistant's annotations (they have Code
      A), but neither of the test user's annotations.
    """
    user = provenance_project["user"]
    code_b = provenance_project["code_b"]

    copies_by_kind: dict[AnnotationKind, KindCopies] = {}
    for kind in ANNOTATION_KINDS:
        annotations = provenance_project[kind]
        copies_by_kind[kind] = {
            "copy_id": _create_annotation(
                db_session,
                kind=kind,
                user_id=user.id,
                sdoc_id=annotations["sdoc_id"],
                code_id=code_b.id,
                position=0,
                source_annotation_id=annotations["source_id"],
            ),
            "own_id": _create_annotation(
                db_session,
                kind=kind,
                user_id=user.id,
                sdoc_id=annotations["sdoc_id"],
                code_id=code_b.id,
                position=1,
            ),
        }

    db_session.commit()

    return {
        "project": provenance_project["project"],
        "other_project": provenance_project["other_project"],
        "user": provenance_project["user"],
        "assistant": provenance_project["assistant"],
        "code_a": provenance_project["code_a"],
        "code_b": provenance_project["code_b"],
        "span": provenance_project["span"],
        "sentence": provenance_project["sentence"],
        "bbox": provenance_project["bbox"],
        "span_copies": copies_by_kind["span"],
        "sentence_copies": copies_by_kind["sentence"],
        "bbox_copies": copies_by_kind["bbox"],
    }
