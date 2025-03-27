from datetime import datetime
from pathlib import Path
from typing import Dict, Union

from loguru import logger
from sqlalchemy.orm import Session

from app.core.data.crud.project import crud_project
from app.core.data.eximport.bbox_annotations.export_bbox_annotations import (
    export_all_bbox_annotations,
)
from app.core.data.eximport.codes.export_codes import export_all_codes
from app.core.data.eximport.export_memos import export_all_memos
from app.core.data.eximport.export_sdocs import export_all_sdocs
from app.core.data.eximport.export_sentence_annotations import (
    export_all_sentence_annotations,
)
from app.core.data.eximport.export_span_annotations import export_all_span_annotations
from app.core.data.eximport.export_users import export_all_users
from app.core.data.eximport.tags.export_tags import export_all_tags
from app.core.data.orm.project import ProjectORM
from app.core.data.repo.repo_service import RepoService


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
    # We export this for a project:
    # 1. Project details (json file)
    # 2. Source documents and their related data (zip file)
    # 3. Users (csv file)
    # 4. Codes (csv file)
    # 5. Tags (csv file)
    # 6. BBox annotations (csv file)
    # 7. Sentence annotations (csv file)
    # 8. Span annotations (csv file)
    # 9. Memos (csv file)

    project_details_file = __export_project_details(repo=repo, project=project)
    sdoc_files = export_all_sdocs(
        db=db,
        repo=repo,
        project_id=project.id,
    )
    user_file = export_all_users(
        db=db,
        repo=repo,
        project_id=project.id,
    )
    codes_file = export_all_codes(
        db=db,
        repo=repo,
        project_id=project.id,
    )
    tags_file = export_all_tags(
        db=db,
        repo=repo,
        project_id=project.id,
    )
    bbox_annotations_file = export_all_bbox_annotations(
        db=db,
        repo=repo,
        project_id=project.id,
    )
    sentence_annotations_file = export_all_sentence_annotations(
        db=db,
        repo=repo,
        project_id=project.id,
    )
    span_annotations_file = export_all_span_annotations(
        db=db,
        repo=repo,
        project_id=project.id,
    )
    memos_file = export_all_memos(
        db=db,
        repo=repo,
        project_id=project.id,
    )

    files = [
        project_details_file,
        sdoc_files,
        user_file,
        codes_file,
        tags_file,
        bbox_annotations_file,
        sentence_annotations_file,
        span_annotations_file,
        memos_file,
    ]
    return repo.write_files_to_temp_zip_file(
        files=files,
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
