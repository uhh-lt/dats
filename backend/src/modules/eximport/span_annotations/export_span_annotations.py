from pathlib import Path

import pandas as pd
from loguru import logger
from sqlalchemy.orm import Session

from core.annotation.span_annotation_crud import crud_span_anno
from core.annotation.span_annotation_orm import SpanAnnotationORM
from modules.eximport.export_exceptions import NoDataToExportError
from modules.eximport.span_annotations.span_annotations_export_schema import (
    SpanAnnotationExportCollection,
    SpanAnnotationExportSchema,
)
from repos.filesystem_repo import FilesystemRepo


def export_selected_span_annotations(
    db: Session,
    fsr: FilesystemRepo,
    project_id: int,
    span_annotation_ids: list[int],
) -> Path:
    span_annotations = crud_span_anno.read_by_ids(db=db, ids=span_annotation_ids)
    return __export_span_annotations(
        db=db,
        fsr=fsr,
        fn=f"project_{project_id}_selected_span_annotations",
        span_annotations=span_annotations,
    )


def export_all_span_annotations(
    db: Session,
    fsr: FilesystemRepo,
    project_id: int,
) -> Path:
    span_annotations = crud_span_anno.read_by_project(db=db, project_id=project_id)
    return __export_span_annotations(
        db=db,
        fsr=fsr,
        fn=f"project_{project_id}_all_span_annotations",
        span_annotations=span_annotations,
    )


def __export_span_annotations(
    db: Session,
    fsr: FilesystemRepo,
    fn: str,
    span_annotations: list[SpanAnnotationORM],
) -> Path:
    if len(span_annotations) == 0:
        raise NoDataToExportError("No span annotations to export.")

    export_data = __generate_export_df_for_span_annotations(
        span_annotations=span_annotations
    )
    return fsr.write_df_to_temp_file(
        df=export_data,
        fn=fn,
    )


def __generate_export_df_for_span_annotations(
    span_annotations: list[SpanAnnotationORM],
) -> pd.DataFrame:
    logger.info(f"Exporting {len(span_annotations)} Span Annotations ...")

    annotation_export_items = []
    for span in span_annotations:
        sdoc = span.annotation_document.source_document
        user = span.annotation_document.user

        annotation_export_items.append(
            SpanAnnotationExportSchema(
                uuid=span.uuid,
                sdoc_name=sdoc.filename,
                user_email=user.email,
                user_first_name=user.first_name,
                user_last_name=user.last_name,
                code_name=span.code.name,
                text=span.text,
                text_begin_char=span.begin,
                text_end_char=span.end,
                text_begin_token=span.begin_token,
                text_end_token=span.end_token,
            )
        )

    collection = SpanAnnotationExportCollection(annotations=annotation_export_items)
    return collection.to_dataframe()
