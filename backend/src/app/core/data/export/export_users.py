import pandas as pd
from sqlalchemy.orm import Session

from app.core.data.crud.project import crud_project


def generate_export_df_for_users_in_project(
    db: Session, project_id: int
) -> pd.DataFrame:
    users_data = crud_project.read(db=db, id=project_id).users
    data = [
        {
            "email": user_data.email,
            "first_name": user_data.first_name,
            "last_name": user_data.last_name,
            "created": user_data.created,
            "updated": user_data.updated,
        }
        for user_data in users_data
    ]
    users_data_df = pd.DataFrame(data)
    return users_data_df
