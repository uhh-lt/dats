import re
import zipfile
from enum import Enum
from os import listdir
from os.path import isfile
from pathlib import Path
from typing import (
    Dict,
)

import pandas as pd
from app.core.data.eximport.bbox_annotations.import_bbox_annotations import (
    import_bbox_annotations_to_proj,
)
from app.core.data.eximport.codes.import_codes import import_codes_to_proj
from app.core.data.eximport.cota.import_cota import import_cota_to_proj
from app.core.data.eximport.memos.import_memos import import_memos_to_proj
from app.core.data.eximport.project_metadata.import_project_metadata import (
    import_project_metadata_to_proj,
)
from app.core.data.eximport.sdocs.import_sdocs import import_sdocs_to_proj
from app.core.data.eximport.sent_annotations.import_sentence_annotations import (
    import_sentence_annotations_to_proj,
)
from app.core.data.eximport.span_annotations.import_span_annotations import (
    import_span_annotations_to_proj,
)
from app.core.data.eximport.tags.import_tags import import_tags_to_proj
from app.core.data.eximport.timeline_analysis.import_timeline_analysis import (
    import_timeline_analysis_to_proj,
)
from app.core.data.eximport.user.import_users import import_users_to_proj
from app.core.data.eximport.whiteboards.import_whiteboards import (
    import_whiteboards_to_proj,
)
from app.core.data.repo.repo_service import (
    RepoService,
)
from loguru import logger
from sqlalchemy.orm import Session


class ExportEntity(Enum):
    BBOX_ANNOTATION = "bbox_annotation"
    CODE = "code"
    COTA = "cota"
    MEMO = "memo"
    PROJECT_METADATA = "project_metadata"
    SDOC = "sdoc"
    SENT_ANNOTATION = "sent_annotation"
    SPAN_ANNOTATION = "span_annotation"
    TAG = "tag"
    TIMELINE_ANALYSIS = "timeline_analysis"
    USER = "user"
    WHITEBOARD = "whiteboard"

    def get_regex(self) -> str:
        match self:
            case ExportEntity.BBOX_ANNOTATION:
                return r"project_\d+_all_bbox_annotations.csv"
            case ExportEntity.CODE:
                return r"project_\d+_all_codes.csv"
            case ExportEntity.COTA:
                return r"project_\d+_all_cota.csv"
            case ExportEntity.MEMO:
                return r"project_\d+_all_memos.csv"
            case ExportEntity.PROJECT_METADATA:
                return r"project_\d+_all_project_metadatas.csv"
            case ExportEntity.SDOC:
                return r"project_\d+_all_docs.zip"
            case ExportEntity.SENT_ANNOTATION:
                return r"project_\d+_all_sentence_annotations.csv"
            case ExportEntity.SPAN_ANNOTATION:
                return r"project_\d+_all_span_annotations.csv"
            case ExportEntity.TAG:
                return r"project_\d+_all_tags.csv"
            case ExportEntity.TIMELINE_ANALYSIS:
                return r"project_\d+_all_timeline_analyses.csv"
            case ExportEntity.USER:
                return r"project_\d+_all_users.csv"
            case ExportEntity.WHITEBOARD:
                return r"project_\d+_all_whiteboards.csv"
            case _:
                raise ValueError("Unknown entity")


def __organize_import_files(import_dir: Path) -> Dict[ExportEntity, Path]:
    """
    Organizes the import files into a dictionary mapping ExportEntity to their corresponding file paths.
    """
    organized_files: Dict[ExportEntity, Path] = {}

    for file in listdir(import_dir):
        file_path = Path(import_dir) / file
        if not isfile(file_path):
            continue

        # Check if the file matches any of the ExportEntity regex patterns
        for entity in ExportEntity.__members__.values():
            if re.match(entity.get_regex(), file):
                organized_files[entity] = file_path
                break

    # Log warnings for every missing entity:
    for entity in ExportEntity.__members__.values():
        if entity not in organized_files:
            logger.warning(f"Missing file for {entity}")

    return organized_files


def import_project(
    db: Session,
    repo: RepoService,
    path_to_dir: Path,
    proj_id: int,
) -> None:
    organized_files = __organize_import_files(import_dir=path_to_dir)

    # import project metadata
    if ExportEntity.PROJECT_METADATA in organized_files:
        pm_df = pd.read_csv(organized_files[ExportEntity.PROJECT_METADATA])
        import_project_metadata_to_proj(db=db, df=pm_df, project_id=proj_id)

    # import users
    if ExportEntity.USER in organized_files:
        user_data_df = pd.read_csv(organized_files[ExportEntity.USER])
        import_users_to_proj(
            db=db,
            df=user_data_df,
            project_id=proj_id,
        )

    # import codes
    if ExportEntity.CODE in organized_files:
        codes_df = pd.read_csv(organized_files[ExportEntity.CODE])
        import_codes_to_proj(db=db, df=codes_df, project_id=proj_id)

    # import tags
    if ExportEntity.TAG in organized_files:
        tags_df = pd.read_csv(organized_files[ExportEntity.TAG])
        import_tags_to_proj(db=db, df=tags_df, project_id=proj_id)

    # import sdocs
    if ExportEntity.SDOC in organized_files:
        # unzip file
        try:
            path_to_zip_file = repo.get_dst_path_for_temp_file(
                organized_files[ExportEntity.SDOC]
            )
            path_to_temp_import_dir = repo.create_temp_dir(
                f"import_project_{proj_id}_sdocs"
            )
            with zipfile.ZipFile(path_to_zip_file, "r") as zip_ref:
                zip_ref.extractall(path_to_temp_import_dir)
            logger.info("unzipped imported project")
        except Exception as e:
            raise e
        import_sdocs_to_proj(
            db=db,
            path_to_dir=path_to_temp_import_dir,
            project_id=proj_id,
        )

    # import bbox annotations
    if ExportEntity.BBOX_ANNOTATION in organized_files:
        bbox_df = pd.read_csv(organized_files[ExportEntity.BBOX_ANNOTATION])
        import_bbox_annotations_to_proj(
            db=db,
            df=bbox_df,
            project_id=proj_id,
        )

    # import span annotations
    if ExportEntity.SPAN_ANNOTATION in organized_files:
        span_df = pd.read_csv(organized_files[ExportEntity.SPAN_ANNOTATION])
        import_span_annotations_to_proj(
            db=db,
            df=span_df,
            project_id=proj_id,
        )

    # import sentence annotations
    if ExportEntity.SENT_ANNOTATION in organized_files:
        sent_df = pd.read_csv(organized_files[ExportEntity.SENT_ANNOTATION])
        import_sentence_annotations_to_proj(
            db=db,
            df=sent_df,
            project_id=proj_id,
        )

    # import Memos
    if ExportEntity.MEMO in organized_files:
        memo_df = pd.read_csv(organized_files[ExportEntity.MEMO])
        import_memos_to_proj(
            db=db,
            df=memo_df,
            project_id=proj_id,
        )

    # import COTA
    if ExportEntity.COTA in organized_files:
        cota_df = pd.read_csv(organized_files[ExportEntity.COTA])
        import_cota_to_proj(
            db=db,
            df=cota_df,
            project_id=proj_id,
        )

    # import Timeline Analysis
    if ExportEntity.TIMELINE_ANALYSIS in organized_files:
        timeline_analysis_df = pd.read_csv(
            organized_files[ExportEntity.TIMELINE_ANALYSIS]
        )
        import_timeline_analysis_to_proj(
            db=db,
            df=timeline_analysis_df,
            project_id=proj_id,
        )

    # import Whiteboard
    if ExportEntity.WHITEBOARD in organized_files:
        whiteboard_df = pd.read_csv(organized_files[ExportEntity.WHITEBOARD])
        import_whiteboards_to_proj(
            db=db,
            df=whiteboard_df,
            project_id=proj_id,
        )
