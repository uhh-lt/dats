from datetime import datetime
from typing import Dict, Union

from sqlalchemy.orm import Session

from app.core.data.crud.project import crud_project


def generate_export_dict_for_project_details(
    db: Session, project_id: int
) -> Dict[str, Union[str, int, datetime]]:
    project_data = crud_project.read(db=db, id=project_id)
    data = {
        "id": project_data.id,
        "title": project_data.title,
        "description": project_data.description,
        "created": project_data.created.isoformat(),
        "updated": project_data.updated.isoformat(),
    }

    return data
