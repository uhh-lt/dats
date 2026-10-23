from typing import TypedDict

import pytest

from core.annotation.span_annotation_dto import SpanAnnotationCreate
from core.annotation.span_annotation_service import SpanAnnotationService
from core.code.code_crud import crud_code
from core.code.code_dto import CodeCreate
from core.project.project_orm import ProjectORM
from core.tag.tag_crud import crud_tag
from core.tag.tag_dto import TagCreate
from core.tag.tag_orm import TagORM
from modules.word_frequency.word_frequency_crud import crud_word_frequency
from modules.word_frequency.word_frequency_dto import WordFrequencyCreate


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
        create_dtos=[
            TagCreate(name=f"Tag {i}", color="#000000", project_id=test_project.id)
            for i in range(5)
        ],
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
            WordFrequencyCreate(sdoc_id=sdoc_id, word=word, count=i + 1)
            for i, word in enumerate(words)
        ],
    )
    db_session.commit()

    return {"sdoc_id": sdoc_id, "words": words}


class SdocWithSpanAnnotations(TypedDict):
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
        create_dto=CodeCreate(
            name="crud-code",
            color="red",
            description="",
            project_id=project.id,
            is_system=False,
        ),
    )
    spans = SpanAnnotationService().create_annotation_orms(
        db=db_session,
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
        "sdoc_id": sdoc_id,
        "user_id": test_user.id,
        "code_id": code.id,
        "span_ids": [span.id for span in spans],
    }
