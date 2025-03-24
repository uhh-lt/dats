from pathlib import Path
from typing import List

import pandas as pd
from loguru import logger
from sqlalchemy.orm import Session

from app.core.data.crud.bbox_annotation import crud_bbox_anno
from app.core.data.export.no_data_export_error import NoDataToExportError
from app.core.data.orm.bbox_annotation import BBoxAnnotationORM
from app.core.data.repo.repo_service import RepoService


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

    # fill the DataFrame
    data = {
        "sdoc_name": [],
        "user_email": [],
        "user_first_name": [],
        "user_last_name": [],
        "code_name": [],
        "created": [],
        "bbox_x_min": [],
        "bbox_x_max": [],
        "bbox_y_min": [],
        "bbox_y_max": [],
    }

    for bbox in bbox_annotations:
        sdoc = bbox.annotation_document.source_document
        user = bbox.annotation_document.user
        data["sdoc_name"].append(sdoc.filename)
        data["user_email"].append(user.email)
        data["user_first_name"].append(user.first_name)
        data["user_last_name"].append(user.last_name)
        data["code_name"].append(bbox.code.name)
        data["created"].append(bbox.created)
        data["bbox_x_min"].append(bbox.x_min)
        data["bbox_x_max"].append(bbox.x_max)
        data["bbox_y_min"].append(bbox.y_min)
        data["bbox_y_max"].append(bbox.y_max)

    return pd.DataFrame(data=data)
