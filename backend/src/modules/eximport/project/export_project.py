from datetime import datetime
from pathlib import Path

from loguru import logger
from sqlalchemy.orm import Session

from core.project.project_crud import crud_project
from core.project.project_orm import ProjectORM
from modules.eximport.bbox_annotations.export_bbox_annotations import (
    export_all_bbox_annotations,
)
from modules.eximport.codes.export_codes import export_all_codes
from modules.eximport.cota.export_cota import export_all_cota
from modules.eximport.export_exceptions import NoDataToExportError
from modules.eximport.folder.export_folders import export_all_folders
from modules.eximport.memos.export_memos import export_all_memos
from modules.eximport.project_metadata.export_project_metadata import (
    export_all_project_metadatas,
)
from modules.eximport.sdocs.export_sdocs import export_all_sdocs
from modules.eximport.sent_annotations.export_sentence_annotations import (
    export_all_sentence_annotations,
)
from modules.eximport.span_annotations.export_span_annotations import (
    export_all_span_annotations,
)
from modules.eximport.tags.export_tags import export_all_tags
from modules.eximport.timeline_analysis.export_timeline_analysis import (
    export_all_timeline_analyses,
)
from modules.eximport.user.export_users import export_all_users
from modules.eximport.whiteboards.export_whiteboards import export_all_whiteboards
from repos.filesystem_repo import FilesystemRepo


def export_project(
    db: Session,
    fsr: FilesystemRepo,
    project_id: int,
) -> Path:
    project = crud_project.read(db=db, id=project_id)
    return __export_project(
        db=db,
        fsr=fsr,
        fn=f"project_{project_id}",
        project=project,
    )


def __export_project(
    db: Session,
    fsr: FilesystemRepo,
    fn: str,
    project: ProjectORM,
) -> Path:
    export_files = []
    for export_fn in [
        export_all_bbox_annotations,
        export_all_codes,
        export_all_cota,
        export_all_folders,
        export_all_memos,
        export_all_project_metadatas,
        export_all_sdocs,
        export_all_sentence_annotations,
        export_all_span_annotations,
        export_all_tags,
        export_all_timeline_analyses,
        export_all_users,
        export_all_whiteboards,
    ]:
        try:
            export_files.append(
                export_fn(
                    db=db,
                    fsr=fsr,
                    project_id=project.id,
                )
            )
        except NoDataToExportError as e:
            logger.warning(e)

    return fsr.write_files_to_temp_zip_file(
        files=export_files,
        fn=fn,
    )


def __export_project_details(fsr: FilesystemRepo, project: ProjectORM) -> Path:
    export_data = __generate_export_json_for_project_details(project)
    return fsr.write_json_to_temp_file(
        json_obj=export_data,
        fn=f"project_{project.id}_details",
    )


def __generate_export_json_for_project_details(
    project: ProjectORM,
) -> dict[str, str | int | datetime]:
    logger.info("Exporting project details ...")

    data = {
        "id": project.id,
        "title": project.title,
        "description": project.description,
        "created": project.created.isoformat(),
        "updated": project.updated.isoformat(),
    }

    return data
