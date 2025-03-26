from typing import List

from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.document_tag_recommendation import (
    DocumentTagRecommendationLinkCreate,
    DocumentTagRecommendationLinkUpdate,
)
from app.core.data.orm.document_tag_recommendation import (
    DocumentTagRecommendationLinkORM,
)


class CrudDocumentTagRecommendationLink(
    CRUDBase[
        DocumentTagRecommendationLinkORM,
        DocumentTagRecommendationLinkCreate,
        DocumentTagRecommendationLinkUpdate,
    ]
):
    def read_by_ml_job_id(
        self,
        db: Session,
        *,
        ml_job_id: str,
        exclude_reviewed: bool = False,
    ) -> List[DocumentTagRecommendationLinkORM]:
        query = db.query(self.model).filter(self.model.ml_job_id == ml_job_id)

        if exclude_reviewed:
            query = query.filter(self.model.is_reviewed == False)  # noqa: E712
        return query.all()


crud_document_tag_recommendation_link = CrudDocumentTagRecommendationLink(
    DocumentTagRecommendationLinkORM
)
