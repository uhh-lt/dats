from pathlib import Path
from typing import List

import pandas as pd
from app.core.data.crud.span_annotation import crud_span_anno
from app.core.data.eximport.no_data_export_error import NoDataToExportError
from app.core.data.eximport.span_annotations.span_annotations_export_schema import (
    SpanAnnotationExportCollection,
    SpanAnnotationExportSchema,
)
from app.core.data.orm.span_annotation import SpanAnnotationORM
from app.core.data.repo.repo_service import RepoService
from loguru import logger
from sqlalchemy.orm import Session


def export_selected_span_annotations(
    db: Session,
    repo: RepoService,
    project_id: int,
    span_annotation_ids: List[int],
) -> Path:
    span_annotations = crud_span_anno.read_by_ids(db=db, ids=span_annotation_ids)
    return __export_span_annotations(
        db=db,
        repo=repo,
        fn=f"project_{project_id}_selected_span_annotations_export",
        span_annotations=span_annotations,
    )


def export_all_span_annotations(
    db: Session,
    repo: RepoService,
    project_id: int,
) -> Path:
    span_annotations = crud_span_anno.read_by_project(db=db, project_id=project_id)
    return __export_span_annotations(
        db=db,
        repo=repo,
        fn=f"project_{project_id}_all_span_annotations_export",
        span_annotations=span_annotations,
    )


def __export_span_annotations(
    db: Session,
    repo: RepoService,
    fn: str,
    span_annotations: List[SpanAnnotationORM],
) -> Path:
    if len(span_annotations) == 0:
        raise NoDataToExportError("No span annotations to export.")

    export_data = __generate_export_df_for_span_annotations(
        span_annotations=span_annotations
    )
    return repo.write_df_to_temp_file(
        df=export_data,
        fn=fn,
    )


def __generate_export_df_for_span_annotations(
    span_annotations: List[SpanAnnotationORM],
) -> pd.DataFrame:
    logger.info(f"Exporting {len(span_annotations)} Span Annotations ...")

    annotation_export_items = []
    for span in span_annotations:
        sdoc = span.annotation_document.source_document
        user = span.annotation_document.user

        annotation_export_items.append(
            SpanAnnotationExportSchema(
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
