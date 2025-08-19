import pandas as pd
from loguru import logger
from sqlalchemy.orm import Session

from core.annotation.annotation_document_crud import crud_adoc
from core.annotation.sentence_annotation_crud import crud_sentence_anno
from core.annotation.sentence_annotation_dto import SentenceAnnotationCreateIntern
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_orm import SourceDocumentORM
from core.project.project_crud import crud_project
from modules.eximport.sent_annotations.sentence_annotations_export_schema import (
    SentenceAnnotationExportCollection,
    SentenceAnnotationExportSchema,
)


class ImportSentenceAnnotationsError(Exception):
    def __init__(self, errors: list[str]) -> None:
        super().__init__(
            f"Errors occurred while importing sentence annotations: {errors}"
        )


def import_sentence_annotations_to_proj(
    db: Session,
    df: pd.DataFrame,
    project_id: int,
) -> list[int]:
    """
    Import sentence annotations from a DataFrame into a project.
    Validates input data and ensures all required references (document, user, code) exist.

    Args:
        db: Database session
        df: DataFrame with sentence annotation data
        project_id: ID of the project to import annotations into

    Returns:
        List of imported annotation IDs

    Raises:
        ImportSentenceAnnotationsError: If validation fails or any required references are missing
    """
    # Validate input data using our schema
    try:
        annotation_collection = SentenceAnnotationExportCollection.from_dataframe(df)
    except ValueError as e:
        logger.error(f"Failed to load sentence annotation import data: {e}")
        raise ImportSentenceAnnotationsError(
            errors=["Invalid data format for sentence annotations."]
        )

    logger.info(
        f"Importing {len(annotation_collection.annotations)} sentence annotations..."
    )

    # SentenceAnnotations need a User, a SourceDocument and a Code. We need to check if
    # all of them exist in the database:
    user_emails: set[str] = set()
    sdoc_names: set[str] = set()
    code_names: set[str] = set()
    user_email2annos: dict[str, list[SentenceAnnotationExportSchema]] = {}
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
    project_sdoc_names: dict[str, SourceDocumentORM] = {}
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

    # 4. Check if the sentence annnotation already exists
    for annotation in annotation_collection.annotations:
        existing_annotation = crud_sentence_anno.read_by_project_and_uuid(
            db=db, project_id=project_id, uuid=annotation.uuid
        )
        if existing_annotation is not None:
            error_messages.append(
                f"Sentence annotation with UUID '{annotation.uuid}' already exists in project {project_id}"
            )

    # Raise an error if any of the checks failed
    if len(error_messages) > 0:
        logger.error(
            "The following errors occurred while importing sentence annotations:\n"
            + "\n".join(error_messages)
        )
        raise ImportSentenceAnnotationsError(errors=error_messages)

    # Everything is fine, prepare the creation (finding / creating annotation documents)
    create_dtos: list[SentenceAnnotationCreateIntern] = []
    for user_email, annotations in user_email2annos.items():
        user = project_user_emails[user_email]

        # find affected sdocs
        sdoc_ids = {
            project_sdoc_names[annotation.sdoc_name].id for annotation in annotations
        }

        # find or create annotation documents
        adoc_id_by_sdoc_id: dict[int, int] = {}
        for sdoc_id in sdoc_ids:
            adoc_id_by_sdoc_id[sdoc_id] = crud_adoc.exists_or_create(
                db=db, user_id=user.id, sdoc_id=sdoc_id
            ).id

        create_dtos.extend(
            [
                SentenceAnnotationCreateIntern(
                    uuid=annotation.uuid,
                    project_id=project_id,
                    annotation_document_id=adoc_id_by_sdoc_id[
                        project_sdoc_names[annotation.sdoc_name].id
                    ],
                    code_id=project_code_names[annotation.code_name].id,
                    sentence_id_start=annotation.text_begin_sent,
                    sentence_id_end=annotation.text_end_sent,
                )
                for annotation in annotations
            ]
        )

    # we can bulk create the annotations
    created_annos = crud_sentence_anno.create_multi(
        db=db,
        create_dtos=create_dtos,
    )
    imported_anno_ids = [anno.id for anno in created_annos]

    logger.info(
        f"Successfully imported {len(imported_anno_ids)} sentence annotations into project {project_id}"
    )
    return imported_anno_ids
