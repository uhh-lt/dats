from app.celery.background_jobs import prepare_and_start_tm_job_async
from app.core.authorization.authz_user import AuthzUser
from app.core.data.crud import Crud
from app.core.data.crud.aspect import crud_aspect
from app.core.data.crud.document_topic import crud_document_topic
from app.core.data.crud.topic import crud_topic
from app.core.data.dto.aspect import (
    AspectCreate,
    AspectRead,
    AspectUpdate,
    AspectUpdateIntern,
)
from app.core.data.dto.background_job_base import BackgroundJobStatus
from app.core.data.dto.tm_vis import TMDoc, TMVisualization
from app.core.data.dto.topic import TopicRead
from app.core.topicmodel.tm_job import (
    CreateAspectParams,
    TMJobParamsNoCreate,
    TMJobRead,
)
from app.core.topicmodel.tm_job_service import TMJobService
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_current_user, get_db_session

tmjs = TMJobService()

router = APIRouter(
    prefix="/topic_model",
    dependencies=[Depends(get_current_user)],
    tags=["topic_model"],
)

# --- START JOBS --- #


@router.post(
    "/job/{aspect_id}",
    response_model=TMJobRead,
    summary="Starts the TMJob for the given Parameters. If a job is already running, this will raise an error.",
)
def start_tm_job(
    *,
    db: Session = Depends(get_db_session),
    aspect_id: int,
    tm_job_params: TMJobParamsNoCreate,
    authz_user: AuthzUser = Depends(),
) -> TMJobRead:
    authz_user.assert_in_same_project_as(Crud.ASPECT, aspect_id)

    aspect = crud_aspect.read(db=db, id=aspect_id)

    # Check if there is a job running already for this aspect
    if aspect.most_recent_job_id:
        most_recent_job = tmjs.get_tm_job(aspect.most_recent_job_id)
        if most_recent_job and most_recent_job.status not in [
            BackgroundJobStatus.ABORTED,
            BackgroundJobStatus.ERROR,
            BackgroundJobStatus.FINISHED,
        ]:
            raise Exception(
                f"TMJob {most_recent_job.id} is still running. Please wait until it is finished."
            )

    # No job running, so we can start a new one
    tm_job = prepare_and_start_tm_job_async(
        project_id=aspect.project_id, tm_job_params=tm_job_params
    )

    # Update the aspect with the new job ID
    crud_aspect.update(
        db=db,
        id=aspect.id,
        update_dto=AspectUpdateIntern(
            most_recent_job_id=tm_job.id,
        ),
    )

    return tm_job


@router.get(
    "/job/{tm_job_id}",
    response_model=TMJobRead,
    summary="Returns the TMJob for the given ID if it exists",
)
def get_tm_job(
    *,
    db: Session = Depends(get_db_session),
    tm_job_id: str,
    authz_user: AuthzUser = Depends(),
) -> TMJobRead:
    job = tmjs.get_tm_job(tm_job_id)
    authz_user.assert_in_project(job.project_id)
    return job


# --- START ASPECTS --- #


@router.put(
    "/aspect",
    response_model=AspectRead,
    summary="Creates a new Aspect",
)
def create_aspect(
    *,
    db: Session = Depends(get_db_session),
    aspect: AspectCreate,
    authz_user: AuthzUser = Depends(),
) -> AspectRead:
    authz_user.assert_in_project(aspect.project_id)

    db_aspect = crud_aspect.create(db=db, create_dto=aspect)
    tm_job = prepare_and_start_tm_job_async(
        project_id=aspect.project_id,
        tm_job_params=CreateAspectParams(aspect_id=db_aspect.id),
    )
    db_aspect = crud_aspect.update(
        db=db,
        id=db_aspect.id,
        update_dto=AspectUpdateIntern(
            most_recent_job_id=tm_job.id,
        ),
    )

    return AspectRead.model_validate(db_aspect)


@router.get(
    "/aspect/{aspect_id}",
    response_model=AspectRead,
    summary="Returns the Aspect with the given ID.",
)
def get_by_id(
    *,
    db: Session = Depends(get_db_session),
    aspect_id: int,
    authz_user: AuthzUser = Depends(),
) -> AspectRead:
    authz_user.assert_in_same_project_as(Crud.ASPECT, aspect_id)

    db_obj = crud_aspect.read(db=db, id=aspect_id)
    return AspectRead.model_validate(db_obj)


@router.patch(
    "/aspect/{aspect_id}",
    response_model=AspectRead,
    summary="Updates the Aspect with the given ID.",
)
def update_aspect_by_id(
    *,
    db: Session = Depends(get_db_session),
    aspect_id: int,
    aspect: AspectUpdate,
    authz_user: AuthzUser = Depends(),
) -> AspectRead:
    authz_user.assert_in_same_project_as(Crud.ASPECT, aspect_id)
    db_obj = crud_aspect.update(
        db=db, id=aspect_id, update_dto=AspectUpdateIntern(**aspect.model_dump())
    )
    return AspectRead.model_validate(db_obj)


@router.delete(
    "/aspect/{aspect_id}",
    response_model=AspectRead,
    summary="Removes the Aspect with the given ID.",
)
def remove_aspect_by_id(
    *,
    db: Session = Depends(get_db_session),
    aspect_id: int,
    authz_user: AuthzUser = Depends(),
) -> AspectRead:
    authz_user.assert_in_same_project_as(Crud.ASPECT, aspect_id)

    db_obj = crud_aspect.remove(db=db, id=aspect_id)
    return AspectRead.model_validate(db_obj)


# --- START LABELING --- #


@router.post(
    "/label_accept/{aspect_id}",
    response_model=AspectRead,
    summary="Accept the label of the provided SourceDocuments (by ID).",
)
def accept_label(
    *,
    db: Session = Depends(get_db_session),
    aspect_id: int,
    sdoc_ids: list[int],
    authz_user: AuthzUser = Depends(),
) -> int:
    authz_user.assert_in_same_project_as(Crud.ASPECT, aspect_id)
    return crud_document_topic.set_labels(
        db=db,
        aspect_id=aspect_id,
        sdoc_ids=sdoc_ids,
        is_accepted=True,
    )


@router.post(
    "/label_revert/{aspect_id}",
    response_model=AspectRead,
    summary="Reverts the label of the provided SourceDocuments (by ID).",
)
def revert_label(
    *,
    db: Session = Depends(get_db_session),
    aspect_id: int,
    sdoc_ids: list[int],
    authz_user: AuthzUser = Depends(),
) -> int:
    authz_user.assert_in_same_project_as(Crud.ASPECT, aspect_id)
    return crud_document_topic.set_labels(
        db=db,
        aspect_id=aspect_id,
        sdoc_ids=sdoc_ids,
        is_accepted=False,
    )


# --- START VISUALIZATIONS --- #


@router.get(
    "/visualize_documents/{aspect_id}",
    response_model=TMVisualization,
    summary="Returns data for visualizing the documents of the given aspect.",
)
def visualize_documents(
    *,
    db: Session = Depends(get_db_session),
    aspect_id: int,
    authz_user: AuthzUser = Depends(),
) -> TMVisualization:
    authz_user.assert_in_same_project_as(Crud.ASPECT, aspect_id)

    # Fetch data for visualization
    aspect = crud_aspect.read(db=db, id=aspect_id)
    document_aspects = aspect.document_aspects

    # Color by
    topics = aspect.topics
    document_topics = crud_document_topic.read_by_aspect(db=db, aspect_id=aspect_id)
    sdoc_id2dt = {dt.sdoc_id: dt for dt in document_topics}
    assert len(document_aspects) == len(
        document_topics
    ), "The number of DocumentAspects and DocumentTopics must match for visualization."

    # Prepare the visualization data
    docs = [
        TMDoc(
            sdoc_id=doc.sdoc_id,
            topic_id=sdoc_id2dt[doc.sdoc_id].topic_id,
            x=doc.x,
            y=doc.y,
        )
        for doc in document_aspects
    ]

    return TMVisualization(
        aspect_id=aspect.id,
        topics=[TopicRead.model_validate(t) for t in topics],
        docs=docs,
    )


@router.get(
    "/visualize_topics/{aspect_id}",
    response_model=AspectRead,
    summary="Returns data for visualizing the topics of the given aspect.",
)
def visualize_topics(
    *,
    db: Session = Depends(get_db_session),
    aspect_id: int,
    authz_user: AuthzUser = Depends(),
) -> AspectRead:
    authz_user.assert_in_same_project_as(Crud.ASPECT, aspect_id)

    # TODO: implement
    raise NotImplementedError("visualize_topics not implemented yet")


@router.get(
    "/topics/{aspect_id}/sdoc/{sdoc_id}",
    response_model=list[TopicRead],
    summary="Returns the topics for the given SourceDocument (sdoc_id) in the specified Aspect (aspect_id).",
)
def get_topics_for_sdoc(
    *,
    db: Session = Depends(get_db_session),
    aspect_id: int,
    sdoc_id: int,
    authz_user: AuthzUser = Depends(),
) -> list[TopicRead]:
    authz_user.assert_in_same_project_as(Crud.ASPECT, aspect_id)

    # Fetch the topics for the given SourceDocument
    document_topics = crud_topic.read_by_aspect_and_sdoc(
        db=db, aspect_id=aspect_id, sdoc_id=sdoc_id
    )
    return [TopicRead.model_validate(dt) for dt in document_topics]
