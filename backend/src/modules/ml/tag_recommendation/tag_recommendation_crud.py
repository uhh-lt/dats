from sqlalchemy.orm import Session

from modules.ml.tag_recommendation.tag_recommendation_dto import (
    TagRecommendationLinkCreate,
    TagRecommendationLinkUpdate,
)
from modules.ml.tag_recommendation.tag_recommendation_orm import (
    TagRecommendationLinkORM,
)
from repos.db.crud_base import CRUDBase


class CRUDTagRecommendationLink(
    CRUDBase[
        TagRecommendationLinkORM,
        TagRecommendationLinkCreate,
        TagRecommendationLinkUpdate,
    ]
):
    ### READ OPERATIONS ###

    def read_by_ml_job_id(
        self,
        db: Session,
        *,
        ml_job_id: str,
        exclude_reviewed: bool = False,
    ) -> list[TagRecommendationLinkORM]:
        query = db.query(self.model).filter(self.model.ml_job_id == ml_job_id)

        if exclude_reviewed:
            query = query.filter(self.model.is_reviewed == False)  # noqa: E712
        query = query.order_by(self.model.prediction_score.desc())
        return query.all()


crud_tag_recommendation_link = CRUDTagRecommendationLink(TagRecommendationLinkORM)
