import pandas as pd
from sqlalchemy.orm import Session

from app.core.data.crud.project_metadata import crud_project_meta


def generate_export_dfs_for_all_project_metadata_in_proj(
    db: Session, project_id: int
) -> pd.DataFrame:
    project_metadatas = crud_project_meta.read_by_project(db=db, proj_id=project_id)
    exported_project_metadata = []
    for project_metadata in project_metadatas:
        exported_project_metadata.append(
            {
                "key": project_metadata.key,
                "metatype": project_metadata.metatype,
                "doctype": project_metadata.doctype,
                "description": project_metadata.description,
            }
        )
    exported_project_metadata = pd.DataFrame(exported_project_metadata)

    return exported_project_metadata
