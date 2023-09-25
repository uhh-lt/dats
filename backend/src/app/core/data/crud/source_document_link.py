from typing import Dict, List

from app.core.data.crud.crud_base import CRUDBase, ORMModelType, UpdateDTOType
from app.core.data.dto.source_document_link import SourceDocumentLinkCreate
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.source_document_link import SourceDocumentLinkORM
from sqlalchemy.orm import Session


class CRUDSourceDocumentLink(
    CRUDBase[SourceDocumentLinkORM, SourceDocumentLinkCreate, None]
):
    def update(
        self, db: Session, *, id: int, update_dto: UpdateDTOType
    ) -> ORMModelType:
        raise NotImplementedError()

    def resolve_filenames_to_sdoc_ids(
        self, db: Session, proj_id: int
    ) -> List[SourceDocumentLinkORM]:
        query = db.query(self.model)
        query = query.join(
            SourceDocumentORM,
            SourceDocumentORM.id == self.model.parent_source_document_id,
        )
        query = query.filter(
            self.model.linked_source_document_id.is_(None),
            SourceDocumentORM.project_id == proj_id,
        )
        unresolved_links: List[SourceDocumentLinkORM] = query.all()

        query2 = db.query(SourceDocumentORM.filename, SourceDocumentORM.id)
        query2 = query2.filter(
            SourceDocumentORM.filename.in_(
                [link.linked_source_document_filename for link in unresolved_links]
            ),
            SourceDocumentORM.project_id == proj_id,
        )
        # noinspection PyTypeChecker
        sdoc_fn_to_id: Dict[str, int] = dict(query2.all())

        resolved_links: List[SourceDocumentLinkORM] = []

        for link in unresolved_links:
            if link.linked_source_document_filename not in sdoc_fn_to_id:
                continue
            link.linked_source_document_id = sdoc_fn_to_id[
                link.linked_source_document_filename
            ]
            resolved_links.append(link)

        db.add_all(resolved_links)
        db.commit()
        return resolved_links

    def get_linked_sdocs(
        self, db: Session, parent_sdoc_id: int
    ) -> List[SourceDocumentLinkORM]:
        db_obj = (
            db.query(self.model)
            .filter(self.model.parent_source_document_id == parent_sdoc_id)
            .all()
        )
        return db_obj


crud_sdoc_link = CRUDSourceDocumentLink(SourceDocumentLinkORM)
