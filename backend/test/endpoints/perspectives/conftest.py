from typing import TypedDict

import pytest
from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from core.project.project_orm import ProjectORM
from modules.perspectives.aspect_crud import crud_aspect
from modules.perspectives.aspect_dto import AspectCreate, PipelineSettings
from modules.perspectives.aspect_orm import AspectORM
from modules.perspectives.perspectives_file_crud import (
    MAP_THUMBNAIL_FILENAME,
    crud_perspectives_model_file,
    crud_perspectives_plot_file,
)


class AspectsWithFiles(TypedDict):
    project: ProjectORM
    mapped: AspectORM
    unmapped: AspectORM


@pytest.fixture(scope="function")
def aspects_with_files(
    db_session: Session, test_project: ProjectORM
) -> AspectsWithFiles:
    """
    This fixture sets up two text aspects of `test_project` (prompt "Topic",
    default pipeline settings with the rewriting model "default"):

    - "Mapped" (`mapped`), whose map is computed: its map thumbnail
      `perspectives_plots/<id>/map_thumbnail.png` (b"png") and its UMAP model
      `perspectives_models/<id>/umap_default` (b"umap") exist.
    - "Unmapped" (`unmapped`), with no files.
    """
    mapped, unmapped = (
        crud_aspect.create(
            db=db_session,
            create_dto=AspectCreate(
                name=name,
                doc_embedding_prompt="Topic",
                is_hierarchical=False,
                modality=DocType.text,
                pipeline_settings=PipelineSettings(rewriting_model="default"),
                project_id=test_project.id,
            ),
        )
        for name in ("Mapped", "Unmapped")
    )
    db_session.commit()
    crud_perspectives_plot_file.write(
        project_id=test_project.id,
        id=mapped.id,
        name=MAP_THUMBNAIL_FILENAME,
        data=b"png",
    )
    crud_perspectives_model_file.write(
        project_id=test_project.id, id=mapped.id, name="umap_default", data=b"umap"
    )
    return {"project": test_project, "mapped": mapped, "unmapped": unmapped}
