from datetime import date
from typing import TypedDict

import pytest
from sqlalchemy.orm import Session

import dats_test_utils
from common.doc_type_enum import DocType
from common.meta_type_enum import MetaType
from core.annotation.sentence_annotation_crud import crud_sentence_anno
from core.annotation.sentence_annotation_dto import SentenceAnnotationCreate
from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
from core.annotation.sentence_annotation_service import SentenceAnnotationService
from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.code.code_crud import crud_code
from core.code.code_dto import CodeCreate
from core.code.code_orm import CodeORM
from core.doc.source_document_orm import SourceDocumentORM
from core.metadata.project_metadata_crud import crud_project_meta
from core.metadata.project_metadata_dto import ProjectMetadataCreate
from core.metadata.project_metadata_orm import ProjectMetadataORM
from core.project.project_crud import crud_project
from core.project.project_dto import ProjectCreate
from core.project.project_orm import ProjectORM
from core.prompt_template.prompt_template_defaults import DEFAULT_PROMPTS
from core.prompt_template.prompt_template_dto import (
    PromptCode,
    PromptExample,
    PromptExamplesCreate,
    PromptMetadataField,
    PromptTag,
    PromptTemplateCreate,
    PromptTemplateRead,
)
from core.prompt_template.prompt_template_enum import (
    OutputFormat,
    PromptExampleKind,
    PromptLanguage,
    TaskType,
)
from core.prompt_template.prompt_template_service import PromptTemplateService
from core.tag.tag_crud import crud_tag
from core.tag.tag_dto import TagCreate
from core.tag.tag_orm import TagORM
from core.user.user_crud import ASSISTANT_FEWSHOT_ID, ASSISTANT_ZEROSHOT_ID
from core.user.user_orm import UserORM

EXAMPLE_NAMES = ["Anna", "Ben", "Cara", "Dan"]
TARGET_SENTENCES = [
    "The document author is Alice.",
    "The document year is 2024.",
    "The publication date is 2024-01-15.",
    "The document's reviewed status is true.",
    "The document topics are solar and energy.",
]


class LLMAssistantProject(TypedDict):
    """This fixture sets up the following deterministic project.

    Project ``Simple Test Project`` belongs to ``testuser@dats.org`` and contains:

    - Target document ``Target facts`` with the five sentences
      ``TARGET_SENTENCES`` stating author Alice, year 2024, publication date
      2024-01-15, review status true, and topics solar and energy. It is linked
      to the ``Other`` tag.
    - Example document ``Few-shot examples`` with the four sentences "The text
      names <name> as a person." for the names ``EXAMPLE_NAMES`` (Anna, Ben,
      Cara, Dan). Each name has a ``PERSON`` span annotation and each sentence a
      ``FACT`` sentence annotation, all by ``testuser@dats.org``.
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

    - The project was created by the project service, so it has the 10 default
      prompt templates (one per output format and language, e.g.
      ``default-document-tagging-en``), which select nothing; the unauthorized
      project has none.
    - Every main-project document has its read-only ``language`` metadata set to
      ``en``, as after preprocessing; the LLM assistant does not read it.
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
def llm_assistant_project(
    db_session: Session,
    test_project: ProjectORM,
    test_user: UserORM,
) -> LLMAssistantProject:
    """Create the deterministic LLM assistant project described by its TypedDict."""
    example_names = EXAMPLE_NAMES

    target_sdoc = dats_test_utils.create_text_document(
        db_session,
        project=test_project,
        filename="target-facts.txt",
        name="Target facts",
        sentences=TARGET_SENTENCES,
    )
    example_sdoc = dats_test_utils.create_text_document(
        db_session,
        project=test_project,
        filename="few-shot-examples.txt",
        name="Few-shot examples",
        sentences=[f"The text names {name} as a person." for name in example_names],
    )
    no_match_sdoc = dats_test_utils.create_text_document(
        db_session,
        project=test_project,
        filename="no-match.txt",
        name="No match",
        sentences=["No selected category applies here."],
    )

    person_code = crud_code.read_by_name_and_project(
        db=db_session,
        code_name="PERSON",
        project_id=test_project.id,
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
        date(1999, 1, 1),
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
        dats_test_utils.create_span_for_text(
            db_session,
            sdoc=example_sdoc,
            text=name,
            code_id=person_code.id,
            user_id=test_user.id,
        )
        for name in example_names
    ]
    human_sentence_annotations = crud_sentence_anno.read_by_ids(
        db=db_session,
        ids=[
            dto.id
            for dto in SentenceAnnotationService().create_multi(
                db=db_session,
                user_id=test_user.id,
                create_dtos=[
                    SentenceAnnotationCreate(
                        sdoc_id=example_sdoc.id,
                        sentence_id_start=sentence_id,
                        sentence_id_end=sentence_id,
                        code_id=fact_code.id,
                    )
                    for sentence_id in range(len(example_names))
                ],
            )
        ],
    )

    zero_span_annotation = dats_test_utils.create_span_for_text(
        db_session,
        sdoc=target_sdoc,
        text="Alice",
        code_id=person_code.id,
        user_id=ASSISTANT_ZEROSHOT_ID,
    )
    few_span_annotation = dats_test_utils.create_span_for_text(
        db_session,
        sdoc=target_sdoc,
        text="Alice",
        code_id=person_code.id,
        user_id=ASSISTANT_FEWSHOT_ID,
    )
    zero_sentence_annotation = crud_sentence_anno.read(
        db=db_session,
        id=SentenceAnnotationService()
        .create(
            db=db_session,
            user_id=ASSISTANT_ZEROSHOT_ID,
            create_dto=SentenceAnnotationCreate(
                sdoc_id=target_sdoc.id,
                sentence_id_start=0,
                sentence_id_end=0,
                code_id=fact_code.id,
            ),
        )
        .id,
    )
    few_sentence_annotation = crud_sentence_anno.read(
        db=db_session,
        id=SentenceAnnotationService()
        .create(
            db=db_session,
            user_id=ASSISTANT_FEWSHOT_ID,
            create_dto=SentenceAnnotationCreate(
                sdoc_id=target_sdoc.id,
                sentence_id_start=1,
                sentence_id_end=1,
                code_id=fact_code.id,
            ),
        )
        .id,
    )

    foreign_project = crud_project.create(
        db=db_session,
        create_dto=ProjectCreate(
            title="Unauthorized project",
            description="Not associated with the test user",
        ),
    )
    foreign_sdoc = dats_test_utils.create_text_document(
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
    foreign_span_annotation = dats_test_utils.create_span_for_text(
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


def prompt_code(code: CodeORM) -> PromptCode:
    """The snapshot of a code as a prompt selects it."""
    return PromptCode(
        code_id=code.id, name=code.name, description=code.description or ""
    )


class JobPromptProject(TypedDict):
    """This fixture extends ``llm_assistant_project`` with prompts for jobs.

    - ``span_examples``: the span examples of the four human PERSON annotations
      of ``Few-shot examples``, e.g. "The text names Anna as a person." with the
      PERSON span "Anna" (one example per sentence, in name order).
    - ``sentence_examples``: the sentence examples of the four human FACT
      sentence annotations of ``Few-shot examples``.
    - Template ``Tagging`` (TAGGING, English) with one version: the English
      default tagging prompt with the tags People and Other.
    - Template ``Metadata`` (METADATA_EXTRACTION, English) with one version: the
      English default metadata prompt with the five metadata fields.
    - Template ``Sentence classification`` (SENTENCE_ANNOTATION, English) with
      one version: the English default sentence prompt with code FACT and
      without examples.
    - ``empty_tagging_version_id``: version 1 of the default template
      ``default-document-tagging-en``, which selects no tags.
    - Template ``Foreign tagging`` (ANNOTATION, English) of the unauthorized
      project: the English default inline prompt with code FOREIGN.

    All templates were saved by ``testuser@dats.org``.
    """

    base: LLMAssistantProject
    span_examples: list[PromptExample]
    sentence_examples: list[PromptExample]
    tagging_template: PromptTemplateRead
    metadata_template: PromptTemplateRead
    sentence_template: PromptTemplateRead
    empty_tagging_version_id: int
    foreign_template: PromptTemplateRead


@pytest.fixture(scope="function")
def job_prompt_project(
    db_session: Session,
    llm_assistant_project: LLMAssistantProject,
    test_user: UserORM,
) -> JobPromptProject:
    """Create the prompts described by JobPromptProject."""
    service = PromptTemplateService()
    base = llm_assistant_project
    project_id = base["project"].id

    def examples(
        kind: PromptExampleKind, annotation_ids: list[int]
    ) -> list[PromptExample]:
        return service.create_prompt_examples(
            db=db_session,
            create_dto=PromptExamplesCreate(
                project_id=project_id, kind=kind, annotation_ids=annotation_ids
            ),
        )

    def template(
        *,
        project_id: int,
        name: str,
        task_type: TaskType,
        output_format: OutputFormat,
        **selections: object,
    ) -> PromptTemplateRead:
        return service.create_prompt_template(
            db=db_session,
            user_id=test_user.id,
            create_dto=PromptTemplateCreate.model_validate(
                {
                    "project_id": project_id,
                    "name": name,
                    "task_type": task_type,
                    "language": PromptLanguage.EN,
                    "prompt": DEFAULT_PROMPTS[output_format][PromptLanguage.EN],
                    **selections,
                }
            ),
        )

    span_examples = examples(
        PromptExampleKind.SPAN, [a.id for a in base["human_span_annotations"]]
    )
    sentence_examples = examples(
        PromptExampleKind.SENTENCE,
        [a.id for a in base["human_sentence_annotations"]],
    )
    tagging_template = template(
        project_id=project_id,
        name="Tagging",
        task_type=TaskType.TAGGING,
        output_format=OutputFormat.TAGS,
        tags=[
            PromptTag(tag_id=tag.id, name=tag.name, description=tag.description or "")
            for tag in [base["people_tag"], base["other_tag"]]
        ],
    )
    metadata_template = template(
        project_id=project_id,
        name="Metadata",
        task_type=TaskType.METADATA_EXTRACTION,
        output_format=OutputFormat.METADATA,
        metadata_fields=[
            PromptMetadataField(
                project_metadata_id=field.id,
                key=field.key,
                description=field.description,
                metatype=MetaType(field.metatype),
            )
            for field in base["metadata_fields"]
        ],
    )
    sentence_template = template(
        project_id=project_id,
        name="Sentence classification",
        task_type=TaskType.SENTENCE_ANNOTATION,
        output_format=OutputFormat.SENTENCES,
        codes=[prompt_code(base["fact_code"])],
    )
    foreign_template = template(
        project_id=base["foreign_project"].id,
        name="Foreign tagging",
        task_type=TaskType.ANNOTATION,
        output_format=OutputFormat.INLINE,
        codes=[prompt_code(base["foreign_code"])],
    )
    empty_tagging_template = next(
        default
        for default in service.read_prompt_templates_by_project(
            db=db_session, project_id=project_id
        )
        if default.name == "default-document-tagging-en"
    )
    db_session.commit()

    return {
        "base": base,
        "span_examples": span_examples,
        "sentence_examples": sentence_examples,
        "tagging_template": tagging_template,
        "metadata_template": metadata_template,
        "sentence_template": sentence_template,
        "empty_tagging_version_id": empty_tagging_template.versions[0].id,
        "foreign_template": foreign_template,
    }
