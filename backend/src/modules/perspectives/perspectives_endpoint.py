import numpy as np
from fastapi import Depends
from sqlalchemy.orm import Session
from weaviate import WeaviateClient

from common.dats_event import DATSEvent
from common.dependencies import DBSession, get_weaviate_client
from common.project_router import project_router
from core.search.sdoc_search.sdoc_search import find_sdoc_ids
from core.search.sdoc_search.sdoc_search_columns import SdocColumns
from modules.perspectives.aspect_crud import crud_aspect
from modules.perspectives.aspect_dto import (
    AspectCreate,
    AspectRead,
    AspectUpdate,
    AspectUpdateIntern,
)
from modules.perspectives.aspect_embedding_crud import crud_aspect_embedding
from modules.perspectives.aspect_orm import AspectORM
from modules.perspectives.cluster_crud import crud_cluster
from modules.perspectives.cluster_dto import (
    ClusterRead,
    ClusterUpdate,
    ClusterUpdateIntern,
)
from modules.perspectives.cluster_embedding_crud import crud_cluster_embedding
from modules.perspectives.cluster_embedding_dto import ClusterObjectIdentifier
from modules.perspectives.document_aspect_crud import crud_document_aspect
from modules.perspectives.document_cluster_crud import crud_document_cluster
from modules.perspectives.perspectives_enum import PerspectivesJobType
from modules.perspectives.perspectives_exceptions import (
    PerspectivesDataIncompleteError,
)
from modules.perspectives.perspectives_file_crud import (
    MAP_THUMBNAIL_FILENAME,
    crud_perspectives_plot_file,
)
from modules.perspectives.perspectives_job_dto import (
    CreateAspectParams,
    PerspectivesJobInput,
)
from modules.perspectives.perspectives_vis_dto import (
    LabelDocumentsRequest,
    PerspectivesClusterSimilarities,
    PerspectivesDoc,
    PerspectivesVisualization,
    VisualizationRequest,
)
from repos.filesystem.file_crud_base import FileCRUDBase
from systems.job_system.job_service import JobService
from systems.job_system.job_system_enum import JobStatus
from systems.search_system.filtering import Filter
from systems.search_system.sorting import Sort
from systems.websocket_system.websocket_dependency import WebsocketEmitter

router = project_router("/perspectives", tags=["perspectives"])

js = JobService()


# --- create operations


@router.put(
    "/aspects",
    response_model=AspectRead,
    summary="Creates a new Aspect",
)
def create(
    *,
    db: DBSession,
    project_id: int,
    aspect: AspectCreate,
    ws: WebsocketEmitter = Depends(),
) -> AspectRead:
    db_aspect = crud_aspect.create(db=db, project_id=project_id, create_dto=aspect)

    params = CreateAspectParams(perspectives_job_type=PerspectivesJobType.CREATE_ASPECT)
    job = js.start_job(
        "perspectives",
        payload=PerspectivesJobInput(
            project_id=project_id,
            aspect_id=db_aspect.id,
            perspectives_job_type=params.perspectives_job_type,
            parameters=params,
        ),
    )

    db_aspect = crud_aspect.update(
        db=db,
        project_id=project_id,
        id=db_aspect.id,
        update_dto=AspectUpdateIntern(
            most_recent_job_id=job.get_id(),
        ),
    )

    result = AspectRead.model_validate(db_aspect)
    ws.emit_to_project(DATSEvent.ASPECT_CREATED, result, project_id=project_id)
    return result


# --- read operations


@router.get(
    "/aspects",
    response_model=list[AspectRead],
    summary="Returns all Aspects of the Project",
)
def get_by_project(
    *,
    db: DBSession,
    project_id: int,
) -> list[AspectRead]:
    db_objs = crud_aspect.read_by_project(db=db, project_id=project_id)
    return [AspectRead.model_validate(db_obj) for db_obj in db_objs]


@router.get(
    "/aspects/{aspect_id}",
    response_model=AspectRead,
    summary="Returns the Aspect with the given ID.",
)
def get_by_id(
    *,
    db: DBSession,
    project_id: int,
    aspect_id: int,
) -> AspectRead:
    db_obj = crud_aspect.read(db=db, project_id=project_id, id=aspect_id)
    return AspectRead.model_validate(db_obj)


@router.get(
    "/aspects/{aspect_id}/map-thumbnail-url",
    response_model=str | None,
    summary="Returns the URL of the map thumbnail of the Aspect (relative to /content/), None until it is computed.",
)
def get_map_thumbnail_url(
    *,
    db: DBSession,
    project_id: int,
    aspect_id: int,
) -> str | None:
    crud_aspect.exists(db=db, project_id=project_id, id=aspect_id, raise_error=True)
    if not crud_perspectives_plot_file.exists(
        project_id=project_id, id=aspect_id, name=MAP_THUMBNAIL_FILENAME
    ):
        return None
    return crud_perspectives_plot_file.url(
        project_id=project_id, id=aspect_id, name=MAP_THUMBNAIL_FILENAME
    )


@router.get(
    "/aspects/{aspect_id}/source-documents/{sdoc_id}",
    response_model=str,
    summary="Returns the Document Aspect Content for the given IDs.",
)
def get_docaspect_by_id(
    *,
    db: DBSession,
    project_id: int,
    aspect_id: int,
    sdoc_id: int,
) -> str:
    crud_aspect.exists(db=db, project_id=project_id, id=aspect_id, raise_error=True)
    db_obj = crud_document_aspect.read(db=db, id=(project_id, sdoc_id, aspect_id))
    return db_obj.content


@router.get(
    "/aspects/{aspect_id}/clusters",
    response_model=list[ClusterRead],
    summary="Returns the clusters for the given SourceDocument (sdoc_id) in the specified Aspect (aspect_id).",
)
def get_clusters(
    *,
    db: DBSession,
    project_id: int,
    aspect_id: int,
    sdoc_id: int,
) -> list[ClusterRead]:
    crud_aspect.exists(db=db, project_id=project_id, id=aspect_id, raise_error=True)
    document_clusters = crud_cluster.read_by_aspect_and_sdoc(
        db=db, project_id=project_id, aspect_id=aspect_id, sdoc_id=sdoc_id
    )
    return [ClusterRead.model_validate(dc) for dc in document_clusters]


# --- update operations


@router.patch(
    "/aspects/{aspect_id}",
    response_model=AspectRead,
    summary="Updates the Aspect with the given ID.",
)
def update_by_id(
    *,
    db: DBSession,
    project_id: int,
    aspect_id: int,
    aspect: AspectUpdate,
    ws: WebsocketEmitter = Depends(),
) -> AspectRead:
    db_obj = crud_aspect.update(
        db=db,
        project_id=project_id,
        id=aspect_id,
        update_dto=AspectUpdateIntern(**aspect.model_dump()),
    )
    result = AspectRead.model_validate(db_obj)
    ws.emit_to_project(DATSEvent.ASPECT_UPDATED, result, project_id=project_id)
    return result


@router.patch(
    "/aspects/{aspect_id}/clusters/{cluster_id}",
    response_model=ClusterRead,
    summary="Updates the Cluster's name and description.",
)
def update_cluster(
    *,
    db: DBSession,
    project_id: int,
    aspect_id: int,
    cluster_id: int,
    cluster_update: ClusterUpdate,
    ws: WebsocketEmitter = Depends(),
) -> ClusterRead:
    crud_cluster.read_by_aspect(
        db=db, project_id=project_id, aspect_id=aspect_id, id=cluster_id
    )
    update_dto = ClusterUpdateIntern(
        **cluster_update.model_dump(exclude_unset=True), is_user_edited=True
    )
    updated_cluster = crud_cluster.update(
        db=db,
        project_id=project_id,
        id=cluster_id,
        update_dto=update_dto,
    )
    result = ClusterRead.model_validate(updated_cluster)
    ws.emit_to_project(DATSEvent.CLUSTER_UPDATED, result, project_id=project_id)
    return result


# --- delete operations


@router.delete(
    "/aspects/{aspect_id}",
    response_model=AspectRead,
    summary="Removes the Aspect with the given ID.",
)
def delete_by_id(
    *,
    db: DBSession,
    weaviate: WeaviateClient = Depends(get_weaviate_client),
    project_id: int,
    aspect_id: int,
    ws: WebsocketEmitter = Depends(),
) -> AspectRead:
    crud_aspect.exists(db=db, project_id=project_id, id=aspect_id, raise_error=True)
    crud_cluster_embedding.delete_by_aspect_id(
        client=weaviate, project_id=project_id, aspect_id=aspect_id
    )
    crud_aspect_embedding.delete_by_aspect_id(
        client=weaviate, project_id=project_id, aspect_id=aspect_id
    )
    db_obj = crud_aspect.delete(db=db, project_id=project_id, id=aspect_id)
    result = AspectRead.model_validate(db_obj)
    FileCRUDBase.delete_by_owner(AspectORM, project_id=project_id, ids=[aspect_id])
    ws.emit_to_project(DATSEvent.ASPECT_DELETED, result, project_id=project_id)
    return result


# --- other operations


def _build_document_visualization(
    *,
    db: Session,
    project_id: int,
    aspect_id: int,
    search_query: str,
    filter: Filter[SdocColumns],
    sorts: list[Sort[SdocColumns]],
) -> PerspectivesVisualization:
    """Build the document visualization for the given aspect."""
    # Fetch data for visualization
    aspect = crud_aspect.read(db=db, project_id=project_id, id=aspect_id)
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
        db=db, project_id=project_id, aspect_id=aspect_id
    )
    sdoc_id2dc = {dc.sdoc_id: dc for dc in document_clusters}
    cluster_id2cluster = {c.id: c for c in clusters}
    if len(document_aspects) != len(document_clusters):
        raise PerspectivesDataIncompleteError(
            aspect_id=aspect_id,
            reason="the documents and their clusters differ in number",
        )

    # Search documents
    sdoc_id_in_search_result: dict[int, bool]
    if len(filter.items) > 0 or search_query.strip() != "":
        hits = find_sdoc_ids(
            db=db,
            project_id=project_id,
            folder_id=None,
            search_query=search_query,
            expert_mode=False,
            highlight=False,
            filter=filter,
            sorts=sorts,
            page_number=None,
            page_size=None,
        )
        sdoc_id_in_search_result = {hit.id: True for hit in hits.hits}
        docs: list[PerspectivesDoc] = []
        for doc in document_aspects:
            dc = sdoc_id2dc[doc.sdoc_id]
            if doc.x is None or doc.y is None:
                raise PerspectivesDataIncompleteError(
                    aspect_id=aspect_id,
                    reason=f"document {doc.sdoc_id} has no coordinates",
                )
            docs.append(
                PerspectivesDoc(
                    sdoc_id=doc.sdoc_id,
                    cluster_id=dc.cluster_id,
                    is_accepted=dc.is_accepted,
                    in_search_result=sdoc_id_in_search_result.get(doc.sdoc_id, False),
                    is_outlier=cluster_id2cluster[dc.cluster_id].is_outlier,
                    x=doc.x,
                    y=doc.y,
                )
            )
    else:
        docs = []
        for doc in document_aspects:
            dc = sdoc_id2dc[doc.sdoc_id]
            if doc.x is None or doc.y is None:
                raise PerspectivesDataIncompleteError(
                    aspect_id=aspect_id,
                    reason=f"document {doc.sdoc_id} has no coordinates",
                )
            docs.append(
                PerspectivesDoc(
                    sdoc_id=doc.sdoc_id,
                    cluster_id=dc.cluster_id,
                    is_accepted=dc.is_accepted,
                    in_search_result=True,
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

    # sort the clusters by their ID
    filtered_clusters.sort(key=lambda c: c.id)

    return PerspectivesVisualization(
        aspect_id=aspect.id,
        clusters=[ClusterRead.model_validate(t) for t in filtered_clusters],
        docs=docs,
    )


@router.post(
    "/aspects/{aspect_id}/visualization",
    response_model=PerspectivesVisualization,
    summary="Returns data for visualizing the documents of the given aspect.",
)
def compute_visualization(
    *,
    db: DBSession,
    project_id: int,
    aspect_id: int,
    request: VisualizationRequest,
) -> PerspectivesVisualization:
    return _build_document_visualization(
        db=db,
        project_id=project_id,
        aspect_id=aspect_id,
        search_query=request.search_query,
        filter=request.filter,
        sorts=request.sorts,
    )


@router.patch(
    "/aspects/{aspect_id}/accept-labels",
    response_model=PerspectivesVisualization,
    summary="Accept the label of the provided SourceDocuments (by ID) and return the updated visualization.",
)
def accept_labels(
    *,
    db: DBSession,
    project_id: int,
    aspect_id: int,
    request: LabelDocumentsRequest,
) -> PerspectivesVisualization:
    crud_aspect.exists(db=db, project_id=project_id, id=aspect_id, raise_error=True)
    crud_document_cluster.set_labels(
        db=db,
        project_id=project_id,
        aspect_id=aspect_id,
        sdoc_ids=request.sdoc_ids,
        is_accepted=True,
    )

    result = _build_document_visualization(
        db=db,
        project_id=project_id,
        aspect_id=aspect_id,
        search_query=request.search_query,
        filter=request.filter,
        sorts=request.sorts,
    )
    return result


@router.patch(
    "/aspects/{aspect_id}/revert-labels",
    response_model=PerspectivesVisualization,
    summary="Reverts the label of the provided SourceDocuments (by ID) and return the updated visualization.",
)
def revert_labels(
    *,
    db: DBSession,
    project_id: int,
    aspect_id: int,
    request: LabelDocumentsRequest,
) -> PerspectivesVisualization:
    crud_aspect.exists(db=db, project_id=project_id, id=aspect_id, raise_error=True)
    crud_document_cluster.set_labels(
        db=db,
        project_id=project_id,
        aspect_id=aspect_id,
        sdoc_ids=request.sdoc_ids,
        is_accepted=False,
    )

    result = _build_document_visualization(
        db=db,
        project_id=project_id,
        aspect_id=aspect_id,
        search_query=request.search_query,
        filter=request.filter,
        sorts=request.sorts,
    )
    return result


@router.get(
    "/aspects/{aspect_id}/cluster-similarities",
    response_model=PerspectivesClusterSimilarities,
    summary="Returns data for visualizing the cluster similarities of the given aspect.",
)
def get_cluster_similarities(
    *,
    db: DBSession,
    weaviate: WeaviateClient = Depends(get_weaviate_client),
    project_id: int,
    aspect_id: int,
) -> PerspectivesClusterSimilarities:
    # Fetch the clusters for the given Aspect
    aspect = crud_aspect.read(db=db, project_id=project_id, id=aspect_id)
    clusters = aspect.clusters
    clusters.sort(key=lambda c: c.id)

    if len(clusters) == 0:
        return PerspectivesClusterSimilarities(
            aspect_id=aspect_id,
            clusters=[],
            similarities=[],
        )

    # Fetch the cluster embeddings
    cluster_embeddings = crud_cluster_embedding.read_by_ids(
        client=weaviate,
        project_id=project_id,
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
