import numpy as np
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from weaviate import WeaviateClient

from common.crud_enum import Crud
from common.dependencies import get_current_user, get_db_session, get_weaviate_session
from common.job_type import JobType
from core.auth.authz_user import AuthzUser
from core.project.project_crud import crud_project
from modules.perspectives.aspect_crud import crud_aspect
from modules.perspectives.aspect_dto import (
    AspectCreate,
    AspectRead,
    AspectUpdate,
    AspectUpdateIntern,
)
from modules.perspectives.aspect_embedding_crud import crud_aspect_embedding
from modules.perspectives.cluster_crud import crud_cluster
from modules.perspectives.cluster_dto import ClusterRead
from modules.perspectives.cluster_embedding_crud import crud_cluster_embedding
from modules.perspectives.cluster_embedding_dto import ClusterObjectIdentifier
from modules.perspectives.document_aspect_crud import crud_document_aspect
from modules.perspectives.document_cluster_crud import crud_document_cluster
from modules.perspectives.perspectives_job_dto import (
    CreateAspectParams,
    PerspectivesJobInput,
    PerspectivesJobParamsNoCreate,
    PerspectivesJobRead,
)
from modules.perspectives.perspectives_vis_dto import (
    PerspectivesClusterSimilarities,
    PerspectivesDoc,
    PerspectivesVisualization,
)
from modules.search.sdoc_search.sdoc_search import find_sdoc_ids
from modules.search.sdoc_search.sdoc_search_columns import SdocColumns
from systems.job_system.job_dto import RUNNING_JOB_STATUS, JobStatus
from systems.job_system.job_service import JobService
from systems.search_system.filtering import Filter
from systems.search_system.sorting import Sort

router = APIRouter(
    prefix="/perspectives",
    dependencies=[Depends(get_current_user)],
    tags=["perspectives"],
)

# --- START JOBS --- #

js = JobService()


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
        most_recent_job = js.get_job(aspect.most_recent_job_id)
        if (
            most_recent_job
            and JobStatus(most_recent_job.get_status()) in RUNNING_JOB_STATUS
        ):
            raise Exception(
                f"PerspectivesJob {most_recent_job.get_id()} is still running. Please wait until it is finished."
            )

    # No job running, so we can start a new one
    job = js.start_job(
        JobType.PERSPECTIVES,
        payload=PerspectivesJobInput(
            project_id=aspect.project_id,
            aspect_id=aspect_id,
            perspectives_job_type=perspectives_job_params.perspectives_job_type,
            parameters=perspectives_job_params,
        ),
    )

    # Update the aspect with the new job ID
    crud_aspect.update(
        db=db,
        id=aspect.id,
        update_dto=AspectUpdateIntern(
            most_recent_job_id=job.get_id(),
        ),
    )

    return PerspectivesJobRead.from_rq_job(job)


@router.get(
    "/job/{perspectives_job_id}",
    response_model=PerspectivesJobRead,
    summary="Returns the PerspectivesJob for the given ID if it exists",
)
def get_perspectives_job(
    *,
    perspectives_job_id: str,
    authz_user: AuthzUser = Depends(),
) -> PerspectivesJobRead:
    job = js.get_job(perspectives_job_id)
    authz_user.assert_in_project(job.get_project_id())
    return PerspectivesJobRead.from_rq_job(job=job)


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

    params = CreateAspectParams()
    job = js.start_job(
        JobType.PERSPECTIVES,
        payload=PerspectivesJobInput(
            project_id=aspect.project_id,
            aspect_id=db_aspect.id,
            perspectives_job_type=params.perspectives_job_type,
            parameters=params,
        ),
    )

    db_aspect = crud_aspect.update(
        db=db,
        id=db_aspect.id,
        update_dto=AspectUpdateIntern(
            most_recent_job_id=job.get_id(),
        ),
    )

    return AspectRead.model_validate(db_aspect)


@router.get(
    "/project/{proj_id}/aspects",
    response_model=list[AspectRead],
    summary="Returns all Aspects of the Project with the given ID if it exists",
)
def get_all_aspects(
    *,
    db: Session = Depends(get_db_session),
    proj_id: int,
    authz_user: AuthzUser = Depends(),
) -> list[AspectRead]:
    authz_user.assert_in_project(proj_id)

    project = crud_project.read(db=db, id=proj_id)
    aspects = [AspectRead.model_validate(a) for a in project.aspects]
    return aspects


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

    crud_cluster_embedding.delete_embeddings_by_aspect(
        client=weaviate, project_id=aspect.project_id, aspect_id=aspect_id
    )
    crud_aspect_embedding.delete_embeddings_by_aspect(
        client=weaviate, project_id=aspect.project_id, aspect_id=aspect_id
    )
    db_obj = crud_aspect.delete(db=db, id=aspect_id)
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
    sorts: list[Sort[SdocColumns]],
    authz_user: AuthzUser = Depends(),
) -> PerspectivesVisualization:
    authz_user.assert_in_same_project_as(Crud.ASPECT, aspect_id)

    # Fetch data for visualization
    aspect = crud_aspect.read(db=db, id=aspect_id)
    document_aspects = aspect.document_aspects

    # If a job is in progress, return early with empty visualization
    if aspect.most_recent_job_id:
        most_recent_job = js.get_job(aspect.most_recent_job_id)
        if (
            most_recent_job
            and JobStatus(most_recent_job.get_status()) != JobStatus.FINISHED
        ):
            return PerspectivesVisualization(
                aspect_id=aspect.id,
                clusters=[],
                docs=[],
            )

    # Color by
    clusters = aspect.clusters
    document_clusters = crud_document_cluster.read_by_aspect_id(
        db=db, aspect_id=aspect_id
    )
    sdoc_id2dc = {dc.sdoc_id: dc for dc in document_clusters}
    cluster_id2cluster = {c.id: c for c in clusters}
    assert len(document_aspects) == len(document_clusters), (
        "The number of DocumentAspects and DocumentClusters must match for visualization."
    )

    # Search documents
    sdoc_id_in_search_result: dict[int, bool]
    if len(filter.items) > 0 or search_query.strip() != "":
        hits = find_sdoc_ids(
            db=db,
            project_id=aspect.project_id,
            folder_id=None,
            search_query=search_query,
            expert_mode=False,
            highlight=False,
            filter=filter,
            sorts=sorts,
            page_number=None,
            page_size=None,
        )
        sdoc_id_in_search_result: dict[int, bool] = {hit.id: True for hit in hits.hits}
        docs: list[PerspectivesDoc] = []
        for doc in document_aspects:
            dc = sdoc_id2dc[doc.sdoc_id]
            cluster_id2cluster[dc.cluster_id]
            docs.append(
                PerspectivesDoc(
                    sdoc_id=doc.sdoc_id,
                    cluster_id=dc.cluster_id,
                    is_accepted=dc.is_accepted,
                    in_searchresult=sdoc_id_in_search_result.get(doc.sdoc_id, False),
                    is_outlier=cluster_id2cluster[dc.cluster_id].is_outlier,
                    x=doc.x,
                    y=doc.y,
                )
            )
    else:
        docs: list[PerspectivesDoc] = []
        for doc in document_aspects:
            dc = sdoc_id2dc[doc.sdoc_id]
            cluster_id2cluster[dc.cluster_id]
            docs.append(
                PerspectivesDoc(
                    sdoc_id=doc.sdoc_id,
                    cluster_id=dc.cluster_id,
                    is_accepted=dc.is_accepted,
                    in_searchresult=True,
                    is_outlier=cluster_id2cluster[dc.cluster_id].is_outlier,
                    x=doc.x,
                    y=doc.y,
                )
            )

    filtered_clusters = [
        cluster
        for cluster in clusters
        if cluster.x is not None
        and cluster.y is not None
        and not np.isnan(cluster.x)
        and not np.isinf(cluster.x)
        and not np.isnan(cluster.y)
        and not np.isinf(cluster.y)
    ]

    print(
        f"Filtered {len(filtered_clusters)} clusters from {len(clusters)} total clusters."
    )

    # sort the clusters by their ID
    filtered_clusters.sort(key=lambda c: c.id)

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
    clusters.sort(key=lambda c: c.id)

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
    return [ClusterRead.model_validate(dc) for dc in document_clusters]
