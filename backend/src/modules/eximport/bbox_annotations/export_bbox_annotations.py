from pathlib import Path

import pandas as pd
from loguru import logger
from sqlalchemy.orm import Session

from core.annotation.bbox_annotation_crud import crud_bbox_anno
from core.annotation.bbox_annotation_orm import BBoxAnnotationORM
from core.user.user_utils import get_user_key
from modules.eximport.annotation_provenance_utils import (
    export_annotation_provenance,
)
from modules.eximport.bbox_annotations.bbox_annotations_export_schema import (
    BBoxAnnotationExportCollection,
    BBoxAnnotationExportSchema,
)
from modules.eximport.export_exceptions import NoDataToExportError
from repos.filesystem_repo import FilesystemRepo


def export_selected_bbox_annotations(
    db: Session,
    fsr: FilesystemRepo,
    project_id: int,
    bbox_annotation_ids: list[int],
) -> Path:
    bbox_annotations = crud_bbox_anno.read_by_ids(db=db, ids=bbox_annotation_ids)
    return __export_bbox_annotations(
        db=db,
        fsr=fsr,
        fn=f"project_{project_id}_selected_bbox_annotations",
        bbox_annotations=bbox_annotations,
    )


def export_all_bbox_annotations(
    db: Session,
    fsr: FilesystemRepo,
    project_id: int,
) -> Path:
    bbox_annotations = crud_bbox_anno.read_by_project(db=db, project_id=project_id)
    return __export_bbox_annotations(
        db=db,
        fsr=fsr,
        fn=f"project_{project_id}_all_bbox_annotations",
        bbox_annotations=bbox_annotations,
    )


def __export_bbox_annotations(
    db: Session,
    fsr: FilesystemRepo,
    fn: str,
    bbox_annotations: list[BBoxAnnotationORM],
) -> Path:
    if len(bbox_annotations) == 0:
        raise NoDataToExportError("No bbox annotations to export.")

    export_data = __generate_export_df_for_bbox_annotations(
        db=db, bbox_annotations=bbox_annotations
    )
    return fsr.write_df_to_temp_file(
        df=export_data,
        fn=fn,
    )


def __generate_export_df_for_bbox_annotations(
    db: Session,
    bbox_annotations: list[BBoxAnnotationORM],
) -> pd.DataFrame:
    logger.info(f"Exporting {len(bbox_annotations)} BBox Annotations ...")

    annotation_export_items = []
    provenances = export_annotation_provenance(
        db=db, crud=crud_bbox_anno, annotations=bbox_annotations
    )
    for bbox, provenance in zip(bbox_annotations, provenances):
        sdoc = bbox.annotation_document.source_document
        user = bbox.annotation_document.user

        annotation_export_items.append(
            BBoxAnnotationExportSchema(
                **provenance.model_dump(),
                uuid=bbox.uuid,
                sdoc_name=sdoc.filename,
                user_email=get_user_key(user),
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
