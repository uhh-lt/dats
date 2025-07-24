from typing import Dict, List, Set

import pandas as pd
from core.annotation.annotation_document_crud import crud_adoc
from core.annotation.bbox_annotation_crud import crud_bbox_anno
from core.annotation.bbox_annotation_dto import BBoxAnnotationCreateIntern
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_orm import SourceDocumentORM
from core.project.project_crud import crud_project
from loguru import logger
from modules.eximport.bbox_annotations.bbox_annotations_export_schema import (
    BBoxAnnotationExportCollection,
    BBoxAnnotationExportSchema,
)
from sqlalchemy.orm import Session


class ImportBBoxAnnotationsError(Exception):
    def __init__(self, errors: List[str]) -> None:
        super().__init__(f"Errors occurred while importing bbox annotations: {errors}")


def import_bbox_annotations_to_proj(
    db: Session,
    df: pd.DataFrame,
    project_id: int,
    validate_only: bool = False,
) -> List[int]:
    """
    Import bbox annotations from a DataFrame into a project.
    Validates input data and ensures all required references (document, user, code) exist.

    Args:
        db: Database session
        df: DataFrame with bbox annotation data
        project_id: ID of the project to import annotations into
        validate_only: If True, only validate the data without importing

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
        sdoc = crud_sdoc.read_by_filename(
            db=db, proj_id=project_id, filename=sdoc_name, only_finished=False
        )
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

    # 4. Check if the bbox annnotation already exists
    for annotation in annotation_collection.annotations:
        existing_annotation = crud_bbox_anno.read_by_project_and_uuid(
            db=db, project_id=project_id, uuid=annotation.uuid
        )
        if existing_annotation is not None:
            error_messages.append(
                f"BBox annotation with UUID '{annotation.uuid}' already exists in project {project_id}"
            )

    # Raise an error if any of the checks failed
    if len(error_messages) > 0:
        logger.error(
            "The following errors occurred while importing bbox annotations:\n"
            + "\n".join(error_messages)
        )
        raise ImportBBoxAnnotationsError(errors=error_messages)

    # If validate_only is True, we stop here
    if validate_only:
        logger.info("Validation successful. No bbox annotations were imported.")
        return []

    # Everything is fine, prepare the creation (finding / creating annotation documents)
    create_dtos: List[BBoxAnnotationCreateIntern] = []
    for user_email, annotations in user_email2annos.items():
        user = project_user_emails[user_email]

        # find affected sdocs
        sdoc_ids = {
            project_sdoc_names[annotation.sdoc_name].id for annotation in annotations
        }

        # find or create annotation documents
        adoc_id_by_sdoc_id: Dict[int, int] = {}
        for sdoc_id in sdoc_ids:
            adoc_id_by_sdoc_id[sdoc_id] = crud_adoc.exists_or_create(
                db=db, user_id=user.id, sdoc_id=sdoc_id
            ).id

        create_dtos.extend(
            BBoxAnnotationCreateIntern(
                uuid=annotation.uuid,
                project_id=project_id,
                annotation_document_id=adoc_id_by_sdoc_id[
                    project_sdoc_names[annotation.sdoc_name].id
                ],
                code_id=project_code_names[annotation.code_name].id,
                x_min=annotation.bbox_x_min,
                y_min=annotation.bbox_y_min,
                x_max=annotation.bbox_x_max,
                y_max=annotation.bbox_y_max,
            )
            for annotation in annotations
        )

    # we can bulk create the annotations
    created_annos = crud_bbox_anno.create_multi(
        db=db,
        create_dtos=create_dtos,
    )
    imported_anno_ids = [anno.id for anno in created_annos]

    logger.info(
        f"Successfully imported {len(imported_anno_ids)} bbox annotations into project {project_id}"
    )
    return imported_anno_ids
