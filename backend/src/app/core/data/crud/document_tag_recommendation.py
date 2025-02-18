from typing import List, Optional

from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.document_tag_recommendation import (
    DocumentTagRecommendationCreateIntern,
    DocumentTagRecommendationLinkCreate,
    DocumentTagRecommendationLinkUpdate,
    DocumentTagRecommendationUpdate,
)
from app.core.data.orm.document_tag_recommendation import (
    DocumentTagRecommendationLinkORM,
    DocumentTagRecommendationORM,
)


class CRUDDocumentTagRecommendation(
    CRUDBase[
        DocumentTagRecommendationORM,
        DocumentTagRecommendationCreateIntern,
        DocumentTagRecommendationUpdate,
    ]
):
    # use base class update, read, create functions
    pass


crud_document_tag_recommendation = CRUDDocumentTagRecommendation(
    DocumentTagRecommendationORM
)


class CrudDocumentTagRecommendationLink(
    CRUDBase[
        DocumentTagRecommendationLinkORM,
        DocumentTagRecommendationLinkCreate,
        DocumentTagRecommendationLinkUpdate,
    ]
):
    def read_by_task_id(
        self,
        db: Session,
        *,
        task_id: int,
        skip: Optional[int] = None,
        limit: Optional[int] = None,
        exclude_accepted: bool = False,
    ) -> List[DocumentTagRecommendationLinkORM]:
        query = db.query(self.model)
        query = query.filter(self.model.recommendation_task_id == task_id)

        if exclude_accepted:
            query = query.filter(self.model.is_accepted == False)  # noqa: E712
        if skip is not None:
            query = query.offset(skip)
        if limit is not None:
            query = query.limit(limit)

        return query.all()


crud_document_tag_recommendation_link = CrudDocumentTagRecommendationLink(
    DocumentTagRecommendationLinkORM
)
