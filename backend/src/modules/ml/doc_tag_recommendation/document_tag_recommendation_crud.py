from typing import List

from modules.ml.doc_tag_recommendation.document_tag_recommendation_dto import (
    DocumentTagRecommendationLinkCreate,
    DocumentTagRecommendationLinkUpdate,
)
from modules.ml.doc_tag_recommendation.document_tag_recommendation_orm import (
    DocumentTagRecommendationLinkORM,
)
from repos.db.crud_base import CRUDBase
from sqlalchemy.orm import Session


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
        query = query.order_by(self.model.prediction_score.desc())
        return query.all()


crud_document_tag_recommendation_link = CrudDocumentTagRecommendationLink(
    DocumentTagRecommendationLinkORM
)
