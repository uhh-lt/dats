from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_current_user, get_db_session
from app.celery.background_jobs import (
    prepare_and_start_document_classification_job_async,
)
from app.core.authorization.authz_user import AuthzUser
from app.core.data.crud.document_tag_recommendation import (
    crud_document_tag_recommendation,
)
from app.core.data.dto.document_tag_recommendation import (
    DocumentTagRecommendationCreate,
    DocumentTagRecommendationCreateIntern,
    DocumentTagRecommendationRead,
)

router = APIRouter(
    prefix="/doctagrecommendation",
    dependencies=[Depends(get_current_user)],
    tags=["documentTagRecommendation"],
)


@router.put(
    "",
    response_model=DocumentTagRecommendationRead,
    summary="Creates a new Document Tag Recommendation Task and returns it.",
)
def create_new_doc_tag_rec_task(
    *,
    db: Session = Depends(get_db_session),
    doc_tag_rec: DocumentTagRecommendationCreate,
    authz_user: AuthzUser = Depends(),
    background_tasks: BackgroundTasks,
) -> DocumentTagRecommendationRead:
    authz_user.assert_in_project(doc_tag_rec.project_id)

    db_obj = crud_document_tag_recommendation.create(
        db=db,
        create_dto=DocumentTagRecommendationCreateIntern(
            project_id=doc_tag_rec.project_id, user_id=authz_user.user.id
        ),
    )
    response = DocumentTagRecommendationRead.model_validate(db_obj)
    prepare_and_start_document_classification_job_async(
        db_obj.task_id,
        doc_tag_rec.project_id,
    )

    return response


# To-Do: Update of tag recommendation
