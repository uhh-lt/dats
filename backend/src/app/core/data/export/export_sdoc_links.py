import pandas as pd
from sqlalchemy.orm import Session

from app.core.data.crud.source_document import crud_sdoc


def generate_export_dict_for_sdoc_links(db: Session, project_id: int) -> pd.DataFrame:
    data = {
        "sdoc_filename": [],
        "linked_source_document_filename": [],
    }
    sdocs = crud_sdoc.read_by_project(db=db, proj_id=project_id)
    for sdoc in sdocs:
        for link in sdoc.source_document_links:
            data["sdoc_filename"].append(sdoc.filename)
            data["linked_source_document_filename"].append(
                link.linked_source_document_filename
            )
    return pd.DataFrame(data)
