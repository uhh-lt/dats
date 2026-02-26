from sqlalchemy.orm import Session

from common.doc_type import DocType
from core.doc.source_document_data_dto import (
    SourceDocumentDataCreate,
    SourceDocumentDataUpdate,
)
from core.doc.source_document_data_orm import SourceDocumentDataORM
from core.doc.source_document_orm import SourceDocumentORM
from core.tag.tag_orm import TagORM
from repos.db.crud_base import CRUDBase


class CRUDSourceDocumentData(
    CRUDBase[
        SourceDocumentDataORM,
        SourceDocumentDataCreate,
        SourceDocumentDataUpdate,
    ]
):
    def read_by_doctype_and_tag(
        self,
        db: Session,
        *,
        project_id: int,
        tag_id: int | None,
        doctype: DocType,
    ) -> list[SourceDocumentDataORM]:
        query = (
            db.query(SourceDocumentDataORM)
            .join(SourceDocumentORM, SourceDocumentORM.id == SourceDocumentDataORM.id)
            .filter(
                SourceDocumentORM.project_id == project_id,
                SourceDocumentORM.doctype == doctype,
            )
        )

        if tag_id is not None:
            query = query.join(
                SourceDocumentORM.tags,
            ).filter(
                SourceDocumentORM.tags.any(TagORM.id == tag_id),
            )

        return query.all()


crud_sdoc_data = CRUDSourceDocumentData(SourceDocumentDataORM)
