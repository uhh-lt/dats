from typing import Dict, List, Set

import pandas as pd
from loguru import logger
from sqlalchemy.orm import Session

from app.core.data.crud.project import crud_project
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.crud.span_annotation import crud_span_anno
from app.core.data.dto.span_annotation import SpanAnnotationCreate
from app.core.data.eximport.span_annotations.span_annotations_export_schema import (
    SpanAnnotationExportCollection,
    SpanAnnotationExportSchema,
)
from app.core.data.orm.source_document import SourceDocumentORM


class ImportSpanAnnotationsError(Exception):
    def __init__(self, errors: List[str]) -> None:
        super().__init__(f"Errors occurred while importing span annotations: {errors}")


def import_span_annotations_to_proj(
    db: Session,
    df: pd.DataFrame,
    project_id: int,
) -> List[int]:
    """
    Import span annotations from a DataFrame into a project.
    Validates input data and ensures all required references (document, user, code) exist.

    Args:
        db: Database session
        df: DataFrame with span annotation data
        project_id: ID of the project to import annotations into

    Returns:
        List of imported annotation IDs

    Raises:
        ImportSpanAnnotationsError: If validation fails or any required references are missing
    """
    # Validate input data using our schema
    try:
        annotation_collection = SpanAnnotationExportCollection.from_dataframe(df)
    except ValueError as e:
        logger.error(f"Failed to load span annotation import data: {e}")
        raise ImportSpanAnnotationsError(
            errors=["Invalid data format for span annotations."]
        )

    logger.info(
        f"Importing {len(annotation_collection.annotations)} span annotations..."
    )

    # SpanAnnotations need a User, a SourceDocument and a Code. We need to check if
    # all of them exist in the database:
    user_emails: Set[str] = set()
    sdoc_names: Set[str] = set()
    code_names: Set[str] = set()
    user_email2annos: Dict[str, List[SpanAnnotationExportSchema]] = {}
    for annotation in annotation_collection.annotations:
        user_emails.add(annotation.user_email)
        sdoc_names.add(annotation.sdoc_name)
        code_names.add(annotation.code_name)
        user_email2annos.setdefault(annotation.user_email, []).append(annotation)

    # 0. Get the project
    error_messages = []
    project = crud_project.read(db=db, id=project_id)

    # 1. Check if the Users exists
    project_user_emails = {user.email: user for user in project.users}
    for email in user_emails:
        if email not in project_user_emails:
            error_messages.append(
                f"User '{email}' is not part of the project {project_id}"
            )

    # 2. Check if the SourceDocuments exists
    project_sdoc_names: Dict[str, SourceDocumentORM] = {}
    for sdoc_name in sdoc_names:
        sdoc = crud_sdoc.read_by_filename(db=db, proj_id=project_id, filename=sdoc_name)
        if sdoc is None:
            error_messages.append(
                f"Source document '{sdoc_name}' not found in project {project_id}"
            )
        else:
            project_sdoc_names[sdoc_name] = sdoc

    # 3. Check if the Codes exists
    project_code_names = {code.name: code for code in project.codes}
    for code_name in code_names:
        if code_name not in project_code_names:
            error_messages.append(
                f"Code '{code_name}' is not part of the project {project_id}"
            )

    # Raise an error if any of the checks failed
    if len(error_messages) > 0:
        logger.error(
            "The following errors occurred while importing span annotations:\n"
            + "\n".join(error_messages)
        )
        raise ImportSpanAnnotationsError(errors=error_messages)

    # Everything is fine, we can bulk create the annotations, per user
    imported_anno_ids: List[int] = []
    for user, annotations in user_email2annos.items():
        created_annos = crud_span_anno.create_bulk(
            db=db,
            user_id=project_user_emails[user].id,
            create_dtos=[
                SpanAnnotationCreate(
                    begin=annotation.text_begin_char,
                    end=annotation.text_end_char,
                    span_text=annotation.text,
                    begin_token=annotation.text_begin_token,
                    end_token=annotation.text_end_token,
                    code_id=project_code_names[annotation.code_name].id,
                    sdoc_id=project_sdoc_names[annotation.sdoc_name].id,
                )
                for annotation in annotations
            ],
        )
        imported_anno_ids.extend([anno.id for anno in created_annos])

    logger.info(
        f"Successfully imported {len(imported_anno_ids)} span annotations into project {project_id}"
    )
    return imported_anno_ids
