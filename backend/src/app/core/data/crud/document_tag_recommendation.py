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
    pass


crud_document_tag_recommendation_link = CrudDocumentTagRecommendationLink(
    DocumentTagRecommendationLinkORM
)
