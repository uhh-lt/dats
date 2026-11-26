from typing import TypedDict

import pytest
from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from composite_keys_test_utils import TwoTenants, create_two_tenants
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
            project_id=test_project.id,
            create_dto=AspectCreate(
                name=name,
                doc_embedding_prompt="Topic",
                is_hierarchical=False,
                modality=DocType.text,
                pipeline_settings=PipelineSettings(rewriting_model="default"),
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


@pytest.fixture(scope="function")
def tenants(db_session, test_user, test_project) -> TwoTenants:
    """
    This fixture sets up two projects with one row of every project-owned table
    each (see `composite_keys_test_utils.TenantRows` for the full inventory):

    - `own`: the rows in the test project, among them the aspect "Aspect <p>"
      with the cluster "Cluster <p>", which holds the document "doc_<p>.txt"
      (document aspect content "").
    - `foreign`: the same rows in the project "Foreign Project" (no features).

    Both "Aspect <p>" have the default pipeline settings (rewriting model
    "default") and both "Cluster <p>" are computed: description "Description",
    coordinates (0, 0) (the read DTOs need them).

    Non-obvious derived behavior: the test user is a member of both projects, so
    an id of the other project is the only reason a request finds nothing.
    """
    tenants = create_two_tenants(db_session, user=test_user, project=test_project)
    for rows in (tenants["own"], tenants["foreign"]):
        rows["aspect"].pipeline_settings = PipelineSettings(
            rewriting_model="default"
        ).model_dump(mode="json")
        rows["cluster"].description = "Description"
        rows["cluster"].x = 0.0
        rows["cluster"].y = 0.0
    db_session.commit()
    return tenants
