import re
import zipfile
from os import listdir
from os.path import isfile
from pathlib import Path

from loguru import logger
from sqlalchemy.orm import Session

from modules.eximport.bbox_annotations.import_bbox_annotations import (
    import_bbox_annotations_to_proj,
)
from modules.eximport.codes.import_codes import import_codes_to_proj
from modules.eximport.cota.import_cota import import_cota_to_proj
from modules.eximport.folder.import_folders import import_folders_to_proj
from modules.eximport.import_csv_utils import read_import_csv
from modules.eximport.import_enum import ExportEntity
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

IMPORT_ORDER = [
    ExportEntity.PROJECT_METADATA,
    ExportEntity.USER,
    ExportEntity.CODE,
    ExportEntity.TAG,
    ExportEntity.FOLDER,
    ExportEntity.SDOC,
    ExportEntity.BBOX_ANNOTATION,
    ExportEntity.SPAN_ANNOTATION,
    ExportEntity.SENT_ANNOTATION,
    ExportEntity.MEMO,
    ExportEntity.COTA,
    ExportEntity.TIMELINE_ANALYSIS,
    ExportEntity.WHITEBOARD,
]


def _import_entity(entity: ExportEntity, db: Session, data, project_id: int) -> None:
    match entity:
        case ExportEntity.BBOX_ANNOTATION:
            import_bbox_annotations_to_proj(db=db, df=data, project_id=project_id)
        case ExportEntity.CODE:
            import_codes_to_proj(db=db, df=data, project_id=project_id)
        case ExportEntity.COTA:
            import_cota_to_proj(db=db, df=data, project_id=project_id)
        case ExportEntity.FOLDER:
            import_folders_to_proj(db=db, df=data, project_id=project_id)
        case ExportEntity.MEMO:
            import_memos_to_proj(db=db, df=data, project_id=project_id)
        case ExportEntity.PROJECT_METADATA:
            import_project_metadata_to_proj(db=db, df=data, project_id=project_id)
        case ExportEntity.SDOC:
            import_sdocs_to_proj(db=db, path_to_dir=data, project_id=project_id)
        case ExportEntity.SENT_ANNOTATION:
            import_sentence_annotations_to_proj(db=db, df=data, project_id=project_id)
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
    project_id: int,
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
                    f"import_project_{project_id}_sdocs"
                )
                with zipfile.ZipFile(path_to_zip_file, "r") as zip_ref:
                    zip_ref.extractall(path_to_temp_import_dir)
                logger.info("unzipped imported project")
                organized_data[entity] = path_to_temp_import_dir
            except Exception as e:
                raise e
        else:
            # read csv
            organized_data[entity] = read_import_csv(file_path)

    # import data
    for entity in IMPORT_ORDER:
        if entity not in organized_files:
            continue

        data = organized_data[entity]
        _import_entity(entity=entity, db=db, data=data, project_id=project_id)
