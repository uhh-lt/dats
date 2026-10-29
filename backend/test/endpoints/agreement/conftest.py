import re
from collections.abc import Iterator
from contextlib import contextmanager
from typing import TypedDict

import pytest
from sqlalchemy import event
from sqlalchemy.engine import Engine

from common.doc_type_enum import DocType
from core.annotation.sentence_annotation_dto import (
    SentenceAnnotationCreate,
    SentenceAnnotationRead,
)
from core.annotation.sentence_annotation_service import SentenceAnnotationService
from core.annotation.span_annotation_dto import (
    SpanAnnotationCreate,
    SpanAnnotationRead,
)
from core.annotation.span_annotation_service import SpanAnnotationService
from core.code.code_crud import crud_code
from core.code.code_dto import CodeCreate
from core.code.code_orm import CodeORM
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_data_crud import crud_sdoc_data
from core.doc.source_document_data_dto import SourceDocumentDataCreate
from core.doc.source_document_dto import SourceDocumentCreate
from core.doc.source_document_orm import SourceDocumentORM
from core.project.project_dto import ProjectCreate
from core.project.project_orm import ProjectORM
from core.project.project_service import ProjectService
from core.user.user_crud import crud_user
from core.user.user_dto import UserCreate
from core.user.user_orm import UserORM


@contextmanager
def record_sql() -> Iterator[list[str]]:
    """Record the SQL statements of all engines (the app's included) in the block."""
    statements: list[str] = []

    def on_execute(conn: object, cursor: object, statement: str, *args: object) -> None:
        statements.append(statement)

    event.listen(Engine, "before_cursor_execute", on_execute)
    try:
        yield statements
    finally:
        event.remove(Engine, "before_cursor_execute", on_execute)


# Tokens are the words (\w+), sentences end with a period.
#
#  token:     0    1   2   3  4       5    6      7     8       9   10      11   12   13
DOCUMENT_A = (
    "Anna met Bob in Berlin. They talked about Hamburg and Bremen. Then Anna left."
)


class AgreementProject(TypedDict):
    """A deterministic project fixture for agreement tests.

    This fixture sets up the following project:

    - Project: "Simple Test Project" (root `test_project`).
    - Users:
      - `reference_user` = the global test_user (Test User), the gold standard.
      - `compared_user` "Compared Annotator" (compared@dats.org).
      - `third_user` "Third Annotator" (third@dats.org).
      - `outsider_user` "Outside Annotator" (outsider@dats.org).
      All but the outsider are members of the project.
    - Codes: `code_per` "Human", `code_loc` "Place", `code_org` "Company",
      `code_misc` "Other". Below they are called PER, LOC, ORG and MISC. (The project
      also has the system codes, among them codes named PER, LOC, ORG and MISC,
      which carry no annotations here.)
    - Document A (`sdoc_a`, text) with the content `DOCUMENT_A`:
      "Anna met Bob in Berlin. They talked about Hamburg and Bremen. Then Anna left."
      Tokens: 0 Anna, 1 met, 2 Bob, 3 in, 4 Berlin, 5 They, 6 talked, 7 about,
      8 Hamburg, 9 and, 10 Bremen, 11 Then, 12 Anna, 13 left.
      Sentences: 0 "Anna met Bob in Berlin.", 1 "They talked about Hamburg and
      Bremen.", 2 "Then Anna left."
    - Document B (`sdoc_b`, text) "Nothing to see here." without annotations.

    Span annotations in document A (`spans`, keyed by name):

    | name           | user      | code | text                | tokens   |
    | -------------- | --------- | ---- | ------------------- | -------- |
    | ref_anna1      | reference | PER  | Anna                | [0, 1)   |
    | ref_bob        | reference | PER  | Bob                 | [2, 3)   |
    | ref_berlin     | reference | LOC  | Berlin              | [4, 5)   |
    | ref_hamburg    | reference | LOC  | Hamburg and Bremen  | [8, 11)  |
    | ref_anna2      | reference | PER  | Anna (2nd)          | [12, 13) |
    | ref_then       | reference | MISC | Then                | [11, 12) |
    | cmp_anna1      | compared  | PER  | Anna                | [0, 1)   |
    | cmp_bob_per    | compared  | PER  | Bob                 | [2, 3)   |
    | cmp_bob_org    | compared  | ORG  | Bob                 | [2, 3)   |
    | cmp_in_berlin  | compared  | LOC  | in Berlin           | [3, 5)   |
    | cmp_talked     | compared  | ORG  | talked about        | [6, 8)   |
    | cmp_hamburg    | compared  | LOC  | Hamburg             | [8, 9)   |
    | cmp_bremen     | compared  | LOC  | Bremen              | [10, 11) |
    | cmp_anna2      | compared  | ORG  | Anna (2nd)          | [12, 13) |
    | third_left     | third     | PER  | left                | [13, 14) |

    Sentence annotations in document A (`sentences`, keyed by name):

    | name         | user      | code | sentences |
    | ------------ | --------- | ---- | --------- |
    | ref_s0_per   | reference | PER  | 0         |
    | ref_s0_loc   | reference | LOC  | 0         |
    | ref_s12_loc  | reference | LOC  | 1 - 2     |
    | cmp_s0_per   | compared  | PER  | 0         |
    | cmp_s0_org   | compared  | ORG  | 0         |
    | cmp_s12_loc  | compared  | LOC  | 1 - 2     |
    | third_s2     | third     | PER  | 2         |
    | ref_s01_misc | reference | MISC | 0 - 1     |
    | cmp_s0_misc  | compared  | MISC | 0         |

    - `other_project` "Other Project" belongs to `third_user` only; the test user is
      not a member. It has the document `other_sdoc` "Other Document" ("Not
      shared.") and the code `other_code` "Foreign". The outsider is a member of
      no project.

    Derived behavior (reference vs. compared, codes PER, LOC, ORG):

    - Spans, exact: 9 units (one per distinct span). PER TP 2 / FP 0 / FN 1,
      LOC TP 0 / FP 3 / FN 2, ORG TP 0 / FP 3 / FN 0. "Bob" carries PER in the
      reference and PER + ORG in the comparison (TP PER, FP ORG). "in Berlin" and
      "Berlin" do not match.
    - Spans, per word: 10 units. PER TP 2 / FP 0 / FN 1, LOC TP 3 / FP 1 / FN 1,
      ORG TP 0 / FP 4 / FN 0. "talked about" is one segment of two words.
    - Sentences, exact: 2 units, (0, 0) and (1, 2). PER TP 1, LOC TP 1 / FN 1,
      ORG FP 1.
    - Sentences, per sentence: 3 units. PER TP 1, LOC TP 2 / FN 1, ORG FP 1.
      Sentence 0 carries PER + LOC in the reference and PER + ORG in the
      comparison; sentences 1 and 2 are one segment of two units.
    - MISC sentences: the reference annotates sentences 0 - 1, the comparison only
      sentence 0. Exact: two units that do not match (FP 1, FN 1). Per sentence:
      sentence 0 matches (TP 1), sentence 1 is missed (FN 1).
    - MISC and the third user only count when requested.
    """

    project: ProjectORM
    other_project: ProjectORM
    other_sdoc: SourceDocumentORM
    other_code: CodeORM
    reference_user: UserORM
    compared_user: UserORM
    third_user: UserORM
    outsider_user: UserORM
    code_per: CodeORM
    code_loc: CodeORM
    code_org: CodeORM
    code_misc: CodeORM
    sdoc_a: SourceDocumentORM
    sdoc_b: SourceDocumentORM
    spans: dict[str, SpanAnnotationRead]
    sentences: dict[str, SentenceAnnotationRead]


def _create_user(db, first_name: str, last_name: str, email: str) -> UserORM:
    return crud_user.create(
        db=db,
        create_dto=UserCreate(
            first_name=first_name,
            last_name=last_name,
            email=email,
            password="AgreementPassword123",
        ),
    )


def _create_code(db, project_id: int, name: str) -> CodeORM:
    return crud_code.create(
        db=db,
        create_dto=CodeCreate(
            name=name,
            color="#ff0000",
            description=f"Code {name}",
            parent_id=None,
            enabled=True,
            project_id=project_id,
            is_system=False,
        ),
    )


def _create_sdoc(db, project_id: int, name: str, content: str) -> SourceDocumentORM:
    """A text document whose tokens are its words and whose sentences end with '.'."""
    sdoc = crud_sdoc.create(
        db=db,
        create_dto=SourceDocumentCreate(
            filename=f"{name}.txt",
            name=name,
            doctype=DocType.text,
            project_id=project_id,
            folder_id=None,
        ),
    )
    tokens = list(re.finditer(r"\w+", content))
    sentences = list(re.finditer(r"[^.]+\.", content))
    crud_sdoc_data.create(
        db=db,
        create_dto=SourceDocumentDataCreate(
            id=sdoc.id,
            content=content,
            repo_url=f"{name}.txt",
            raw_html=f"<p>{content}</p>",
            html=f"<p>{content}</p>",
            token_starts=[t.start() for t in tokens],
            token_ends=[t.end() for t in tokens],
            # skip the space in front of a sentence
            sentence_starts=[
                s.start() + (s.group().startswith(" ")) for s in sentences
            ],
            sentence_ends=[s.end() for s in sentences],
            token_time_starts=None,
            token_time_ends=None,
        ),
    )
    return sdoc


def _span(
    sdoc_id: int, code_id: int, begin_token: int, end_token: int
) -> SpanAnnotationCreate:
    tokens = list(re.finditer(r"\w+", DOCUMENT_A))
    begin = tokens[begin_token].start()
    end = tokens[end_token - 1].end()
    return SpanAnnotationCreate(
        sdoc_id=sdoc_id,
        code_id=code_id,
        begin=begin,
        end=end,
        begin_token=begin_token,
        end_token=end_token,
        span_text=DOCUMENT_A[begin:end],
    )


@pytest.fixture(scope="function")
def agreement_project(db_session, test_project, test_user) -> AgreementProject:
    db = db_session
    project = test_project
    compared_user = _create_user(db, "Compared", "Annotator", "compared@dats.org")
    third_user = _create_user(db, "Third", "Annotator", "third@dats.org")
    outsider_user = _create_user(db, "Outside", "Annotator", "outsider@dats.org")
    for user in [compared_user, third_user]:
        ProjectService().associate_user(db=db, project_id=project.id, user_id=user.id)

    code_per = _create_code(db, project.id, "Human")
    code_loc = _create_code(db, project.id, "Place")
    code_org = _create_code(db, project.id, "Company")
    code_misc = _create_code(db, project.id, "Other")

    sdoc_a = _create_sdoc(db, project.id, "Document A", DOCUMENT_A)
    sdoc_b = _create_sdoc(db, project.id, "Document B", "Nothing to see here.")

    span_specs: dict[str, tuple[UserORM, CodeORM, int, int]] = {
        "ref_anna1": (test_user, code_per, 0, 1),
        "ref_bob": (test_user, code_per, 2, 3),
        "ref_berlin": (test_user, code_loc, 4, 5),
        "ref_hamburg": (test_user, code_loc, 8, 11),
        "ref_anna2": (test_user, code_per, 12, 13),
        "ref_then": (test_user, code_misc, 11, 12),
        "cmp_anna1": (compared_user, code_per, 0, 1),
        "cmp_bob_per": (compared_user, code_per, 2, 3),
        "cmp_bob_org": (compared_user, code_org, 2, 3),
        "cmp_in_berlin": (compared_user, code_loc, 3, 5),
        "cmp_talked": (compared_user, code_org, 6, 8),
        "cmp_hamburg": (compared_user, code_loc, 8, 9),
        "cmp_bremen": (compared_user, code_loc, 10, 11),
        "cmp_anna2": (compared_user, code_org, 12, 13),
        "third_left": (third_user, code_per, 13, 14),
    }
    spans = {
        name: SpanAnnotationService().create(
            db=db,
            user_id=user.id,
            create_dto=_span(sdoc_a.id, code.id, begin_token, end_token),
        )
        for name, (user, code, begin_token, end_token) in span_specs.items()
    }

    sentence_specs: dict[str, tuple[UserORM, CodeORM, int, int]] = {
        "ref_s0_per": (test_user, code_per, 0, 0),
        "ref_s0_loc": (test_user, code_loc, 0, 0),
        "ref_s12_loc": (test_user, code_loc, 1, 2),
        "cmp_s0_per": (compared_user, code_per, 0, 0),
        "cmp_s0_org": (compared_user, code_org, 0, 0),
        "cmp_s12_loc": (compared_user, code_loc, 1, 2),
        "third_s2": (third_user, code_per, 2, 2),
        "ref_s01_misc": (test_user, code_misc, 0, 1),
        "cmp_s0_misc": (compared_user, code_misc, 0, 0),
    }
    sentences = {
        name: SentenceAnnotationService().create(
            db=db,
            user_id=user.id,
            create_dto=SentenceAnnotationCreate(
                sdoc_id=sdoc_a.id,
                code_id=code.id,
                sentence_id_start=start,
                sentence_id_end=end,
            ),
        )
        for name, (user, code, start, end) in sentence_specs.items()
    }

    other_project_read = ProjectService().create_project(
        db=db,
        create_dto=ProjectCreate(title="Other Project", description="Not shared"),
        creating_user_id=third_user.id,
    )
    other_sdoc = _create_sdoc(
        db, other_project_read.id, "Other Document", "Not shared."
    )
    other_code = _create_code(db, other_project_read.id, "Foreign")

    db.commit()
    for obj in [
        project,
        compared_user,
        third_user,
        outsider_user,
        code_per,
        code_loc,
        code_org,
        code_misc,
        sdoc_a,
        sdoc_b,
        other_sdoc,
        other_code,
    ]:
        db.refresh(obj)
    other_project = db.get(ProjectORM, other_project_read.id)
    assert other_project is not None

    return {
        "project": project,
        "other_project": other_project,
        "other_sdoc": other_sdoc,
        "other_code": other_code,
        "reference_user": test_user,
        "compared_user": compared_user,
        "third_user": third_user,
        "outsider_user": outsider_user,
        "code_per": code_per,
        "code_loc": code_loc,
        "code_org": code_org,
        "code_misc": code_misc,
        "sdoc_a": sdoc_a,
        "sdoc_b": sdoc_b,
        "spans": spans,
        "sentences": sentences,
    }
