from pathlib import Path

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
    PromptExample,
    PromptMetadataField,
    PromptTemplateVersionRead,
    SpanPromptExample,
)
from core.prompt_template.prompt_template_orm import PromptTemplateORM
from core.tag.tag_crud import crud_tag
from core.user.user_crud import crud_user
from core.user.user_utils import get_user_key
from modules.eximport.export_exceptions import NoDataToExportError
from modules.eximport.prompt_templates.prompt_template_export_schema import (
    PromptCodeForExport,
    PromptExampleForExport,
    PromptExampleSpanForExport,
    PromptMetadataFieldForExport,
    PromptSelectionsForExport,
    PromptTagForExport,
    PromptTemplateExportCollection,
    PromptTemplateExportSchema,
    SentencePromptExampleForExport,
    SpanPromptExampleForExport,
)
from repos.filesystem_repo import FilesystemRepo


def export_all_prompt_templates(
    db: Session,
    fsr: FilesystemRepo,
    project_id: int,
) -> Path:
    """
    Export all prompt templates of a project with all their versions to a CSV file.

    Args:
        db: Database session
        fsr: Filesystem repository service for file operations
        project_id: ID of the project

    Returns:
        Path to the exported file

    Raises:
        NoDataToExportError: If the project has no prompt templates
    """
    templates = crud_prompt_template.read_by_project(db=db, project_id=project_id)
    if len(templates) == 0:
        raise NoDataToExportError("No prompt templates to export.")

    export_data = __generate_export_df_for_prompt_templates(db=db, templates=templates)
    return fsr.write_df_to_temp_file(
        df=export_data,
        fn=f"project_{project_id}_all_prompt_templates",
    )


def __generate_export_df_for_prompt_templates(
    db: Session, templates: list[PromptTemplateORM]
) -> pd.DataFrame:
    logger.info(f"Exporting {len(templates)} Prompt Templates ...")

    versions = [
        PromptTemplateVersionRead.model_validate(version)
        for template in templates
        for version in template.versions
    ]
    references = _References.read(db=db, versions=versions)

    export_items: list[PromptTemplateExportSchema] = []
    for template in templates:
        for version_orm in template.versions:
            version = PromptTemplateVersionRead.model_validate(version_orm)
            export_items.append(
                PromptTemplateExportSchema(
                    template_name=template.name,
                    task_type=template.task_type,
                    language=template.language,
                    is_archived=template.is_archived,
                    version=version.version,
                    prompt=version.prompt,
                    settings=version.settings.model_dump_json(),
                    selections=references.selections_for_export(
                        version
                    ).model_dump_json(),
                    user_email=references.user_email.get(version.user_id)
                    if version.user_id is not None
                    else None,
                )
            )

    return PromptTemplateExportCollection(versions=export_items).to_dataframe()


class _References:
    """The project-independent references (names, uuids, ...) of the objects the
    exported versions select, read with one query per object type."""

    def __init__(
        self,
        *,
        code_name: dict[int, str],
        tag_name: dict[int, str],
        metadata_key_and_doctype: dict[int, tuple[str, str]],
        sdoc_filename: dict[int, str],
        span_uuid: dict[int, str],
        sentence_uuid: dict[int, str],
        user_email: dict[int, str],
    ) -> None:
        self.code_name = code_name
        self.tag_name = tag_name
        self.metadata_key_and_doctype = metadata_key_and_doctype
        self.sdoc_filename = sdoc_filename
        self.span_uuid = span_uuid
        self.sentence_uuid = sentence_uuid
        self.user_email = user_email

    @classmethod
    def read(
        cls, db: Session, *, versions: list[PromptTemplateVersionRead]
    ) -> "_References":
        examples = [example for version in versions for example in version.examples]
        code_ids = [code.code_id for version in versions for code in version.codes]
        for example in examples:
            if isinstance(example, SpanPromptExample):
                code_ids.extend(span.code_id for span in example.spans)
            else:
                code_ids.append(example.code_id)
        span_ids = [
            annotation_id
            for example in examples
            if isinstance(example, SpanPromptExample)
            for annotation_id in example.source_annotation_ids
        ]
        sentence_ids = [
            annotation_id
            for example in examples
            if not isinstance(example, SpanPromptExample)
            for annotation_id in example.source_annotation_ids
        ]
        tag_ids = [tag.tag_id for version in versions for tag in version.tags]
        metadata_ids = [
            field.project_metadata_id
            for version in versions
            for field in version.metadata_fields
        ]
        sdoc_ids = [example.sdoc_id for example in examples]
        user_ids = [
            version.user_id for version in versions if version.user_id is not None
        ]

        return cls(
            code_name={
                id: code.name
                for id, code in crud_code.read_existing_by_ids(
                    db=db, ids=code_ids
                ).items()
            },
            tag_name={
                id: tag.name
                for id, tag in crud_tag.read_existing_by_ids(db=db, ids=tag_ids).items()
            },
            metadata_key_and_doctype={
                id: (field.key, field.doctype)
                for id, field in crud_project_meta.read_existing_by_ids(
                    db=db, ids=metadata_ids
                ).items()
            },
            sdoc_filename={
                id: sdoc.filename
                for id, sdoc in crud_sdoc.read_existing_by_ids(
                    db=db, ids=sdoc_ids
                ).items()
            },
            span_uuid={
                id: span.uuid
                for id, span in crud_span_anno.read_existing_by_ids(
                    db=db, ids=span_ids
                ).items()
            },
            sentence_uuid={
                id: sentence.uuid
                for id, sentence in crud_sentence_anno.read_existing_by_ids(
                    db=db, ids=sentence_ids
                ).items()
            },
            user_email={
                id: get_user_key(user)
                for id, user in crud_user.read_existing_by_ids(
                    db=db, ids=user_ids
                ).items()
            },
        )

    def selections_for_export(
        self, version: PromptTemplateVersionRead
    ) -> PromptSelectionsForExport:
        """Replace the ids of a version's selections with their references."""
        return PromptSelectionsForExport(
            codes=[
                PromptCodeForExport(
                    code_name=self.code_name.get(code.code_id),
                    name=code.name,
                    description=code.description,
                )
                for code in version.codes
            ],
            examples=[
                self._example_for_export(example) for example in version.examples
            ],
            tags=[
                PromptTagForExport(
                    tag_name=self.tag_name.get(tag.tag_id),
                    name=tag.name,
                    description=tag.description,
                )
                for tag in version.tags
            ],
            metadata_fields=[
                self._metadata_field_for_export(field)
                for field in version.metadata_fields
            ],
        )

    def _metadata_field_for_export(
        self, field: PromptMetadataField
    ) -> PromptMetadataFieldForExport:
        key, doctype = self.metadata_key_and_doctype.get(
            field.project_metadata_id, (None, None)
        )
        return PromptMetadataFieldForExport(
            metadata_key=key,
            metadata_doctype=doctype,
            key=field.key,
            description=field.description,
            metatype=field.metatype,
        )

    def _example_for_export(self, example: PromptExample) -> PromptExampleForExport:
        if isinstance(example, SpanPromptExample):
            return SpanPromptExampleForExport(
                kind=example.kind,
                sdoc_filename=self.sdoc_filename.get(example.sdoc_id),
                source_annotation_uuids=[
                    self.span_uuid[id]
                    for id in example.source_annotation_ids
                    if id in self.span_uuid
                ],
                text=example.text,
                spans=[
                    PromptExampleSpanForExport(
                        code_name=self.code_name.get(span.code_id),
                        begin=span.begin,
                        end=span.end,
                    )
                    for span in example.spans
                ],
            )
        return SentencePromptExampleForExport(
            kind=example.kind,
            sdoc_filename=self.sdoc_filename.get(example.sdoc_id),
            source_annotation_uuids=[
                self.sentence_uuid[id]
                for id in example.source_annotation_ids
                if id in self.sentence_uuid
            ],
            text=example.text,
            code_name=self.code_name.get(example.code_id),
        )
