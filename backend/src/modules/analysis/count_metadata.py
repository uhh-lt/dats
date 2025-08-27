from sqlalchemy import func
from sqlalchemy.orm import Session

from core.doc.source_document_orm import SourceDocumentORM
from core.metadata.source_document_metadata_orm import SourceDocumentMetadataORM


def compute_num_sdocs_with_date_metadata(
    db: Session, project_id: int, date_metadata_id: int
) -> tuple[int, int]:
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
