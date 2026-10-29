from collections.abc import Hashable, Sequence
from typing import TypeVar

import pandas as pd
from loguru import logger
from sqlalchemy.orm import Session

from core.annotation.sentence_annotation_crud import crud_sentence_anno
from core.annotation.span_annotation_crud import crud_span_anno
from core.code.code_crud import crud_code
from core.doc.source_document_crud import crud_sdoc
from core.metadata.project_metadata_crud import crud_project_meta
from core.prompt_template.prompt_template_crud import crud_prompt_template
from core.prompt_template.prompt_template_dto import (
    PromptCode,
    PromptExample,
    PromptExampleSpan,
    PromptMetadataField,
    PromptSettings,
    PromptTag,
    PromptTemplateContent,
    PromptTemplateCreateIntern,
    PromptTemplateUpdate,
    PromptTemplateVersionCreateIntern,
    PromptTemplateVersionRead,
    SentencePromptExample,
    SpanPromptExample,
)
from core.prompt_template.prompt_template_enum import PromptLanguage
from core.prompt_template.prompt_template_orm import PromptTemplateORM
from core.prompt_template.prompt_template_service import PromptTemplateService
from core.prompt_template.prompt_template_specs import (
    OUTPUT_FORMAT_SPECS,
    default_prompt_name,
)
from core.prompt_template.prompt_template_version_crud import (
    crud_prompt_template_version,
)
from core.tag.tag_crud import crud_tag
from core.user.user_crud import SYSTEM_USER_ID, crud_user
from modules.eximport.import_exceptions import ImportPromptTemplatesError
from modules.eximport.prompt_templates.prompt_template_export_schema import (
    PromptExampleForExport,
    PromptSelectionsForExport,
    PromptTemplateExportCollection,
    PromptTemplateExportSchema,
    SpanPromptExampleForExport,
)

# the content fields of a version, to compare versions by their content
_CONTENT_FIELDS = set(PromptTemplateContent.model_fields)

_Reference = TypeVar("_Reference", bound=Hashable)


def import_prompt_templates_to_proj(
    db: Session,
    df: pd.DataFrame,
    project_id: int,
) -> list[int]:
    """
    Import prompt templates with all their versions from a DataFrame into a project.

    The selections of the versions are remapped to the project: codes and tags by
    name, metadata fields by key and doctype, documents by filename, annotations by
    uuid and authors by email. A reference that cannot be resolved is dropped with a
    warning instead of failing the import.

    A template is merged into the template of the same name so that importing never
    loses or duplicates versions:

    - No template of that name exists: it is created with all versions.
    - The existing versions are the first exported versions (e.g. the same export
      imported twice, or a newer export of the same project): the missing versions
      are appended and the archived flag is taken from the export.
    - The exported versions are the first existing versions: nothing changes.
    - The existing template is an untouched default (only its first version, saved
      by the system, with the current default prompt), e.g. one `create_project`
      created: the exported versions replace it.
    - Otherwise both have versions the other lacks: the exported template is
      imported as "<name> (imported)" (or "(imported 2)", ...), merged in the same
      way into a template of that name from an earlier import.

    Versions are compared by their content (prompt, settings and remapped
    selections) and keep their numbers.

    Args:
        db: Database session
        df: DataFrame with one row per prompt template version
        project_id: ID of the project to import the prompt templates into

    Returns:
        IDs of the created or changed prompt templates

    Raises:
        ImportPromptTemplatesError: If the data has an invalid format
    """
    # 1) validate the input data
    try:
        collection = PromptTemplateExportCollection.from_dataframe(df)
    except ValueError as e:
        logger.error(f"Failed to load prompt template import data: {e}")
        raise ImportPromptTemplatesError(
            errors=[f"Invalid data format for prompt templates: {e}"]
        )
    rows_by_name: dict[str, list[PromptTemplateExportSchema]] = {}
    for row in collection.versions:
        rows_by_name.setdefault(row.template_name, []).append(row)
    logger.info(f"Importing {len(rows_by_name)} prompt templates...")

    # 2) remap the selections and authors of every version to the project
    remapper = _Remapper.read(db=db, project_id=project_id, rows=collection.versions)
    templates = [
        _ImportedTemplate(
            rows=sorted(rows, key=lambda row: row.version), remapper=remapper
        )
        for rows in rows_by_name.values()
    ]
    remapper.log_dropped(project_id=project_id)

    # 3) merge every template into the project
    existing_by_name = {
        template.name: template
        for template in crud_prompt_template.read_by_project(
            db=db, project_id=project_id
        )
    }
    default_contents = _default_contents()
    changed_ids: list[int] = []
    for template in templates:
        changed_id = _merge_template(
            db=db,
            project_id=project_id,
            template=template,
            existing_by_name=existing_by_name,
            default_contents=default_contents,
        )
        if changed_id is not None:
            changed_ids.append(changed_id)

    logger.info(
        f"Imported prompt templates into project {project_id}: "
        f"{len(changed_ids)} created or changed."
    )
    return changed_ids


class _ImportedTemplate:
    """An exported template with its versions remapped to the target project."""

    def __init__(
        self, *, rows: list[PromptTemplateExportSchema], remapper: "_Remapper"
    ) -> None:
        first = rows[0]
        self.name = first.template_name
        self.task_type = first.task_type
        self.language = first.language
        self.is_archived = first.is_archived
        self.contents = [remapper.content(row) for row in rows]
        self.user_ids = [remapper.user_id(row.user_email) for row in rows]


def _merge_template(
    db: Session,
    *,
    project_id: int,
    template: _ImportedTemplate,
    existing_by_name: dict[str, PromptTemplateORM],
    default_contents: dict[str, PromptTemplateContent],
) -> int | None:
    """Merge an imported template into the project (see
    `import_prompt_templates_to_proj`). Returns the ID of the created or changed
    template, None if nothing changed."""
    imported = [_dump(content) for content in template.contents]

    # 1) merge into the template of the same name, or into the one of an earlier
    # import of a diverged template
    name = template.name
    existing = existing_by_name.get(name)
    num_imports = 0
    while existing is not None:
        current = [
            _dump(PromptTemplateVersionRead.model_validate(version))
            for version in existing.versions
        ]
        if (
            existing.task_type == template.task_type
            and existing.language == template.language
        ):
            # 1a) the existing versions are the first imported ones: append the rest
            if imported[: len(current)] == current:
                if len(current) == len(imported):
                    return None
                _create_versions(
                    db=db,
                    template_id=existing.id,
                    template=template,
                    start=len(current),
                )
                _set_archived(
                    db=db, template_id=existing.id, is_archived=template.is_archived
                )
                return existing.id

            # 1b) the imported versions are the first existing ones: nothing to do
            if current[: len(imported)] == imported:
                return None

            # 1c) an untouched default: the imported versions replace it
            if _is_untouched_default(existing, default_contents=default_contents):
                crud_prompt_template_version.delete_multi(
                    db=db, ids=[version.id for version in existing.versions]
                )
                db.expire(existing, ["versions"])
                _create_versions(
                    db=db, template_id=existing.id, template=template, start=0
                )
                _set_archived(
                    db=db, template_id=existing.id, is_archived=template.is_archived
                )
                return existing.id

        # 1d) diverged: try the name of the next import
        num_imports += 1
        name = (
            f"{template.name} (imported)"
            if num_imports == 1
            else f"{template.name} (imported {num_imports})"
        )
        existing = existing_by_name.get(name)

    # 2) a new template
    db_obj = crud_prompt_template.create(
        db=db,
        create_dto=PromptTemplateCreateIntern(
            name=name,
            task_type=template.task_type,
            language=template.language,
            project_id=project_id,
        ),
    )
    existing_by_name[name] = db_obj
    _create_versions(db=db, template_id=db_obj.id, template=template, start=0)
    _set_archived(db=db, template_id=db_obj.id, is_archived=template.is_archived)
    if name != template.name:
        logger.warning(
            f"Prompt template '{template.name}' differs from the one in project "
            f"{project_id}, imported it as '{name}'."
        )
    return db_obj.id


def _create_versions(
    db: Session, *, template_id: int, template: _ImportedTemplate, start: int
) -> None:
    """Create the versions of an imported template from position `start` on."""
    crud_prompt_template_version.create_multi(
        db=db,
        create_dtos=[
            PromptTemplateVersionCreateIntern(
                prompt_template_id=template_id,
                version=i + 1,
                user_id=user_id,
                **content.model_dump(),
            )
            for i, (content, user_id) in enumerate(
                zip(template.contents, template.user_ids)
            )
            if i >= start
        ],
    )


def _set_archived(db: Session, *, template_id: int, is_archived: bool) -> None:
    crud_prompt_template.update(
        db=db, id=template_id, update_dto=PromptTemplateUpdate(is_archived=is_archived)
    )


def _dump(content: PromptTemplateContent) -> dict:
    """The content of a version, to compare it with another version."""
    return content.model_dump(mode="json", include=_CONTENT_FIELDS)


def _default_contents() -> dict[str, PromptTemplateContent]:
    """The content of every default template by its name."""
    return {
        default_prompt_name(output_format, language): (
            PromptTemplateService().read_default_prompt(
                output_format=output_format, language=language
            )
        )
        for output_format in OUTPUT_FORMAT_SPECS
        for language in PromptLanguage
    }


def _is_untouched_default(
    template: PromptTemplateORM, *, default_contents: dict[str, PromptTemplateContent]
) -> bool:
    """Whether a template is a default template as `create_project` created it."""
    default = default_contents.get(template.name)
    if default is None or len(template.versions) != 1:
        return False
    version = PromptTemplateVersionRead.model_validate(template.versions[0])
    return version.user_id == SYSTEM_USER_ID and _dump(version) == _dump(default)


class _Remapper:
    """Resolves the references of the exported versions in the target project,
    with one query per object type, and collects the ones that cannot be
    resolved."""

    def __init__(
        self,
        *,
        code_id: dict[str, int],
        tag_id: dict[str, int],
        metadata_id: dict[tuple[str, str], int],
        sdoc_id: dict[str, int],
        span_id: dict[str, int],
        sentence_id: dict[str, int],
        user_id: dict[str, int],
    ) -> None:
        self._code_id = code_id
        self._tag_id = tag_id
        self._metadata_id = metadata_id
        self._sdoc_id = sdoc_id
        self._span_id = span_id
        self._sentence_id = sentence_id
        self._user_id = user_id
        self.dropped: set[str] = set()

    @classmethod
    def read(
        cls, db: Session, *, project_id: int, rows: list[PromptTemplateExportSchema]
    ) -> "_Remapper":
        selections = [
            PromptSelectionsForExport.model_validate_json(row.selections)
            for row in rows
        ]
        examples = [example for s in selections for example in s.examples]
        code_names = [code.code_name for s in selections for code in s.codes]
        for example in examples:
            if isinstance(example, SpanPromptExampleForExport):
                code_names.extend(span.code_name for span in example.spans)
            else:
                code_names.append(example.code_name)
        tag_names = [tag.tag_name for s in selections for tag in s.tags]
        filenames = list(
            dict.fromkeys(
                example.sdoc_filename
                for example in examples
                if example.sdoc_filename is not None
            )
        )
        span_uuids = [
            uuid
            for example in examples
            if isinstance(example, SpanPromptExampleForExport)
            for uuid in example.source_annotation_uuids
        ]
        sentence_uuids = [
            uuid
            for example in examples
            if not isinstance(example, SpanPromptExampleForExport)
            for uuid in example.source_annotation_uuids
        ]
        emails = [row.user_email for row in rows if row.user_email is not None]

        sdoc_id: dict[str, int] = {}
        for filename in filenames:
            sdoc = crud_sdoc.read_by_filename(
                db=db, project_id=project_id, filename=filename, only_finished=False
            )
            if sdoc is not None:
                sdoc_id[filename] = sdoc.id

        return cls(
            code_id={
                code.name: code.id
                for code in crud_code.read_by_names(
                    db=db, project_id=project_id, names=_unique(code_names)
                )
            },
            tag_id={
                tag.name: tag.id
                for tag in crud_tag.read_by_names(
                    db=db, project_id=project_id, names=_unique(tag_names)
                )
            },
            metadata_id={
                (field.key, field.doctype): field.id
                for field in crud_project_meta.read_by_project(
                    db=db, project_id=project_id
                )
            },
            sdoc_id=sdoc_id,
            span_id={
                span.uuid: span.id
                for span in crud_span_anno.read_by_project_and_uuids(
                    db=db, project_id=project_id, uuids=_unique(span_uuids)
                )
            },
            sentence_id={
                sentence.uuid: sentence.id
                for sentence in crud_sentence_anno.read_by_project_and_uuids(
                    db=db, project_id=project_id, uuids=_unique(sentence_uuids)
                )
            },
            user_id={
                user.email: user.id
                for user in crud_user.read_by_emails(db=db, emails=_unique(emails))
            },
        )

    def user_id(self, email: str | None) -> int | None:
        if email is None:
            return None
        user_id = self._user_id.get(email)
        if user_id is None:
            self.dropped.add(f"author {email}")
        return user_id

    def content(self, row: PromptTemplateExportSchema) -> PromptTemplateContent:
        """The content of an exported version with its selections remapped."""
        selections = PromptSelectionsForExport.model_validate_json(row.selections)
        codes: list[PromptCode] = []
        for code in selections.codes:
            code_id = self._resolve(self._code_id, code.code_name, "code")
            if code_id is not None:
                codes.append(
                    PromptCode(
                        code_id=code_id, name=code.name, description=code.description
                    )
                )
        tags: list[PromptTag] = []
        for tag in selections.tags:
            tag_id = self._resolve(self._tag_id, tag.tag_name, "tag")
            if tag_id is not None:
                tags.append(
                    PromptTag(tag_id=tag_id, name=tag.name, description=tag.description)
                )
        metadata_fields: list[PromptMetadataField] = []
        for field in selections.metadata_fields:
            reference = (
                (field.metadata_key, field.metadata_doctype)
                if field.metadata_key is not None and field.metadata_doctype is not None
                else None
            )
            metadata_id = self._resolve(self._metadata_id, reference, "metadata field")
            if metadata_id is not None:
                metadata_fields.append(
                    PromptMetadataField.model_validate(
                        {
                            "project_metadata_id": metadata_id,
                            "key": field.key,
                            "description": field.description,
                            "metatype": field.metatype,
                        }
                    )
                )
        examples = [
            remapped
            for example in selections.examples
            if (remapped := self._example(example)) is not None
        ]
        return PromptTemplateContent(
            prompt=row.prompt,
            settings=PromptSettings.model_validate_json(row.settings),
            codes=codes,
            examples=examples,
            tags=tags,
            metadata_fields=metadata_fields,
        )

    def _example(self, example: PromptExampleForExport) -> PromptExample | None:
        """Remap an example. An example without its document (or, for a sentence
        example, its code) is dropped; spans whose code is missing are dropped from
        a span example."""
        sdoc_id = self._resolve(self._sdoc_id, example.sdoc_filename, "document")
        if sdoc_id is None:
            return None
        if isinstance(example, SpanPromptExampleForExport):
            spans: list[PromptExampleSpan] = []
            for span in example.spans:
                code_id = self._resolve(self._code_id, span.code_name, "code")
                if code_id is not None:
                    spans.append(
                        PromptExampleSpan(
                            code_id=code_id, begin=span.begin, end=span.end
                        )
                    )
            return SpanPromptExample(
                kind=example.kind,
                sdoc_id=sdoc_id,
                source_annotation_ids=self._resolve_all(
                    self._span_id, example.source_annotation_uuids, "span annotation"
                ),
                text=example.text,
                spans=spans,
            )
        code_id = self._resolve(self._code_id, example.code_name, "code")
        if code_id is None:
            return None
        return SentencePromptExample(
            kind=example.kind,
            sdoc_id=sdoc_id,
            source_annotation_ids=self._resolve_all(
                self._sentence_id,
                example.source_annotation_uuids,
                "sentence annotation",
            ),
            text=example.text,
            code_id=code_id,
        )

    def _resolve(
        self, ids: dict[_Reference, int], reference: _Reference | None, kind: str
    ) -> int | None:
        if reference is None:
            self.dropped.add(f"deleted {kind}")
            return None
        id = ids.get(reference)
        if id is None:
            self.dropped.add(f"{kind} {reference}")
        return id

    def _resolve_all(
        self, ids: dict[str, int], references: list[str], kind: str
    ) -> list[int]:
        return [
            id
            for reference in references
            if (id := self._resolve(ids, reference, kind)) is not None
        ]

    def log_dropped(self, *, project_id: int) -> None:
        if self.dropped:
            logger.warning(
                "Dropped references of imported prompt templates that do not exist "
                f"in project {project_id}: {', '.join(sorted(self.dropped))}"
            )


def _unique(values: Sequence[str | None]) -> list[str]:
    return list(dict.fromkeys(value for value in values if value is not None))
