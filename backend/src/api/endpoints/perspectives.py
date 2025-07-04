from typing import Dict, List

import numpy as np
from app.celery.background_jobs import prepare_and_start_perspectives_job_async
from app.core.authorization.authz_user import AuthzUser
from app.core.data.crud import Crud
from app.core.data.crud.aspect import crud_aspect
from app.core.data.crud.cluster import crud_cluster
from app.core.data.crud.document_aspect import crud_document_aspect
from app.core.data.crud.document_cluster import crud_document_cluster
from app.core.data.dto.aspect import (
    AspectCreate,
    AspectRead,
    AspectUpdate,
    AspectUpdateIntern,
)
from app.core.data.dto.background_job_base import BackgroundJobStatus
from app.core.data.dto.cluster import ClusterRead
from app.core.data.dto.perspectives_vis import (
    PerspectivesClusterSimilarities,
    PerspectivesDoc,
    PerspectivesVisualization,
)
from app.core.perspectives.perspectives_job import (
    CreateAspectParams,
    PerspectivesJobParamsNoCreate,
    PerspectivesJobRead,
)
from app.core.perspectives.perspectives_job_service import PerspectivesJobService
from app.core.search.filtering import Filter
from app.core.search.sdoc_search import sdoc_search
from app.core.search.sdoc_search.sdoc_search_columns import SdocColumns
from app.core.search.sorting import Sort
from app.core.vector.crud.aspect_embedding import crud_aspect_embedding
from app.core.vector.crud.cluster_embedding import crud_cluster_embedding
from app.core.vector.dto.cluster_embedding import ClusterObjectIdentifier
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from weaviate import WeaviateClient

from api.dependencies import get_current_user, get_db_session, get_weaviate_session

pmjs = PerspectivesJobService()

router = APIRouter(
    prefix="/perspectives",
    dependencies=[Depends(get_current_user)],
    tags=["perspectives"],
)

# --- START JOBS --- #


@router.post(
    "/job/{aspect_id}",
    response_model=PerspectivesJobRead,
    summary="Starts the PerspectivesJob for the given Parameters. If a job is already running, this will raise an error.",
)
def start_perspectives_job(
    *,
    db: Session = Depends(get_db_session),
    aspect_id: int,
    perspectives_job_params: PerspectivesJobParamsNoCreate,
    authz_user: AuthzUser = Depends(),
) -> PerspectivesJobRead:
    authz_user.assert_in_same_project_as(Crud.ASPECT, aspect_id)

    aspect = crud_aspect.read(db=db, id=aspect_id)

    # Check if there is a job running already for this aspect
    if aspect.most_recent_job_id:
        most_recent_job = pmjs.get_perspectives_job(aspect.most_recent_job_id)
        if most_recent_job and most_recent_job.status not in [
            BackgroundJobStatus.ABORTED,
            BackgroundJobStatus.ERROR,
            BackgroundJobStatus.FINISHED,
        ]:
            raise Exception(
                f"PerspectivesJob {most_recent_job.id} is still running. Please wait until it is finished."
            )

    # No job running, so we can start a new one
    perspectives_job = prepare_and_start_perspectives_job_async(
        project_id=aspect.project_id,
        aspect_id=aspect_id,
        perspectives_job_params=perspectives_job_params,
    )

    # Update the aspect with the new job ID
    crud_aspect.update(
        db=db,
        id=aspect.id,
        update_dto=AspectUpdateIntern(
            most_recent_job_id=perspectives_job.id,
        ),
    )

    return perspectives_job


@router.get(
    "/job/{perspectives_job_id}",
    response_model=PerspectivesJobRead,
    summary="Returns the PerspectivesJob for the given ID if it exists",
)
def get_perspectives_job(
    *,
    db: Session = Depends(get_db_session),
    perspectives_job_id: str,
    authz_user: AuthzUser = Depends(),
) -> PerspectivesJobRead:
    job = pmjs.get_perspectives_job(perspectives_job_id)
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
    perspectives_job = prepare_and_start_perspectives_job_async(
        project_id=aspect.project_id,
        aspect_id=db_aspect.id,
        perspectives_job_params=CreateAspectParams(),
    )
    db_aspect = crud_aspect.update(
        db=db,
        id=db_aspect.id,
        update_dto=AspectUpdateIntern(
            most_recent_job_id=perspectives_job.id,
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


@router.get(
    "/aspect/{aspect_id}/sdoc/{sdoc_id}",
    response_model=str,
    summary="Returns the Document Aspect Content for the given IDs.",
)
def get_docaspect_by_id(
    *,
    db: Session = Depends(get_db_session),
    aspect_id: int,
    sdoc_id: int,
    authz_user: AuthzUser = Depends(),
) -> str:
    authz_user.assert_in_same_project_as(Crud.ASPECT, aspect_id)

    db_obj = crud_document_aspect.read(id=(sdoc_id, aspect_id), db=db)
    return db_obj.content


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
    weaviate: WeaviateClient = Depends(get_weaviate_session),
    aspect_id: int,
    authz_user: AuthzUser = Depends(),
) -> AspectRead:
    authz_user.assert_in_same_project_as(Crud.ASPECT, aspect_id)

    aspect = crud_aspect.read(db=db, id=aspect_id)

    crud_cluster_embedding.remove_embeddings_by_aspect(
        client=weaviate, project_id=aspect.project_id, aspect_id=aspect_id
    )
    crud_aspect_embedding.remove_embeddings_by_aspect(
        client=weaviate, project_id=aspect.project_id, aspect_id=aspect_id
    )
    db_obj = crud_aspect.remove(db=db, id=aspect_id)
    return AspectRead.model_validate(db_obj)


# --- START LABELING --- #


@router.post(
    "/label_accept/{aspect_id}",
    response_model=int,
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
    return crud_document_cluster.set_labels(
        db=db,
        aspect_id=aspect_id,
        sdoc_ids=sdoc_ids,
        is_accepted=True,
    )


@router.post(
    "/label_revert/{aspect_id}",
    response_model=int,
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
    return crud_document_cluster.set_labels(
        db=db,
        aspect_id=aspect_id,
        sdoc_ids=sdoc_ids,
        is_accepted=False,
    )


# --- START VISUALIZATIONS --- #


@router.post(
    "/visualize_documents/{aspect_id}",
    response_model=PerspectivesVisualization,
    summary="Returns data for visualizing the documents of the given aspect.",
)
def visualize_documents(
    *,
    db: Session = Depends(get_db_session),
    aspect_id: int,
    search_query: str,
    filter: Filter[SdocColumns],
    sorts: List[Sort[SdocColumns]],
    authz_user: AuthzUser = Depends(),
) -> PerspectivesVisualization:
    authz_user.assert_in_same_project_as(Crud.ASPECT, aspect_id)

    # Fetch data for visualization
    aspect = crud_aspect.read(db=db, id=aspect_id)
    document_aspects = aspect.document_aspects

    # If a job is in progress, return early with empty visualization
    if aspect.most_recent_job_id:
        most_recent_job = pmjs.get_perspectives_job(aspect.most_recent_job_id)
        if most_recent_job and most_recent_job.status != BackgroundJobStatus.FINISHED:
            return PerspectivesVisualization(
                aspect_id=aspect.id,
                clusters=[],
                docs=[],
            )

    # Color by
    clusters = aspect.clusters
    document_clusters = crud_document_cluster.read_by_aspect(db=db, aspect_id=aspect_id)
    sdoc_id2dt = {dt.sdoc_id: dt for dt in document_clusters}
    cluster_id2cluster = {t.id: t for t in clusters}
    assert (
        len(document_aspects) == len(document_clusters)
    ), "The number of DocumentAspects and DocumentClusters must match for visualization."

    # Search documents
    sdoc_id_in_search_result: Dict[int, bool]
    if len(filter.items) > 0 or search_query.strip() != "":
        hits = sdoc_search.search_ids(
            search_query=search_query,
            expert_mode=False,
            highlight=False,
            project_id=aspect.project_id,
            filter=filter,
            sorts=sorts,
            page_number=None,
            page_size=None,
        )
        sdoc_id_in_search_result: Dict[int, bool] = {hit.id: True for hit in hits.hits}
        docs: List[PerspectivesDoc] = []
        for doc in document_aspects:
            dt = sdoc_id2dt[doc.sdoc_id]
            cluster_id2cluster[dt.cluster_id]
            docs.append(
                PerspectivesDoc(
                    sdoc_id=doc.sdoc_id,
                    cluster_id=dt.cluster_id,
                    is_accepted=dt.is_accepted,
                    in_searchresult=sdoc_id_in_search_result.get(doc.sdoc_id, False),
                    is_outlier=cluster_id2cluster[dt.cluster_id].is_outlier,
                    x=doc.x,
                    y=doc.y,
                )
            )
    else:
        docs: List[PerspectivesDoc] = []
        for doc in document_aspects:
            dt = sdoc_id2dt[doc.sdoc_id]
            cluster_id2cluster[dt.cluster_id]
            docs.append(
                PerspectivesDoc(
                    sdoc_id=doc.sdoc_id,
                    cluster_id=dt.cluster_id,
                    is_accepted=dt.is_accepted,
                    in_searchresult=True,
                    is_outlier=cluster_id2cluster[dt.cluster_id].is_outlier,
                    x=doc.x,
                    y=doc.y,
                )
            )

    filtered_clusters = [
        cluster
        for cluster in clusters
        if not np.isnan(cluster.x)
        and not np.isinf(cluster.x)
        and not np.isnan(cluster.y)
        and not np.isinf(cluster.y)
    ]

    print(
        f"Filtered {len(filtered_clusters)} clusters from {len(clusters)} total clusters."
    )

    return PerspectivesVisualization(
        aspect_id=aspect.id,
        clusters=[ClusterRead.model_validate(t) for t in filtered_clusters],
        docs=docs,
    )


@router.get(
    "/cluster_similarities/{aspect_id}",
    response_model=PerspectivesClusterSimilarities,
    summary="Returns data for visualizing the cluster similarities of the given aspect.",
)
def get_cluster_similarities(
    *,
    db: Session = Depends(get_db_session),
    weaviate: WeaviateClient = Depends(get_weaviate_session),
    aspect_id: int,
    authz_user: AuthzUser = Depends(),
) -> PerspectivesClusterSimilarities:
    authz_user.assert_in_same_project_as(Crud.ASPECT, aspect_id)

    # Fetch the clusters for the given Aspect
    aspect = crud_aspect.read(db=db, id=aspect_id)
    clusters = aspect.clusters

    if len(clusters) == 0:
        return PerspectivesClusterSimilarities(
            aspect_id=aspect_id,
            clusters=[],
            similarities=[],
        )

    # Fetch the cluster embeddings
    cluster_embeddings = crud_cluster_embedding.get_embeddings(
        client=weaviate,
        project_id=aspect.project_id,
        ids=[
            ClusterObjectIdentifier(
                aspect_id=aspect_id,
                cluster_id=cluster.id,
            )
            for cluster in clusters
        ],
    )

    # Compute similarities
    t_arr = np.array(cluster_embeddings)
    similarities = np.dot(t_arr, t_arr.T).tolist()

    return PerspectivesClusterSimilarities(
        aspect_id=aspect_id,
        clusters=[ClusterRead.model_validate(t) for t in clusters],
        similarities=similarities,
    )


@router.get(
    "/visualize_clusters/{aspect_id}",
    response_model=AspectRead,
    summary="Returns data for visualizing the clusters of the given aspect.",
)
def visualize_clusters(
    *,
    db: Session = Depends(get_db_session),
    aspect_id: int,
    authz_user: AuthzUser = Depends(),
) -> AspectRead:
    authz_user.assert_in_same_project_as(Crud.ASPECT, aspect_id)

    # TODO: implement
    raise NotImplementedError("visualize_clusters not implemented yet")


@router.get(
    "/clusters/{aspect_id}/sdoc/{sdoc_id}",
    response_model=list[ClusterRead],
    summary="Returns the clusters for the given SourceDocument (sdoc_id) in the specified Aspect (aspect_id).",
)
def get_clusters_for_sdoc(
    *,
    db: Session = Depends(get_db_session),
    aspect_id: int,
    sdoc_id: int,
    authz_user: AuthzUser = Depends(),
) -> list[ClusterRead]:
    authz_user.assert_in_same_project_as(Crud.ASPECT, aspect_id)

    # Fetch the clusters for the given SourceDocument
    document_clusters = crud_cluster.read_by_aspect_and_sdoc(
        db=db, aspect_id=aspect_id, sdoc_id=sdoc_id
    )
    return [ClusterRead.model_validate(dt) for dt in document_clusters]
