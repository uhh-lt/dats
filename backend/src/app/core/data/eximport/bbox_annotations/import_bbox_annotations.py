from typing import Dict, List, Set

import pandas as pd
from loguru import logger
from sqlalchemy.orm import Session

from app.core.data.crud.bbox_annotation import crud_bbox_anno
from app.core.data.crud.project import crud_project
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.dto.bbox_annotation import BBoxAnnotationCreate
from app.core.data.eximport.bbox_annotations.bbox_annotations_export_schema import (
    BBoxAnnotationExportCollection,
    BBoxAnnotationExportSchema,
)
from app.core.data.orm.source_document import SourceDocumentORM

"""
please have a look at the code export import functionality:
- export_codes.py
- import_codes.py
- codes_export_schema.py

I want you to create a as similar as possible implementation for bbox annotations. Right now, I only have the export functionality in export_bbox_annotations.py.

So your task is
- create bbox_annotations_export_schema.py
- modify export_bbox_annotations.py accordingly.

Then we are at the hard part: Importing bbox annotations.
As you will see in the import_codes.py file, we use a class based approach. Please try to adapt this approach for bbox annotations.

The most important function in that import file is going to be import_bbox_annotations_to_proj, which will be the main entrypoint that i want to use later.
"""


class ImportBBoxAnnotationsError(Exception):
    def __init__(self, errors: List[str]) -> None:
        super().__init__(f"Errors occurred while importing bbox annotations: {errors}")


def import_bbox_annotations_to_proj(
    db: Session,
    df: pd.DataFrame,
    project_id: int,
) -> List[int]:
    """
    Import bbox annotations from a DataFrame into a project.
    Validates input data and ensures all required references (document, user, code) exist.

    Args:
        db: Database session
        df: DataFrame with bbox annotation data
        project_id: ID of the project to import annotations into

    Returns:
        List of imported annotation IDs

    Raises:
        ImportBBoxAnnotationsError: If validation fails or any required references are missing
    """
    # Validate input data using our schema
    try:
        annotation_collection = BBoxAnnotationExportCollection.from_dataframe(df)
    except ValueError as e:
        logger.error(f"Failed to load bbox annotation import data: {e}")
        raise ImportBBoxAnnotationsError(
            errors=["Invalid data format for bbox annotations."]
        )

    logger.info(
        f"Importing {len(annotation_collection.annotations)} bbox annotations..."
    )

    # BBoxAnnotations need a User, a SourceDocument and a Code. We need to check if
    # all of them exist in the database:
    user_emails: Set[str] = set()
    sdoc_names: Set[str] = set()
    code_names: Set[str] = set()
    user_email2annos: Dict[str, List[BBoxAnnotationExportSchema]] = {}
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
            "The following errors occurred while importing bbox annotations:\n"
            + "\n".join(error_messages)
        )
        raise ImportBBoxAnnotationsError(errors=error_messages)

    # Everything is fine, we can bulk create the annotations, per user
    imported_anno_ids: List[int] = []
    for user, annotations in user_email2annos.items():
        created_annos = crud_bbox_anno.create_bulk(
            db=db,
            user_id=project_user_emails[user].id,
            create_dtos=[
                BBoxAnnotationCreate(
                    x_min=annotation.bbox_x_min,
                    y_min=annotation.bbox_y_min,
                    x_max=annotation.bbox_x_max,
                    y_max=annotation.bbox_y_max,
                    code_id=project_code_names[annotation.code_name].id,
                    sdoc_id=project_sdoc_names[annotation.sdoc_name].id,
                )
                for annotation in annotations
            ],
        )
        imported_anno_ids.extend([anno.id for anno in created_annos])

    logger.info(
        f"Successfully imported {len(imported_anno_ids)} bbox annotations into project {project_id}"
    )
    return imported_anno_ids
