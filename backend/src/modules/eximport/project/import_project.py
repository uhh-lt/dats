import re
import zipfile
from enum import Enum
from os import listdir
from os.path import isfile
from pathlib import Path

import pandas as pd
from loguru import logger
from sqlalchemy.orm import Session

from modules.eximport.bbox_annotations.import_bbox_annotations import (
    import_bbox_annotations_to_proj,
)
from modules.eximport.codes.import_codes import import_codes_to_proj
from modules.eximport.cota.import_cota import import_cota_to_proj
from modules.eximport.memos.import_memos import import_memos_to_proj
from modules.eximport.project_metadata.import_project_metadata import (
    import_project_metadata_to_proj,
)
from modules.eximport.sdocs.import_sdocs import import_sdocs_to_proj
from modules.eximport.sent_annotations.import_sentence_annotations import (
    import_sentence_annotations_to_proj,
)
from modules.eximport.span_annotations.import_span_annotations import (
    import_span_annotations_to_proj,
)
from modules.eximport.tags.import_tags import import_tags_to_proj
from modules.eximport.timeline_analysis.import_timeline_analysis import (
    import_timeline_analysis_to_proj,
)
from modules.eximport.user.import_users import import_users_to_proj
from modules.eximport.whiteboards.import_whiteboards import import_whiteboards_to_proj
from repos.filesystem_repo import FilesystemRepo


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

    def import_entity(self, db: Session, data, project_id: int) -> None:
        match self:
            case ExportEntity.BBOX_ANNOTATION:
                import_bbox_annotations_to_proj(db=db, df=data, project_id=project_id)
            case ExportEntity.CODE:
                import_codes_to_proj(db=db, df=data, project_id=project_id)
            case ExportEntity.COTA:
                import_cota_to_proj(db=db, df=data, project_id=project_id)
            case ExportEntity.MEMO:
                import_memos_to_proj(db=db, df=data, project_id=project_id)
            case ExportEntity.PROJECT_METADATA:
                import_project_metadata_to_proj(db=db, df=data, project_id=project_id)
            case ExportEntity.SDOC:
                import_sdocs_to_proj(db=db, path_to_dir=data, project_id=project_id)
            case ExportEntity.SENT_ANNOTATION:
                import_sentence_annotations_to_proj(
                    db=db, df=data, project_id=project_id
                )
            case ExportEntity.SPAN_ANNOTATION:
                import_span_annotations_to_proj(db=db, df=data, project_id=project_id)
            case ExportEntity.TAG:
                import_tags_to_proj(db=db, df=data, project_id=project_id)
            case ExportEntity.TIMELINE_ANALYSIS:
                import_timeline_analysis_to_proj(db=db, df=data, project_id=project_id)
            case ExportEntity.USER:
                import_users_to_proj(db=db, df=data, project_id=project_id)
            case ExportEntity.WHITEBOARD:
                import_whiteboards_to_proj(db=db, df=data, project_id=project_id)


IMPORT_ORDER = [
    ExportEntity.PROJECT_METADATA,
    ExportEntity.USER,
    ExportEntity.CODE,
    ExportEntity.TAG,
    ExportEntity.SDOC,
    ExportEntity.BBOX_ANNOTATION,
    ExportEntity.SPAN_ANNOTATION,
    ExportEntity.SENT_ANNOTATION,
    ExportEntity.MEMO,
    ExportEntity.COTA,
    ExportEntity.TIMELINE_ANALYSIS,
    ExportEntity.WHITEBOARD,
]


def __organize_import_files(import_dir: Path) -> dict[ExportEntity, Path]:
    """
    Organizes the import files into a dictionary mapping ExportEntity to their corresponding file paths.
    """
    organized_files: dict[ExportEntity, Path] = {}

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
    fsr: FilesystemRepo,
    path_to_dir: Path,
    proj_id: int,
) -> None:
    organized_files = __organize_import_files(import_dir=path_to_dir)

    # read data
    organized_data = {}
    for entity, file_path in organized_files.items():
        if entity == ExportEntity.SDOC:
            # read zip (unzip file)
            try:
                path_to_zip_file = fsr.get_dst_path_for_temp_file(
                    organized_files[ExportEntity.SDOC]
                )
                path_to_temp_import_dir = fsr.create_temp_dir(
                    f"import_project_{proj_id}_sdocs"
                )
                with zipfile.ZipFile(path_to_zip_file, "r") as zip_ref:
                    zip_ref.extractall(path_to_temp_import_dir)
                logger.info("unzipped imported project")
                organized_data[entity] = path_to_temp_import_dir
            except Exception as e:
                raise e
        else:
            # read csv
            organized_data[entity] = pd.read_csv(file_path)

    # import data
    for entity in IMPORT_ORDER:
        if entity not in organized_files:
            continue

        data = organized_data[entity]
        entity.import_entity(db=db, data=data, project_id=proj_id)
