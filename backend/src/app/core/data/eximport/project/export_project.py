from datetime import datetime
from pathlib import Path
from typing import Dict, Union

from app.core.data.crud.project import crud_project
from app.core.data.eximport.bbox_annotations.export_bbox_annotations import (
    export_all_bbox_annotations,
)
from app.core.data.eximport.codes.export_codes import export_all_codes
from app.core.data.eximport.cota.export_cota import export_all_cota
from app.core.data.eximport.memos.export_memos import export_all_memos
from app.core.data.eximport.no_data_export_error import NoDataToExportError
from app.core.data.eximport.project_metadata.export_project_metadata import (
    export_all_project_metadatas,
)
from app.core.data.eximport.sdocs.export_sdocs import export_all_sdocs
from app.core.data.eximport.sent_annotations.export_sentence_annotations import (
    export_all_sentence_annotations,
)
from app.core.data.eximport.span_annotations.export_span_annotations import (
    export_all_span_annotations,
)
from app.core.data.eximport.tags.export_tags import export_all_tags
from app.core.data.eximport.timeline_analysis.export_timeline_analysis import (
    export_all_timeline_analyses,
)
from app.core.data.eximport.user.export_users import export_all_users
from app.core.data.eximport.whiteboards.export_whiteboards import export_all_whiteboards
from app.core.data.orm.project import ProjectORM
from app.core.data.repo.repo_service import RepoService
from loguru import logger
from sqlalchemy.orm import Session


def export_project(
    db: Session,
    repo: RepoService,
    project_id: int,
) -> Path:
    project = crud_project.read(db=db, id=project_id)
    return __export_project(
        db=db,
        repo=repo,
        fn=f"project_{project_id}",
        project=project,
    )


def __export_project(
    db: Session,
    repo: RepoService,
    fn: str,
    project: ProjectORM,
) -> Path:
    export_files = []
    for export_fn in [
        export_all_bbox_annotations,
        export_all_codes,
        export_all_cota,
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
                    repo=repo,
                    project_id=project.id,
                )
            )
        except NoDataToExportError as e:
            logger.warning(e)

    return repo.write_files_to_temp_zip_file(
        files=export_files,
        fn=fn,
    )


def __export_project_details(repo: RepoService, project: ProjectORM) -> Path:
    export_data = __generate_export_json_for_project_details(project)
    return repo.write_json_to_temp_file(
        json_obj=export_data,
        fn=f"project_{project.id}_details",
    )


def __generate_export_json_for_project_details(
    project: ProjectORM,
) -> Dict[str, Union[str, int, datetime]]:
    logger.info("Exporting project details ...")

    data = {
        "id": project.id,
        "title": project.title,
        "description": project.description,
        "created": project.created.isoformat(),
        "updated": project.updated.isoformat(),
    }

    return data
