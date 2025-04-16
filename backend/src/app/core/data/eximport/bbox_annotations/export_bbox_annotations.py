from pathlib import Path
from typing import List

import pandas as pd
from app.core.data.crud.bbox_annotation import crud_bbox_anno
from app.core.data.eximport.bbox_annotations.bbox_annotations_export_schema import (
    BBoxAnnotationExportCollection,
    BBoxAnnotationExportSchema,
)
from app.core.data.eximport.no_data_export_error import NoDataToExportError
from app.core.data.orm.bbox_annotation import BBoxAnnotationORM
from app.core.data.repo.repo_service import RepoService
from loguru import logger
from sqlalchemy.orm import Session


def export_selected_bbox_annotations(
    db: Session,
    repo: RepoService,
    project_id: int,
    bbox_annotation_ids: List[int],
) -> Path:
    bbox_annotations = crud_bbox_anno.read_by_ids(db=db, ids=bbox_annotation_ids)
    return __export_bbox_annotations(
        db=db,
        repo=repo,
        fn=f"project_{project_id}_selected_bbox_annotations_export",
        bbox_annotations=bbox_annotations,
    )


def export_all_bbox_annotations(
    db: Session,
    repo: RepoService,
    project_id: int,
) -> Path:
    bbox_annotations = crud_bbox_anno.read_by_project(db=db, project_id=project_id)
    return __export_bbox_annotations(
        db=db,
        repo=repo,
        fn=f"project_{project_id}_all_bbox_annotations_export",
        bbox_annotations=bbox_annotations,
    )


def __export_bbox_annotations(
    db: Session,
    repo: RepoService,
    fn: str,
    bbox_annotations: List[BBoxAnnotationORM],
) -> Path:
    if len(bbox_annotations) == 0:
        raise NoDataToExportError("No bbox annotations to export.")

    export_data = __generate_export_df_for_bbox_annotations(
        bbox_annotations=bbox_annotations
    )
    return repo.write_df_to_temp_file(
        df=export_data,
        fn=fn,
    )


def __generate_export_df_for_bbox_annotations(
    bbox_annotations: List[BBoxAnnotationORM],
) -> pd.DataFrame:
    logger.info(f"Exporting {len(bbox_annotations)} BBox Annotations ...")

    annotation_export_items = []
    for bbox in bbox_annotations:
        sdoc = bbox.annotation_document.source_document
        user = bbox.annotation_document.user

        annotation_export_items.append(
            BBoxAnnotationExportSchema(
                uuid=bbox.uuid,
                sdoc_name=sdoc.filename,
                user_email=user.email,
                user_first_name=user.first_name,
                user_last_name=user.last_name,
                code_name=bbox.code.name,
                bbox_x_min=bbox.x_min,
                bbox_x_max=bbox.x_max,
                bbox_y_min=bbox.y_min,
                bbox_y_max=bbox.y_max,
            )
        )

    collection = BBoxAnnotationExportCollection(annotations=annotation_export_items)
    return collection.to_dataframe()
