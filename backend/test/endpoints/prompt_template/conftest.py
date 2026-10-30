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
from core.annotation.span_annotation_crud import crud_span_anno
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
from core.project.project_service import ProjectService
from core.prompt_template.prompt_template_dto import (
    PromptCode,
    PromptExample,
    PromptExamplesCreate,
    PromptMetadataField,
    PromptTag,
    PromptTemplateCreate,
    PromptTemplateRead,
    PromptTemplateUpdate,
    PromptTemplateVersionCreate,
    SentencePromptExample,
    SpanPromptExample,
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
from core.user.user_orm import UserORM
from core.user.user_service import UserService

EXAMPLE_SENTENCES = ["Alice wrote the report.", "The report is long.", "Bob read it."]
EXAMPLE_CONTENT = " ".join(EXAMPLE_SENTENCES)
CLAIM_DESCRIPTION = "A statement that can be disputed."
SPAN_V1_PROMPT = (
    "Tag these codes: <code_names>\n\n<output-format:inline>\n\nText:\n<document:whole>"
)
SPAN_V2_PROMPT = (
    "Tag these codes: <code_names>\n<codes>\n\n<output-format:inline>\n\n"
    "<examples>\n\nText:\n<document:sentences>"
)


class PromptTemplateProject(TypedDict):
    """This fixture sets up the following projects.

    Project ``Simple Test Project`` belongs to ``testuser@dats.org``. It was created
    by the project service, so it has the system codes (incl. ``PERSON``) and the
    10 default prompt templates (one per output format and language). It also
    contains:

    - Document ``Example document`` with the sentences ``EXAMPLE_SENTENCES``:
      S0 "Alice wrote the report." (chars 0-23), S1 "The report is long."
      (24-43), S2 "Bob read it." (44-56). Its 11 whitespace tokens are
      Alice wrote the report. The report is long. Bob read it.
    - Code ``Claim`` (``CLAIM_DESCRIPTION``, "A statement that can be
      disputed."), tag ``Report`` ("Documents about reports.") and user metadata
      field ``author`` (string, "The author of the document.").
    - Span annotations of ``testuser@dats.org``: ``Alice`` (PERSON, 0-5),
      ``the report`` (Claim, 12-22) and ``Bob`` (PERSON, 44-47).
    - Span annotation ``wrote`` (Claim, 6-11) of the virtual annotator
      ``Assistant-Run1``
      (another annotator than ``testuser@dats.org``).
    - Sentence annotations of ``testuser@dats.org``: S0 (PERSON) and S1-S2
      (Claim).
    - Code ``OBSOLETE`` and a Claim span annotation ``long`` of
      ``testuser@dats.org`` that were created and deleted again; only their ids
      are kept (``deleted_code_id``, ``deleted_span_annotation_id``).
    - Examples created by the prompt template service (the examples endpoint):
      ``alice_example`` from the ``Alice`` annotation, ``bob_example`` from the
      ``Bob`` annotation and ``sentence_example`` from the S1-S2 annotation.
    - Template ``Span tagging`` (ANNOTATION, English) with two versions saved by
      ``testuser@dats.org``: version 1 has ``SPAN_V1_PROMPT``
      (``<document:whole>``) with code PERSON; version 2 has ``SPAN_V2_PROMPT``
      (``<codes>``, ``<examples>``, ``<document:sentences>``) with codes PERSON
      and Claim and the example ``alice_example``.

    Project ``Unauthorized project`` is not associated with the test user and was
    created without the project service, so it has no default templates. It
    contains document ``Foreign document`` ("Eve is foreign."), code ``FOREIGN``,
    tag ``Foreign tag``, a span annotation ``Eve`` (FOREIGN) of
    ``testuser@dats.org`` and template ``Foreign tagging`` (ANNOTATION, English)
    with one version: ``SPAN_V1_PROMPT`` with code FOREIGN.

    Non-obvious derived behavior:

    - The default templates are named ``default-<slug>-<language>``. Listed by
      name, the database sorts byte-wise (upper case first), so ``Span tagging``
      comes before the defaults.
    - A span example is the sentence around its annotation with all spans of the
      annotator in it: ``alice_example`` is S0 with the spans PERSON 0-5 and
      Claim 12-22 (not the assistant's ``wrote``); ``bob_example`` is S2 with
      PERSON 0-3.
    - ``sentence_example`` is the text of S1 and S2 joined by a space.
    - Inline and context formats show code names upper case (``CLAIM``), the
      sentence format as they are (``Claim``).
    """

    project: ProjectORM
    sdoc: SourceDocumentORM
    person_code: CodeORM
    claim_code: CodeORM
    report_tag: TagORM
    author_field: ProjectMetadataORM
    alice_annotation: SpanAnnotationORM
    report_annotation: SpanAnnotationORM
    bob_annotation: SpanAnnotationORM
    assistant_annotation: SpanAnnotationORM
    person_sentence_annotation: SentenceAnnotationORM
    claim_sentence_annotation: SentenceAnnotationORM
    deleted_code_id: int
    deleted_span_annotation_id: int
    alice_example: SpanPromptExample
    bob_example: SpanPromptExample
    sentence_example: SentencePromptExample
    span_template: PromptTemplateRead
    foreign_project: ProjectORM
    foreign_sdoc: SourceDocumentORM
    foreign_code: CodeORM
    foreign_tag: TagORM
    foreign_span_annotation: SpanAnnotationORM
    foreign_template: PromptTemplateRead


def prompt_code(code: CodeORM) -> PromptCode:
    """The snapshot of a code as a prompt selects it."""
    return PromptCode(
        code_id=code.id, name=code.name, description=code.description or ""
    )


def _create_sentence_annotation(
    db: Session,
    *,
    sdoc: SourceDocumentORM,
    start: int,
    end: int,
    code_id: int,
    user_id: int,
) -> SentenceAnnotationORM:
    return crud_sentence_anno.read(
        db=db,
        id=SentenceAnnotationService()
        .create(
            db=db,
            user_id=user_id,
            create_dto=SentenceAnnotationCreate(
                sdoc_id=sdoc.id,
                sentence_id_start=start,
                sentence_id_end=end,
                code_id=code_id,
            ),
        )
        .id,
    )


def _create_code(
    db: Session, *, project_id: int, name: str, description: str
) -> CodeORM:
    return crud_code.create(
        db=db,
        create_dto=CodeCreate(
            name=name,
            description=description,
            project_id=project_id,
            is_system=False,
        ),
    )


@pytest.fixture(scope="function")
def prompt_template_project(
    db_session: Session, test_project: ProjectORM, test_user: UserORM
) -> PromptTemplateProject:
    """Create the projects described by PromptTemplateProject."""
    service = PromptTemplateService()
    sdoc = dats_test_utils.create_text_document(
        db_session,
        project=test_project,
        filename="example.txt",
        name="Example document",
        sentences=EXAMPLE_SENTENCES,
    )
    person_code = crud_code.read_by_name_and_project(
        db=db_session, code_name="PERSON", project_id=test_project.id
    )
    assert person_code is not None, "The default PERSON system code is missing"
    claim_code = _create_code(
        db_session,
        project_id=test_project.id,
        name="Claim",
        description=CLAIM_DESCRIPTION,
    )
    report_tag = crud_tag.create(
        db=db_session,
        create_dto=TagCreate(
            name="Report",
            description="Documents about reports.",
            project_id=test_project.id,
        ),
    )
    author_field = crud_project_meta.create(
        db=db_session,
        create_dto=ProjectMetadataCreate(
            project_id=test_project.id,
            key="author",
            metatype=MetaType.STRING,
            read_only=False,
            doctype=DocType.text,
            description="The author of the document.",
        ),
    )

    def span(
        text: str, code: CodeORM, user_id: int = test_user.id
    ) -> SpanAnnotationORM:
        return dats_test_utils.create_span_for_text(
            db_session, sdoc=sdoc, text=text, code_id=code.id, user_id=user_id
        )

    alice_annotation = span("Alice", person_code)
    report_annotation = span("the report", claim_code)
    bob_annotation = span("Bob", person_code)
    assistant = UserService().create_virtual_annotator(
        db=db_session, project_id=test_project.id, name="Assistant-Run1"
    )
    assistant_annotation = span("wrote", claim_code, assistant.id)
    person_sentence_annotation = _create_sentence_annotation(
        db_session,
        sdoc=sdoc,
        start=0,
        end=0,
        code_id=person_code.id,
        user_id=test_user.id,
    )
    claim_sentence_annotation = _create_sentence_annotation(
        db_session,
        sdoc=sdoc,
        start=1,
        end=2,
        code_id=claim_code.id,
        user_id=test_user.id,
    )

    deleted_code = _create_code(
        db_session, project_id=test_project.id, name="OBSOLETE", description=""
    )
    deleted_code_id = deleted_code.id
    crud_code.delete(db=db_session, id=deleted_code_id)
    deleted_span_annotation_id = span("long", claim_code).id
    crud_span_anno.delete(db=db_session, id=deleted_span_annotation_id)

    def examples(
        kind: PromptExampleKind, annotation_ids: list[int]
    ) -> list[PromptExample]:
        return service.create_prompt_examples(
            db=db_session,
            create_dto=PromptExamplesCreate(
                project_id=test_project.id, kind=kind, annotation_ids=annotation_ids
            ),
        )

    [alice_example] = examples(PromptExampleKind.SPAN, [alice_annotation.id])
    [bob_example] = examples(PromptExampleKind.SPAN, [bob_annotation.id])
    [sentence_example] = examples(
        PromptExampleKind.SENTENCE, [claim_sentence_annotation.id]
    )
    assert isinstance(alice_example, SpanPromptExample)
    assert isinstance(bob_example, SpanPromptExample)
    assert isinstance(sentence_example, SentencePromptExample)

    span_template = service.create_prompt_template(
        db=db_session,
        user_id=test_user.id,
        create_dto=PromptTemplateCreate(
            project_id=test_project.id,
            name="Span tagging",
            task_type=TaskType.ANNOTATION,
            language=PromptLanguage.EN,
            prompt=SPAN_V1_PROMPT,
            codes=[prompt_code(person_code)],
        ),
    )
    span_template = service.create_prompt_template_version(
        db=db_session,
        user_id=test_user.id,
        prompt_template_id=span_template.id,
        create_dto=PromptTemplateVersionCreate(
            prompt=SPAN_V2_PROMPT,
            codes=[prompt_code(person_code), prompt_code(claim_code)],
            examples=[alice_example],
        ),
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
    foreign_code = _create_code(
        db_session,
        project_id=foreign_project.id,
        name="FOREIGN",
        description="A foreign-project code.",
    )
    foreign_tag = crud_tag.create(
        db=db_session,
        create_dto=TagCreate(
            name="Foreign tag",
            description="A foreign-project tag.",
            project_id=foreign_project.id,
        ),
    )
    foreign_span_annotation = dats_test_utils.create_span_for_text(
        db_session,
        sdoc=foreign_sdoc,
        text="Eve",
        code_id=foreign_code.id,
        user_id=test_user.id,
    )
    foreign_template = service.create_prompt_template(
        db=db_session,
        user_id=test_user.id,
        create_dto=PromptTemplateCreate(
            project_id=foreign_project.id,
            name="Foreign tagging",
            task_type=TaskType.ANNOTATION,
            language=PromptLanguage.EN,
            prompt=SPAN_V1_PROMPT,
            codes=[prompt_code(foreign_code)],
        ),
    )
    db_session.commit()

    return {
        "project": test_project,
        "sdoc": sdoc,
        "person_code": person_code,
        "claim_code": claim_code,
        "report_tag": report_tag,
        "author_field": author_field,
        "alice_annotation": alice_annotation,
        "report_annotation": report_annotation,
        "bob_annotation": bob_annotation,
        "assistant_annotation": assistant_annotation,
        "person_sentence_annotation": person_sentence_annotation,
        "claim_sentence_annotation": claim_sentence_annotation,
        "deleted_code_id": deleted_code_id,
        "deleted_span_annotation_id": deleted_span_annotation_id,
        "alice_example": alice_example,
        "bob_example": bob_example,
        "sentence_example": sentence_example,
        "span_template": span_template,
        "foreign_project": foreign_project,
        "foreign_sdoc": foreign_sdoc,
        "foreign_code": foreign_code,
        "foreign_tag": foreign_tag,
        "foreign_span_annotation": foreign_span_annotation,
        "foreign_template": foreign_template,
    }


class PromptTemplateEximportProjects(TypedDict):
    """This fixture sets up the following projects.

    Project ``Simple Test Project`` (``source``) is ``prompt_template_project``
    (see PromptTemplateProject) with these changes:

    - Template ``Span tagging`` is archived.
    - Template ``Tag selection`` (TAGGING, English) with one version saved by
      ``testuser@dats.org``: the default tags prompt with tag ``Report``.
    - Template ``Metadata selection`` (METADATA_EXTRACTION, English) with one
      version saved by ``testuser@dats.org``: the default metadata prompt with
      metadata field ``author``.
    - Template ``Sentence examples`` (SENTENCE_ANNOTATION, English) with one
      version saved by ``testuser@dats.org``: the default sentences prompt (which
      shows ``<examples>``) with code ``Claim`` and the example
      ``sentence_example``.

    Project ``Import target`` (``target``) of ``testuser@dats.org`` was created by
    the project service, so it has the system codes (incl. ``PERSON``) and the 10
    untouched default templates. It also contains code ``Claim``
    (``CLAIM_DESCRIPTION``), tag ``Report`` ("Documents about reports."), the text
    metadata field ``author`` (string, "The author of the document.") and template
    ``Span tagging`` (ANNOTATION, English) with one version saved by
    ``testuser@dats.org``: ``SPAN_V1_PROMPT`` with code PERSON, i.e. version 1 of
    the source's ``Span tagging``. It has no documents and no annotations.

    Non-obvious derived behavior:

    - Both projects have the same 10 default templates, with equal content.
    - The examples of the source reference the document ``example.txt`` and its
      annotations, which do not exist in the target.
    """

    source: PromptTemplateProject
    tag_template: PromptTemplateRead
    metadata_template: PromptTemplateRead
    sentence_template: PromptTemplateRead
    target: ProjectORM
    target_person_code: CodeORM
    target_claim_code: CodeORM
    target_report_tag: TagORM
    target_author_field: ProjectMetadataORM
    target_span_template: PromptTemplateRead


@pytest.fixture(scope="function")
def prompt_template_eximport_projects(
    db_session: Session,
    prompt_template_project: PromptTemplateProject,
    test_user: UserORM,
) -> PromptTemplateEximportProjects:
    """Create the projects described by PromptTemplateEximportProjects."""
    service = PromptTemplateService()
    source = prompt_template_project
    source_id = source["project"].id

    def default_prompt(output_format: OutputFormat) -> str:
        return service.read_default_prompt(
            output_format=output_format, language=PromptLanguage.EN
        ).prompt

    # 1) the changes of the source project
    service.update_prompt_template(
        db=db_session,
        prompt_template_id=source["span_template"].id,
        update_dto=PromptTemplateUpdate(is_archived=True),
    )
    tag_template = service.create_prompt_template(
        db=db_session,
        user_id=test_user.id,
        create_dto=PromptTemplateCreate(
            project_id=source_id,
            name="Tag selection",
            task_type=TaskType.TAGGING,
            language=PromptLanguage.EN,
            prompt=default_prompt(OutputFormat.TAGS),
            tags=[
                PromptTag(
                    tag_id=source["report_tag"].id,
                    name="Report",
                    description="Documents about reports.",
                )
            ],
        ),
    )
    metadata_template = service.create_prompt_template(
        db=db_session,
        user_id=test_user.id,
        create_dto=PromptTemplateCreate(
            project_id=source_id,
            name="Metadata selection",
            task_type=TaskType.METADATA_EXTRACTION,
            language=PromptLanguage.EN,
            prompt=default_prompt(OutputFormat.METADATA),
            metadata_fields=[
                PromptMetadataField(
                    project_metadata_id=source["author_field"].id,
                    key="author",
                    description="The author of the document.",
                    metatype=MetaType.STRING,
                )
            ],
        ),
    )
    sentence_template = service.create_prompt_template(
        db=db_session,
        user_id=test_user.id,
        create_dto=PromptTemplateCreate(
            project_id=source_id,
            name="Sentence examples",
            task_type=TaskType.SENTENCE_ANNOTATION,
            language=PromptLanguage.EN,
            prompt=default_prompt(OutputFormat.SENTENCES),
            codes=[prompt_code(source["claim_code"])],
            examples=[source["sentence_example"]],
        ),
    )

    # 2) the target project
    target = crud_project.read(
        db=db_session,
        id=ProjectService()
        .create_project(
            db=db_session,
            create_dto=ProjectCreate(
                title="Import target", description="Prompt templates are imported here"
            ),
            creating_user_id=test_user.id,
        )
        .id,
    )
    target_person_code = crud_code.read_by_name_and_project(
        db=db_session, code_name="PERSON", project_id=target.id
    )
    assert target_person_code is not None, "The default PERSON system code is missing"
    target_claim_code = _create_code(
        db_session, project_id=target.id, name="Claim", description=CLAIM_DESCRIPTION
    )
    target_report_tag = crud_tag.create(
        db=db_session,
        create_dto=TagCreate(
            name="Report",
            description="Documents about reports.",
            project_id=target.id,
        ),
    )
    target_author_field = crud_project_meta.create(
        db=db_session,
        create_dto=ProjectMetadataCreate(
            project_id=target.id,
            key="author",
            metatype=MetaType.STRING,
            read_only=False,
            doctype=DocType.text,
            description="The author of the document.",
        ),
    )
    target_span_template = service.create_prompt_template(
        db=db_session,
        user_id=test_user.id,
        create_dto=PromptTemplateCreate(
            project_id=target.id,
            name="Span tagging",
            task_type=TaskType.ANNOTATION,
            language=PromptLanguage.EN,
            prompt=SPAN_V1_PROMPT,
            codes=[prompt_code(target_person_code)],
        ),
    )
    db_session.commit()

    return {
        "source": source,
        "tag_template": tag_template,
        "metadata_template": metadata_template,
        "sentence_template": sentence_template,
        "target": target,
        "target_person_code": target_person_code,
        "target_claim_code": target_claim_code,
        "target_report_tag": target_report_tag,
        "target_author_field": target_author_field,
        "target_span_template": target_span_template,
    }
