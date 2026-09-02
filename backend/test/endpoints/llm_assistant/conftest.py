from collections.abc import Generator
from datetime import UTC, datetime
from typing import TypedDict

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from common.doc_type import DocType
from common.meta_type import MetaType
from config import conf
from core.annotation.sentence_annotation_crud import crud_sentence_anno
from core.annotation.sentence_annotation_dto import SentenceAnnotationCreate
from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
from core.annotation.span_annotation_crud import crud_span_anno
from core.annotation.span_annotation_dto import SpanAnnotationCreate
from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.code.code_crud import crud_code
from core.code.code_dto import CodeCreate
from core.code.code_orm import CodeORM
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_data_crud import crud_sdoc_data
from core.doc.source_document_data_dto import SourceDocumentDataCreate
from core.doc.source_document_dto import SourceDocumentCreate
from core.doc.source_document_orm import SourceDocumentORM
from core.metadata.project_metadata_crud import crud_project_meta
from core.metadata.project_metadata_dto import ProjectMetadataCreate
from core.metadata.project_metadata_orm import ProjectMetadataORM
from core.metadata.source_document_metadata_crud import crud_sdoc_meta
from core.project.project_crud import crud_project
from core.project.project_dto import ProjectCreate
from core.project.project_orm import ProjectORM
from core.tag.tag_crud import crud_tag
from core.tag.tag_dto import TagCreate
from core.tag.tag_orm import TagORM
from core.user.user_crud import ASSISTANT_FEWSHOT_ID, ASSISTANT_ZEROSHOT_ID
from core.user.user_orm import UserORM


@pytest.fixture(scope="function")
def error_client(app: FastAPI) -> Generator[TestClient, None, None]:
    """Return a client that exposes unhandled endpoint exceptions as HTTP 500."""
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client


class LLMAssistantProject(TypedDict):
    """This fixture sets up the following deterministic project.

    Project ``Simple Test Project`` belongs to ``testuser@dats.org`` and contains:

    - Target document ``Target facts`` with five short English sentences stating
      author Alice, year 2024, publication date 2024-01-15, review status true,
      and topics solar and energy. It is linked to the ``Other`` tag.
    - Example document ``Few-shot examples`` with exactly the configured few-shot
      threshold of short English sentences. Each name has a human ``PERSON`` span
      annotation and each sentence has a human ``FACT`` sentence annotation.
    - Empty-result document ``No match`` containing only an explicit statement that
      it has no people or facts relevant to the fixture's labels.
    - Codes ``PERSON`` (person-name passages) and ``FACT`` (explicit factual
      sentences), and tags ``People`` and ``Other``.
    - User metadata fields ``author`` (string), ``year`` (number), ``published``
      (date), ``reviewed`` (boolean), and ``topics`` (list). The target document has
      deliberately stale current values for all five fields, so extraction results
      can be distinguished from current metadata.
    - One zero-shot and one few-shot assistant span annotation on the target, plus
      one zero-shot and one few-shot assistant sentence annotation on the target.
    - A separate, unauthorized project with one document, one ``FOREIGN`` code,
      and one zero-shot assistant span annotation.

    Non-obvious derived behavior:

    - Every main-project document has its read-only ``language`` metadata set to
      ``en`` because LLM document processing requires this metadata.
    - The human annotations, not assistant annotations, determine whether few-shot
      is available. Exactly the runtime-configured threshold exists for each
      selected code, even when tests override the default threshold of four.
    - Existing assistant annotations are separated by assistant user, allowing the
      count endpoint and ``delete_existing_annotations`` to distinguish approaches.
    - The unauthorized project is intentionally not associated with the test user.
    """

    project: ProjectORM
    target_sdoc: SourceDocumentORM
    example_sdoc: SourceDocumentORM
    no_match_sdoc: SourceDocumentORM
    person_code: CodeORM
    fact_code: CodeORM
    people_tag: TagORM
    other_tag: TagORM
    metadata_fields: list[ProjectMetadataORM]
    human_span_annotations: list[SpanAnnotationORM]
    human_sentence_annotations: list[SentenceAnnotationORM]
    zero_span_annotation: SpanAnnotationORM
    few_span_annotation: SpanAnnotationORM
    zero_sentence_annotation: SentenceAnnotationORM
    few_sentence_annotation: SentenceAnnotationORM
    foreign_project: ProjectORM
    foreign_sdoc: SourceDocumentORM
    foreign_code: CodeORM
    foreign_span_annotation: SpanAnnotationORM


class UnusualCodeNamesProject(TypedDict):
    """This fixture sets up the following minimal deterministic project.

    Project ``Unusual code names`` belongs to ``testuser@dats.org`` and contains:

    - One text document, ``Unusual code targets``, whose content is exactly
      ``Dashword spaceword dotword``.
    - Three enabled codes: ``UN-FRESH`` describes only ``Dashword``, ``VERY FRESH``
      describes only ``spaceword``, and ``ODD.CODE_2`` describes only ``dotword``.
    - The required read-only ``language`` metadata field, set to ``en`` on the
      document.

    Non-obvious derived behavior:

    - The targets appear in code order so a failure to remove an unusual earlier
      tag would shift the offsets of both later annotations.
    - The project has no existing annotations, examples, tags, or user metadata.
    """

    project: ProjectORM
    target_sdoc: SourceDocumentORM
    codes: list[CodeORM]
    expected_annotations: list[tuple[str, int, int, int]]


def _offsets(parts: list[str]) -> tuple[str, list[int], list[int]]:
    """Join text parts with spaces and return their exact character offsets."""
    content = " ".join(parts)
    starts: list[int] = []
    ends: list[int] = []
    cursor = 0
    for part in parts:
        start = content.index(part, cursor)
        starts.append(start)
        ends.append(start + len(part))
        cursor = start + len(part)
    return content, starts, ends


def _token_offsets(content: str) -> tuple[list[int], list[int]]:
    """Return whitespace-token character offsets for deterministic test text."""
    starts: list[int] = []
    ends: list[int] = []
    cursor = 0
    while cursor < len(content):
        while cursor < len(content) and content[cursor].isspace():
            cursor += 1
        if cursor >= len(content):
            break
        start = cursor
        while cursor < len(content) and not content[cursor].isspace():
            cursor += 1
        starts.append(start)
        ends.append(cursor)
    return starts, ends


def _create_text_document(
    db: Session,
    *,
    project: ProjectORM,
    filename: str,
    name: str,
    sentences: list[str],
    initialize_metadata: bool = True,
) -> SourceDocumentORM:
    """Create a fully tokenized text document suitable for LLM processing."""
    content, sentence_starts, sentence_ends = _offsets(sentences)
    token_starts, token_ends = _token_offsets(content)
    sdoc = crud_sdoc.create(
        db=db,
        create_dto=SourceDocumentCreate(
            filename=filename,
            name=name,
            doctype=DocType.text,
            project_id=project.id,
        ),
    )
    crud_sdoc_data.create(
        db=db,
        create_dto=SourceDocumentDataCreate(
            id=sdoc.id,
            content=content,
            repo_url=f"llm-assistant-tests/{filename}",
            raw_html=f"<p>{content}</p>",
            html="<p>"
            + " ".join(f"<sent>{sentence}</sent>" for sentence in sentences)
            + "</p>",
            token_starts=token_starts,
            token_ends=token_ends,
            sentence_starts=sentence_starts,
            sentence_ends=sentence_ends,
            token_time_starts=None,
            token_time_ends=None,
        ),
    )
    if initialize_metadata:
        crud_sdoc_meta.create_initial_metadata(
            db=db,
            project_id=project.id,
            sdoc_id=sdoc.id,
            doctype=DocType.text,
        )
        language = crud_sdoc_meta.read_by_sdoc_and_key(
            db=db, sdoc_id=sdoc.id, key="language"
        )
        language.str_value = "en"
    return sdoc


def _span_for_text(
    db: Session,
    *,
    sdoc: SourceDocumentORM,
    text: str,
    code_id: int,
    user_id: int,
) -> SpanAnnotationORM:
    """Create a span annotation by locating an exact string in a document."""
    data = crud_sdoc_data.read(db=db, id=sdoc.id)
    begin = data.content.index(text)
    end = begin + len(text)
    begin_token = next(
        index for index, token_end in enumerate(data.token_ends) if token_end > begin
    )
    end_token = (
        next(
            index for index, token_end in enumerate(data.token_ends) if token_end >= end
        )
        + 1
    )
    return crud_span_anno.create(
        db=db,
        user_id=user_id,
        create_dto=SpanAnnotationCreate(
            sdoc_id=sdoc.id,
            begin=begin,
            end=end,
            begin_token=begin_token,
            end_token=end_token,
            span_text=text,
            code_id=code_id,
        ),
    )


def _create_metadata_field(
    db: Session,
    *,
    project_id: int,
    key: str,
    metatype: MetaType,
) -> ProjectMetadataORM:
    """Create one user-editable text metadata field."""
    return crud_project_meta.create(
        db=db,
        create_dto=ProjectMetadataCreate(
            project_id=project_id,
            key=key,
            metatype=metatype,
            read_only=False,
            doctype=DocType.text,
            description=f"Extract the explicit {key} value.",
        ),
    )


@pytest.fixture(scope="function")
def unusual_code_names_project(
    db_session: Session,
    test_user: UserORM,
) -> UnusualCodeNamesProject:
    """Create the minimal unusual-code-name project described by its TypedDict."""
    project = crud_project.create(
        db=db_session,
        create_dto=ProjectCreate(
            title="Unusual code names",
            description="Exercises inline tags made from unrestricted code names.",
        ),
    )
    crud_project.associate_user(
        db=db_session,
        proj_id=project.id,
        user_id=test_user.id,
    )
    crud_project_meta.create(
        db=db_session,
        create_dto=ProjectMetadataCreate(
            project_id=project.id,
            key="language",
            metatype=MetaType.STRING,
            read_only=True,
            doctype=DocType.text,
            description="The document language.",
        ),
    )
    target_sdoc = _create_text_document(
        db_session,
        project=project,
        filename="unusual-code-targets.txt",
        name="Unusual code targets",
        sentences=["Dashword spaceword dotword"],
    )
    codes = [
        crud_code.create(
            db=db_session,
            create_dto=CodeCreate(
                name=name,
                description=f"Only the exact word {target}.",
                project_id=project.id,
                is_system=False,
            ),
        )
        for name, target in [
            ("UN-FRESH", "Dashword"),
            ("VERY FRESH", "spaceword"),
            ("ODD.CODE_2", "dotword"),
        ]
    ]

    db_session.commit()
    for item in [project, target_sdoc, *codes]:
        db_session.refresh(item)

    return {
        "project": project,
        "target_sdoc": target_sdoc,
        "codes": codes,
        "expected_annotations": [
            ("Dashword", codes[0].id, 0, 8),
            ("spaceword", codes[1].id, 9, 18),
            ("dotword", codes[2].id, 19, 26),
        ],
    }


@pytest.fixture(scope="function")
def llm_assistant_project(
    db_session: Session,
    test_project: ProjectORM,
    test_user: UserORM,
) -> LLMAssistantProject:
    """Create the deterministic LLM assistant project described by its TypedDict."""
    example_names = ["Anna", "Ben", "Cara", "Dan"]
    if conf.llm_assistant.few_shot_threshold > len(example_names):
        example_names.extend(
            f"Person{index}"
            for index in range(
                len(example_names) + 1,
                conf.llm_assistant.few_shot_threshold + 1,
            )
        )
    example_names = example_names[: conf.llm_assistant.few_shot_threshold]

    target_sdoc = _create_text_document(
        db_session,
        project=test_project,
        filename="target-facts.txt",
        name="Target facts",
        sentences=[
            "Author is Alice.",
            "Year is 2024.",
            "Published is 2024-01-15.",
            "Reviewed is true.",
            "Topics are solar and energy.",
        ],
    )
    example_sdoc = _create_text_document(
        db_session,
        project=test_project,
        filename="few-shot-examples.txt",
        name="Few-shot examples",
        sentences=[f"{name} is a person." for name in example_names],
    )
    no_match_sdoc = _create_text_document(
        db_session,
        project=test_project,
        filename="no-match.txt",
        name="No match",
        sentences=["No selected category applies here."],
    )

    person_code = crud_code.read_by_name_and_project(
        db=db_session,
        code_name="PERSON",
        proj_id=test_project.id,
    )
    assert person_code is not None, "The default PERSON system code is missing"
    fact_code = crud_code.create(
        db=db_session,
        create_dto=CodeCreate(
            name="FACT",
            description="A sentence that explicitly states a factual value.",
            project_id=test_project.id,
            is_system=False,
        ),
    )
    people_tag = crud_tag.create(
        db=db_session,
        create_dto=TagCreate(
            name="People",
            description="Documents that explicitly name a person.",
            project_id=test_project.id,
        ),
    )
    other_tag = crud_tag.create(
        db=db_session,
        create_dto=TagCreate(
            name="Other",
            description="Documents without a named person.",
            project_id=test_project.id,
        ),
    )
    crud_tag.link_multiple_tags(
        db=db_session, sdoc_ids=[target_sdoc.id], tag_ids=[other_tag.id]
    )

    metadata_fields = [
        _create_metadata_field(
            db_session,
            project_id=test_project.id,
            key="author",
            metatype=MetaType.STRING,
        ),
        _create_metadata_field(
            db_session,
            project_id=test_project.id,
            key="year",
            metatype=MetaType.NUMBER,
        ),
        _create_metadata_field(
            db_session,
            project_id=test_project.id,
            key="published",
            metatype=MetaType.DATE,
        ),
        _create_metadata_field(
            db_session,
            project_id=test_project.id,
            key="reviewed",
            metatype=MetaType.BOOLEAN,
        ),
        _create_metadata_field(
            db_session,
            project_id=test_project.id,
            key="topics",
            metatype=MetaType.LIST,
        ),
    ]
    stale_values = [
        "Unknown",
        1999,
        datetime(1999, 1, 1, tzinfo=UTC),
        False,
        ["unknown"],
    ]
    for metadata_field, value in zip(metadata_fields, stale_values):
        metadata = next(
            item
            for item in metadata_field.sdoc_metadata
            if item.source_document_id == target_sdoc.id
        )
        match MetaType(metadata_field.metatype):
            case MetaType.STRING:
                metadata.str_value = value
            case MetaType.NUMBER:
                metadata.int_value = value
            case MetaType.DATE:
                metadata.date_value = value
            case MetaType.BOOLEAN:
                metadata.boolean_value = value
            case MetaType.LIST:
                metadata.list_value = value

    human_span_annotations = [
        _span_for_text(
            db_session,
            sdoc=example_sdoc,
            text=name,
            code_id=person_code.id,
            user_id=test_user.id,
        )
        for name in example_names
    ]
    human_sentence_annotations = crud_sentence_anno.create_bulk(
        db=db_session,
        user_id=test_user.id,
        create_dtos=[
            SentenceAnnotationCreate(
                sdoc_id=example_sdoc.id,
                sentence_id_start=sentence_id,
                sentence_id_end=sentence_id,
                code_id=fact_code.id,
            )
            for sentence_id in range(conf.llm_assistant.few_shot_threshold)
        ],
    )

    zero_span_annotation = _span_for_text(
        db_session,
        sdoc=target_sdoc,
        text="Alice",
        code_id=person_code.id,
        user_id=ASSISTANT_ZEROSHOT_ID,
    )
    few_span_annotation = _span_for_text(
        db_session,
        sdoc=target_sdoc,
        text="Alice",
        code_id=person_code.id,
        user_id=ASSISTANT_FEWSHOT_ID,
    )
    zero_sentence_annotation = crud_sentence_anno.create(
        db=db_session,
        user_id=ASSISTANT_ZEROSHOT_ID,
        create_dto=SentenceAnnotationCreate(
            sdoc_id=target_sdoc.id,
            sentence_id_start=0,
            sentence_id_end=0,
            code_id=fact_code.id,
        ),
    )
    few_sentence_annotation = crud_sentence_anno.create(
        db=db_session,
        user_id=ASSISTANT_FEWSHOT_ID,
        create_dto=SentenceAnnotationCreate(
            sdoc_id=target_sdoc.id,
            sentence_id_start=1,
            sentence_id_end=1,
            code_id=fact_code.id,
        ),
    )

    foreign_project = crud_project.create(
        db=db_session,
        create_dto=ProjectCreate(
            title="Unauthorized project",
            description="Not associated with the test user",
        ),
    )
    foreign_sdoc = _create_text_document(
        db_session,
        project=foreign_project,
        filename="foreign.txt",
        name="Foreign document",
        sentences=["Eve is foreign."],
        initialize_metadata=False,
    )
    foreign_code = crud_code.create(
        db=db_session,
        create_dto=CodeCreate(
            name="FOREIGN",
            description="A foreign-project code.",
            project_id=foreign_project.id,
            is_system=False,
        ),
    )
    foreign_span_annotation = _span_for_text(
        db_session,
        sdoc=foreign_sdoc,
        text="Eve",
        code_id=foreign_code.id,
        user_id=ASSISTANT_ZEROSHOT_ID,
    )

    db_session.commit()
    for item in [
        test_project,
        target_sdoc,
        example_sdoc,
        no_match_sdoc,
        person_code,
        fact_code,
        people_tag,
        other_tag,
        foreign_project,
        foreign_sdoc,
        foreign_code,
    ]:
        db_session.refresh(item)

    return {
        "project": test_project,
        "target_sdoc": target_sdoc,
        "example_sdoc": example_sdoc,
        "no_match_sdoc": no_match_sdoc,
        "person_code": person_code,
        "fact_code": fact_code,
        "people_tag": people_tag,
        "other_tag": other_tag,
        "metadata_fields": metadata_fields,
        "human_span_annotations": human_span_annotations,
        "human_sentence_annotations": human_sentence_annotations,
        "zero_span_annotation": zero_span_annotation,
        "few_span_annotation": few_span_annotation,
        "zero_sentence_annotation": zero_sentence_annotation,
        "few_sentence_annotation": few_sentence_annotation,
        "foreign_project": foreign_project,
        "foreign_sdoc": foreign_sdoc,
        "foreign_code": foreign_code,
        "foreign_span_annotation": foreign_span_annotation,
    }
