from pathlib import Path
from typing import List

import pandas as pd
from loguru import logger
from sqlalchemy.orm import Session

from app.core.data.crud.span_annotation import crud_span_anno
from app.core.data.eximport.no_data_export_error import NoDataToExportError
from app.core.data.orm.span_annotation import SpanAnnotationORM
from app.core.data.repo.repo_service import RepoService


def export_selected_span_annotations(
    db: Session,
    repo: RepoService,
    project_id: int,
    sentence_annotation_ids: List[int],
) -> Path:
    span_annotations = crud_span_anno.read_by_ids(db=db, ids=sentence_annotation_ids)
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

    # fill the DataFrame
    data = {
        "sdoc_name": [],
        "user_email": [],
        "user_first_name": [],
        "user_last_name": [],
        "code_name": [],
        "created": [],
        "text": [],
        "text_begin_char": [],
        "text_end_char": [],
    }

    for span in span_annotations:
        sdoc = span.annotation_document.source_document
        user = span.annotation_document.user
        data["sdoc_name"].append(sdoc.filename)
        data["user_email"].append(user.email)
        data["user_first_name"].append(user.first_name)
        data["user_last_name"].append(user.last_name)
        data["code_name"].append(span.code.name)
        data["created"].append(span.created)
        data["text"].append(span.text)
        data["text_begin_char"].append(span.begin)
        data["text_end_char"].append(span.end)

    return pd.DataFrame(data)
