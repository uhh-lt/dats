from typing import Tuple

from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.source_document_metadata import SourceDocumentMetadataORM
from app.core.db.sql_service import SQLService
from sqlalchemy import func


def compute_num_sdocs_with_date_metadata(
    project_id: int, date_metadata_id: int
) -> Tuple[int, int]:
    with SQLService().db_session() as db:
        query = (
            db.query(func.count(SourceDocumentORM.id))
            .join(SourceDocumentORM.metadata_)
            .filter(
                SourceDocumentORM.project_id == project_id,
                SourceDocumentMetadataORM.project_metadata_id == date_metadata_id,
                SourceDocumentMetadataORM.date_value.isnot(None),
            )
        )
        sdocs_with_valid_date = query.scalar()

        query = db.query(func.count(SourceDocumentORM.id)).filter(
            SourceDocumentORM.project_id == project_id
        )
        sdocs_total = query.scalar()

    return (sdocs_with_valid_date, sdocs_total)
