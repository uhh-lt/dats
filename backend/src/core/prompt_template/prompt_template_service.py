import re

from sqlalchemy.orm import Session

from common.meta_type_enum import MetaType
from common.singleton_meta import SingletonMeta
from core.annotation.sentence_annotation_crud import crud_sentence_anno
from core.annotation.span_annotation_crud import crud_span_anno
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_data_crud import crud_sdoc_data
from core.project.project_crud import crud_project
from core.prompt_template.prompt_template_crud import crud_prompt_template
from core.prompt_template.prompt_template_defaults import DEFAULT_PROMPTS
from core.prompt_template.prompt_template_dto import (
    DocumentUnitInfo,
    OutputFormatInfo,
    PromptBlockInfo,
    PromptCode,
    PromptExample,
    PromptExamplesCreate,
    PromptExampleSpan,
    PromptMetadataField,
    PromptPreview,
    PromptPreviewRequest,
    PromptTag,
    PromptTaskInfo,
    PromptTemplateContent,
    PromptTemplateCreate,
    PromptTemplateCreateIntern,
    PromptTemplateRead,
    PromptTemplateSnapshot,
    PromptTemplateUpdate,
    PromptTemplateVersionCreate,
    PromptTemplateVersionCreateIntern,
    PromptTemplateVersionRead,
    RenderedPromptBlock,
    SentencePromptExample,
    SpanPromptExample,
)
from core.prompt_template.prompt_template_enum import (
    DocumentUnit,
    OutputFormat,
    PromptBlock,
    PromptExampleKind,
    PromptLanguage,
    TaskType,
)
from core.prompt_template.prompt_template_exceptions import (
    InvalidPromptExampleError,
    InvalidPromptPreviewError,
    InvalidPromptTemplateError,
    PromptTemplateMismatchError,
)
from core.prompt_template.prompt_template_renderer import PromptRenderer
from core.prompt_template.prompt_template_specs import (
    BLOCK_DESCRIPTIONS,
    DOCUMENT_UNIT_DESCRIPTIONS,
    OUTPUT_FORMAT_SPECS,
    PROMPT_TASK_SPECS,
    document_placeholder,
    output_format_placeholder,
)
from core.prompt_template.prompt_template_version_crud import (
    crud_prompt_template_version,
)
from core.user.user_crud import SYSTEM_USER_ID

# <document:unit> and <output-format:format>, also with a missing or unknown value
DOCUMENT_PATTERN = re.compile(r"<document(?::([a-z_-]*))?>")
OUTPUT_FORMAT_PATTERN = re.compile(r"<output-format(?::([a-z_-]*))?>")
# lowercase tags like <codes> that look like blocks
PLACEHOLDER_LIKE_PATTERN = re.compile(r"<[a-z_-]+(?::[a-z_-]*)?>")
# the fields of PromptTemplateContent, to split them from create DTOs
_CONTENT_FIELDS = set(PromptTemplateContent.model_fields)


class PromptTemplateService(metaclass=SingletonMeta):
    """The register of prompt templates and their immutable versions.

    A prompt template belongs to a project and one task and is written in one
    language. A version stores the prompt with its blocks and snapshots of
    everything they show (codes, examples, tags, metadata fields), so it renders
    the same prompt forever; only the document is filled in by a run. Every save
    creates a new version.
    """

    def __new__(cls, *args, **kwargs):
        return super(PromptTemplateService, cls).__new__(cls)

    # CREATE

    def create_prompt_template(
        self, *, db: Session, user_id: int | None, create_dto: PromptTemplateCreate
    ) -> PromptTemplateRead:
        # 1) validate the content of the first version
        self.validate_prompt_template(
            db=db,
            project_id=create_dto.project_id,
            prompt=PromptTemplateSnapshot.model_validate(
                create_dto.model_dump(exclude={"name", "project_id"})
            ),
        )

        # 2) create the template
        db_obj = crud_prompt_template.create(
            db=db,
            create_dto=PromptTemplateCreateIntern(
                name=create_dto.name,
                task_type=create_dto.task_type,
                language=create_dto.language,
                project_id=create_dto.project_id,
            ),
        )

        # 3) create its first version
        crud_prompt_template_version.create(
            db=db,
            create_dto=PromptTemplateVersionCreateIntern(
                prompt_template_id=db_obj.id,
                version=1,
                user_id=user_id,
                **create_dto.model_dump(include=_CONTENT_FIELDS),
            ),
        )
        return self.read_prompt_template(db=db, prompt_template_id=db_obj.id)

    def create_prompt_template_version(
        self,
        *,
        db: Session,
        user_id: int,
        prompt_template_id: int,
        create_dto: PromptTemplateVersionCreate,
    ) -> PromptTemplateRead:
        """Save new content of a template as its next version."""
        # 1) validate the content for the template's project and task
        db_obj = crud_prompt_template.read(db=db, id=prompt_template_id)
        self.validate_prompt_template(
            db=db,
            project_id=db_obj.project_id,
            prompt=PromptTemplateSnapshot(
                task_type=db_obj.task_type,
                language=db_obj.language,
                **create_dto.model_dump(),
            ),
        )

        # 2) append the next version
        num_versions = crud_prompt_template_version.count_by_prompt_template(
            db=db, prompt_template_id=prompt_template_id
        )
        crud_prompt_template_version.create(
            db=db,
            create_dto=PromptTemplateVersionCreateIntern(
                prompt_template_id=prompt_template_id,
                version=num_versions + 1,
                user_id=user_id,
                **create_dto.model_dump(),
            ),
        )
        return self.read_prompt_template(db=db, prompt_template_id=prompt_template_id)

    def create_default_prompt_templates(
        self, *, db: Session, project_id: int
    ) -> list[PromptTemplateRead]:
        """Create one default template per output format and language for a new project.

        The defaults select nothing yet: a new project has no codes, tags or
        metadata fields.
        """
        return [
            self.create_prompt_template(
                db=db,
                user_id=SYSTEM_USER_ID,
                create_dto=PromptTemplateCreate(
                    project_id=project_id,
                    name=f"default-{spec.default_name_slug}-{language.value}",
                    task_type=spec.task_type,
                    language=language,
                    **self.read_default_prompt(
                        output_format=output_format, language=language
                    ).model_dump(),
                ),
            )
            for output_format, spec in OUTPUT_FORMAT_SPECS.items()
            for language in PromptLanguage
        ]

    def create_prompt_examples(
        self, *, db: Session, create_dto: PromptExamplesCreate
    ) -> list[PromptExample]:
        """Turn annotations into few-shot examples, in the order of the annotation ids.

        A span example is the text of the sentences around a span annotation
        with all spans its annotator annotated there, so the example shows every
        relevant passage of the text, not only the selected one. Annotations of
        the same text become one example. A sentence example is the text of a
        sentence annotation. Examples are snapshots: template versions stay
        unchanged when the annotations or documents change.
        """
        match create_dto.kind:
            case PromptExampleKind.SPAN:
                return self._create_span_examples(
                    db=db,
                    project_id=create_dto.project_id,
                    annotation_ids=create_dto.annotation_ids,
                )
            case PromptExampleKind.SENTENCE:
                return self._create_sentence_examples(
                    db=db,
                    project_id=create_dto.project_id,
                    annotation_ids=create_dto.annotation_ids,
                )

    # READ

    def read_prompt_template(
        self, *, db: Session, prompt_template_id: int
    ) -> PromptTemplateRead:
        db_obj = crud_prompt_template.read(db=db, id=prompt_template_id)
        return PromptTemplateRead.model_validate(db_obj)

    def read_prompt_templates_by_project(
        self, *, db: Session, project_id: int
    ) -> list[PromptTemplateRead]:
        db_objs = crud_prompt_template.read_by_project(db=db, project_id=project_id)
        return [PromptTemplateRead.model_validate(db_obj) for db_obj in db_objs]

    def read_prompt_template_version(
        self, *, db: Session, version_id: int
    ) -> PromptTemplateVersionRead:
        db_obj = crud_prompt_template_version.read(db=db, id=version_id)
        return PromptTemplateVersionRead.model_validate(db_obj)

    def read_snapshot(
        self,
        *,
        db: Session,
        version_id: int,
        project_id: int,
        task_type: TaskType | None = None,
    ) -> PromptTemplateSnapshot:
        """Return what a run needs to render a stored version.

        Raises:
            NoSuchElementError: If the version does not exist.
            PromptTemplateMismatchError: If the version belongs to another project
                or (if given) task.
        """
        db_obj = crud_prompt_template_version.read(db=db, id=version_id)
        template = db_obj.prompt_template
        if template.project_id != project_id or (
            task_type is not None and template.task_type != task_type
        ):
            raise PromptTemplateMismatchError(
                version_id=version_id,
                project_id=project_id,
                task_type=task_type or TaskType(template.task_type),
            )
        version = PromptTemplateVersionRead.model_validate(db_obj)
        return PromptTemplateSnapshot(
            task_type=template.task_type,
            language=template.language,
            **version.model_dump(include=_CONTENT_FIELDS),
        )

    def read_default_prompt(
        self, *, output_format: OutputFormat, language: PromptLanguage
    ) -> PromptTemplateContent:
        """Return the default prompt of an output format, without selections."""
        return PromptTemplateContent(prompt=DEFAULT_PROMPTS[output_format][language])

    def read_task_info(self, *, task_type: TaskType) -> PromptTaskInfo:
        """Describe the blocks that the prompts of a task can use."""
        spec = PROMPT_TASK_SPECS[task_type]
        return PromptTaskInfo(
            task_type=task_type,
            document_units=[
                DocumentUnitInfo(
                    unit=unit,
                    placeholder=document_placeholder(unit),
                    description=DOCUMENT_UNIT_DESCRIPTIONS[unit],
                )
                for unit in spec.document_units
            ],
            output_formats=[
                OutputFormatInfo(
                    output_format=output_format,
                    placeholder=output_format_placeholder(output_format),
                    name=OUTPUT_FORMAT_SPECS[output_format].name,
                    description=OUTPUT_FORMAT_SPECS[output_format].description,
                    default_document_unit=OUTPUT_FORMAT_SPECS[
                        output_format
                    ].default_document_unit,
                )
                for output_format in spec.output_formats
            ],
            blocks=[
                PromptBlockInfo(block=block, description=BLOCK_DESCRIPTIONS[block])
                for block in spec.blocks
            ],
            required_blocks=list(spec.required_blocks),
            example_kind=spec.example_kind,
        )

    def refresh_content(
        self, *, db: Session, project_id: int, content: PromptTemplateContent
    ) -> PromptTemplateContent:
        """Replace the selections of a prompt with the current state of the project.

        Codes, tags and metadata fields get their current names and descriptions,
        examples are created again from their annotations. Selections whose
        project data was deleted are dropped.
        """
        # 1) codes, tags and metadata fields
        project = crud_project.read(db=db, id=project_id)
        codes = {code.id: code for code in project.codes}
        tags = {tag.id: tag for tag in project.tags}
        fields = {field.id: field for field in project.metadata_}
        refreshed_codes = [
            PromptCode(
                code_id=code.code_id,
                name=codes[code.code_id].name,
                description=codes[code.code_id].description or "",
            )
            for code in content.codes
            if code.code_id in codes
        ]
        refreshed_tags = [
            PromptTag(
                tag_id=tag.tag_id,
                name=tags[tag.tag_id].name,
                description=tags[tag.tag_id].description or "",
            )
            for tag in content.tags
            if tag.tag_id in tags
        ]
        refreshed_fields = [
            PromptMetadataField(
                project_metadata_id=field.project_metadata_id,
                key=fields[field.project_metadata_id].key,
                description=fields[field.project_metadata_id].description,
                metatype=MetaType(fields[field.project_metadata_id].metatype),
            )
            for field in content.metadata_fields
            if field.project_metadata_id in fields
        ]

        # 2) examples, from the annotations that still exist
        refreshed_examples: list[PromptExample] = []
        for kind, crud in (
            (PromptExampleKind.SPAN, crud_span_anno),
            (PromptExampleKind.SENTENCE, crud_sentence_anno),
        ):
            annotation_ids = [
                annotation_id
                for example in content.examples
                if example.kind == kind
                for annotation_id in example.source_annotation_ids
                if crud.exists(db=db, id=annotation_id)
            ]
            if annotation_ids:
                refreshed_examples += self.create_prompt_examples(
                    db=db,
                    create_dto=PromptExamplesCreate(
                        project_id=project_id,
                        kind=kind,
                        annotation_ids=list(dict.fromkeys(annotation_ids)),
                    ),
                )

        return PromptTemplateContent(
            prompt=content.prompt,
            settings=content.settings,
            codes=refreshed_codes,
            examples=refreshed_examples,
            tags=refreshed_tags,
            metadata_fields=refreshed_fields,
        )

    def preview_prompt(
        self, *, db: Session, request: PromptPreviewRequest
    ) -> PromptPreview:
        """Render a stored version or an unsaved draft for one message of a document."""
        # 1) resolve and validate the prompt
        if request.draft is not None:
            prompt = request.draft
            renderer = self.validate_prompt_template(
                db=db, project_id=request.project_id, prompt=prompt
            )
        else:
            assert request.prompt_template_version_id is not None
            prompt = self.read_snapshot(
                db=db,
                version_id=request.prompt_template_version_id,
                project_id=request.project_id,
            )
            renderer = self.build_renderer(prompt=prompt)

        # 2) render the requested message, or the prompt without a document
        blocks = [
            RenderedPromptBlock(placeholder=placeholder, text=text)
            for placeholder, text in renderer.blocks.items()
        ]
        unknown_placeholders = self.find_unknown_placeholders(prompt=prompt)
        if request.sdoc_id is None:
            return PromptPreview(
                sdoc_id=None,
                message_index=0,
                num_messages=0,
                prompt=renderer.render_without_document(),
                blocks=blocks,
                is_fewshot=renderer.is_fewshot,
                unknown_placeholders=unknown_placeholders,
            )
        if crud_sdoc.read(db=db, id=request.sdoc_id).project_id != request.project_id:
            raise InvalidPromptPreviewError(
                f"Document {request.sdoc_id} does not belong to project "
                f"{request.project_id}."
            )
        segments = renderer.segments(crud_sdoc_data.read(db=db, id=request.sdoc_id))
        if request.message_index >= len(segments):
            raise InvalidPromptPreviewError(
                f"Message {request.message_index} does not exist, document "
                f"{request.sdoc_id} has {len(segments)} message(s)."
            )
        return PromptPreview(
            sdoc_id=request.sdoc_id,
            message_index=request.message_index,
            num_messages=len(segments),
            prompt=renderer.render(segments[request.message_index]),
            blocks=blocks,
            is_fewshot=renderer.is_fewshot,
            unknown_placeholders=unknown_placeholders,
        )

    # UPDATE

    def update_prompt_template(
        self,
        *,
        db: Session,
        prompt_template_id: int,
        update_dto: PromptTemplateUpdate,
    ) -> PromptTemplateRead:
        """Rename or (un)archive a template. This does not create a version."""
        crud_prompt_template.update(db=db, id=prompt_template_id, update_dto=update_dto)
        return self.read_prompt_template(db=db, prompt_template_id=prompt_template_id)

    # VALIDATION AND RENDERING

    def validate_prompt_template(
        self, *, db: Session, project_id: int, prompt: PromptTemplateSnapshot
    ) -> PromptRenderer:
        """Validate a prompt and its selections against the rules of its task.

        The selections may be empty, so a template can be saved before it is
        complete; a run checks that it is (``assert_runnable``).

        Returns:
            The renderer of the prompt.

        Raises:
            InvalidPromptTemplateError: If a block rule is violated or a selection
                belongs to another project.
            InvalidPromptExampleError: If an example rule is violated.
        """
        renderer = self.build_renderer(prompt=prompt)
        self._validate_selections(db=db, project_id=project_id, prompt=prompt)
        return renderer

    def build_renderer(self, *, prompt: PromptTemplateSnapshot) -> PromptRenderer:
        """Validate the blocks of a prompt and return its renderer.

        The prompt contains exactly one <document:unit> and one
        <output-format:format> block of its task, at least one of the task's
        required blocks and no blocks of other tasks.

        Raises:
            InvalidPromptTemplateError: If a block rule is violated.
        """
        spec = PROMPT_TASK_SPECS[prompt.task_type]
        text = prompt.prompt
        units = [unit.value for unit in spec.document_units]
        formats = [output_format.value for output_format in spec.output_formats]

        # 1) exactly one document block of the task
        document_values = DOCUMENT_PATTERN.findall(text)
        allowed_documents = [document_placeholder(DocumentUnit(unit)) for unit in units]
        if len(document_values) != 1:
            raise InvalidPromptTemplateError(
                f"The prompt must contain exactly one document block, one of "
                f"{allowed_documents}."
            )
        if document_values[0] not in units:
            raise InvalidPromptTemplateError(
                f"<document:{document_values[0]}> is not supported for this task! "
                f"Use one of {allowed_documents}."
            )

        # 2) exactly one output format block of the task
        format_values = OUTPUT_FORMAT_PATTERN.findall(text)
        allowed_formats = [
            output_format_placeholder(OutputFormat(value)) for value in formats
        ]
        if len(format_values) != 1:
            raise InvalidPromptTemplateError(
                f"The prompt must contain exactly one output format block, one of "
                f"{allowed_formats}."
            )
        if format_values[0] not in formats:
            raise InvalidPromptTemplateError(
                f"<output-format:{format_values[0]}> is not supported for this "
                f"task! Use one of {allowed_formats}."
            )

        # 3) the required blocks of the task and no blocks of other tasks
        if not any(block.value in text for block in spec.required_blocks):
            raise InvalidPromptTemplateError(
                "The prompt must contain "
                + " or ".join(block.value for block in spec.required_blocks)
                + "!"
            )
        for block in PromptBlock:
            if block not in spec.blocks and block.value in text:
                raise InvalidPromptTemplateError(
                    f"{block.value} is not supported for this task!"
                )

        return PromptRenderer(
            prompt=prompt,
            document_unit=DocumentUnit(document_values[0]),
            output_format=OutputFormat(format_values[0]),
        )

    def assert_runnable(self, *, prompt: PromptTemplateSnapshot) -> None:
        """Check that a prompt selects what its task needs to run.

        Raises:
            InvalidPromptTemplateError: If the prompt selects no codes, tags or
                metadata fields.
        """
        match prompt.task_type:
            case TaskType.ANNOTATION | TaskType.SENTENCE_ANNOTATION:
                missing = "codes" if not prompt.codes else None
            case TaskType.TAGGING:
                missing = "tags" if not prompt.tags else None
            case TaskType.METADATA_EXTRACTION:
                missing = "metadata fields" if not prompt.metadata_fields else None
        if missing is not None:
            raise InvalidPromptTemplateError(
                f"The prompt selects no {missing}! Select them before running it."
            )

    def find_unknown_placeholders(self, *, prompt: PromptTemplateSnapshot) -> list[str]:
        """Return placeholder-like tags (e.g. <code>) that no block of the task fills.

        They are sent to the LLM verbatim, which is often a typo.
        """
        spec = PROMPT_TASK_SPECS[prompt.task_type]
        known = (
            {block.value for block in spec.blocks}
            | {document_placeholder(unit) for unit in spec.document_units}
            | {
                output_format_placeholder(output_format)
                for output_format in spec.output_formats
            }
        )
        unknown: list[str] = []
        for match in PLACEHOLDER_LIKE_PATTERN.findall(prompt.prompt):
            if match not in known and match not in unknown:
                unknown.append(match)
        return unknown

    def _validate_selections(
        self, *, db: Session, project_id: int, prompt: PromptTemplateSnapshot
    ) -> None:
        # 1) the selections belong to the project
        project = crud_project.read(db=db, id=project_id)
        project_code_ids = {code.id for code in project.codes}
        example_code_ids = [
            code_id
            for example in prompt.examples
            for code_id in (
                [span.code_id for span in example.spans]
                if isinstance(example, SpanPromptExample)
                else [example.code_id]
            )
        ]
        foreign = [
            *(
                f"code {code_id}"
                for code_id in dict.fromkeys(
                    [code.code_id for code in prompt.codes] + example_code_ids
                )
                if code_id not in project_code_ids
            ),
            *(
                f"tag {tag.tag_id}"
                for tag in prompt.tags
                if tag.tag_id not in {tag.id for tag in project.tags}
            ),
            *(
                f"metadata field {field.project_metadata_id}"
                for field in prompt.metadata_fields
                if field.project_metadata_id
                not in {field.id for field in project.metadata_}
            ),
        ]
        if foreign:
            raise InvalidPromptTemplateError(
                f"The prompt selects {', '.join(foreign)}, which do not belong to "
                f"project {project_id}."
            )

        # 2) the examples fit the task and are shown
        if not prompt.examples:
            return
        example_kind = PROMPT_TASK_SPECS[prompt.task_type].example_kind
        if example_kind is None:
            raise InvalidPromptExampleError(
                "This task does not support few-shot examples."
            )
        if any(example.kind != example_kind for example in prompt.examples):
            raise InvalidPromptExampleError(
                f"This task only supports examples of kind {example_kind.value}."
            )
        if PromptBlock.EXAMPLES.value not in prompt.prompt:
            raise InvalidPromptExampleError(
                f"Add {PromptBlock.EXAMPLES.value} to the prompt to show the examples."
            )

    def _create_span_examples(
        self, *, db: Session, project_id: int, annotation_ids: list[int]
    ) -> list[PromptExample]:
        annotations = crud_span_anno.read_by_ids(db=db, ids=annotation_ids)
        self._assert_annotations_in_project(
            annotation_ids=[
                a.id for a in annotations if a.get_project_id() != project_id
            ],
            project_id=project_id,
        )
        sdoc_datas = {
            sdoc_data.id: sdoc_data
            for sdoc_data in crud_sdoc_data.read_by_ids(
                db=db, ids=[annotation.sdoc_id for annotation in annotations]
            )
        }

        # 1) the text of an annotation: the sentences it overlaps
        examples: dict[tuple[int, int, int, int], SpanPromptExample] = {}
        for annotation in annotations:
            sdoc_data = sdoc_datas[annotation.sdoc_id]
            sentence_offsets = [
                (sentence_start, sentence_end)
                for sentence_start, sentence_end in sdoc_data.sentence_character_offsets
                if sentence_start < annotation.end and sentence_end > annotation.begin
            ]
            text_start = min(
                [annotation.begin, *(start for start, _ in sentence_offsets)]
            )
            text_end = max([annotation.end, *(end for _, end in sentence_offsets)])

            # 2) annotations of the same annotator in the same text share an example
            key = (annotation.sdoc_id, annotation.user_id, text_start, text_end)
            if key in examples:
                examples[key].source_annotation_ids.append(annotation.id)
                continue

            # 3) the example shows all spans of the annotator within the text
            spans = [
                PromptExampleSpan(
                    code_id=span.code_id,
                    begin=span.begin - text_start,
                    end=span.end - text_start,
                )
                for span in sorted(
                    crud_span_anno.read_by_user_and_sdoc(
                        db=db, user_id=annotation.user_id, sdoc_id=annotation.sdoc_id
                    ),
                    key=lambda span: (span.begin, span.end),
                )
                if text_start <= span.begin and span.end <= text_end
            ]
            examples[key] = SpanPromptExample(
                kind=PromptExampleKind.SPAN,
                sdoc_id=annotation.sdoc_id,
                source_annotation_ids=[annotation.id],
                text=sdoc_data.content[text_start:text_end],
                spans=spans,
            )
        return list(examples.values())

    def _create_sentence_examples(
        self, *, db: Session, project_id: int, annotation_ids: list[int]
    ) -> list[PromptExample]:
        annotations = crud_sentence_anno.read_by_ids(db=db, ids=annotation_ids)
        self._assert_annotations_in_project(
            annotation_ids=[
                a.id for a in annotations if a.get_project_id() != project_id
            ],
            project_id=project_id,
        )
        sdoc_datas = crud_sdoc_data.read_by_ids(
            db=db, ids=[annotation.sdoc_id for annotation in annotations]
        )
        return [
            SentencePromptExample(
                kind=PromptExampleKind.SENTENCE,
                code_id=annotation.code_id,
                sdoc_id=sdoc_data.id,
                source_annotation_ids=[annotation.id],
                text=" ".join(
                    sdoc_data.sentences[
                        annotation.sentence_id_start : annotation.sentence_id_end + 1
                    ]
                ),
            )
            for annotation, sdoc_data in zip(annotations, sdoc_datas)
        ]

    def _assert_annotations_in_project(
        self, *, annotation_ids: list[int], project_id: int
    ) -> None:
        if annotation_ids:
            raise InvalidPromptExampleError(
                f"The annotations {annotation_ids} do not belong to project "
                f"{project_id}."
            )
