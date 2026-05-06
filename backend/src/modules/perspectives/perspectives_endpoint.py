from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from weaviate import WeaviateClient

from common.crud_enum import Crud
from common.dependencies import get_current_user, get_db_session, get_weaviate_session
from core.auth.authz_user import AuthzUser
from modules.perspectives.aspect.aspect_dto import (
    AspectCreate,
    AspectRead,
    AspectUpdate,
)
from modules.perspectives.cluster.cluster_dto import (
    ClusterRead,
    ClusterUpdate,
)
from modules.perspectives.history.history_dto import PerspectivesHistoryRead
from modules.perspectives.perspectives_job_dto import (
    PerspectivesJobParamsNoCreate,
    PerspectivesJobRead,
)
from modules.perspectives.perspectives_service import PerspectivesService
from modules.perspectives.perspectives_vis_dto import (
    PerspectivesClusterSimilarities,
    PerspectivesVisualization,
)
from modules.search.sdoc_search.sdoc_search_columns import SdocColumns
from systems.search_system.filtering import Filter
from systems.search_system.sorting import Sort

router = APIRouter(
    prefix="/perspectives",
    dependencies=[Depends(get_current_user)],
    tags=["perspectives"],
)

ps = PerspectivesService()

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
    return ps.start_perspectives_job(
        db=db,
        aspect_id=aspect_id,
        job_params=perspectives_job_params,
    )


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
    job = ps.read_perspectives_job(job_id=perspectives_job_id)
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
    return ps.create_aspect(db=db, create_dto=aspect)


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
    return ps.read_project_aspects(db=db, project_id=proj_id)


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
    return ps.read_aspect(db=db, aspect_id=aspect_id)


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
    return ps.read_document_aspect_content(db=db, aspect_id=aspect_id, sdoc_id=sdoc_id)


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
    return ps.update_aspect(db=db, aspect_id=aspect_id, update_dto=aspect)


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
    return ps.delete_aspect(db=db, weaviate=weaviate, aspect_id=aspect_id)


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
    return ps.set_labels(
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
    return ps.set_labels(
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
    return ps.read_perspectives_visualization(
        db=db,
        aspect_id=aspect_id,
        search_query=search_query,
        filter=filter,
        sorts=sorts,
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
    return ps.read_perspectives_cluster_similarities(
        db=db,
        weaviate=weaviate,
        aspect_id=aspect_id,
    )


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
    return ps.read_clusters_by_sdoc(
        db=db,
        aspect_id=aspect_id,
        sdoc_id=sdoc_id,
    )


@router.patch(
    "/cluster/{cluster_id}/details",
    response_model=ClusterRead,
    summary="Updates the Cluster's name and description.",
)
def update_cluster_details(
    *,
    db: Session = Depends(get_db_session),
    cluster_id: int,
    cluster_update: ClusterUpdate,
    authz_user: AuthzUser = Depends(),
) -> ClusterRead:
    cluster = ps.read_cluster(
        db=db,
        cluster_id=cluster_id,
    )
    authz_user.assert_in_same_project_as(Crud.ASPECT, cluster.aspect_id)

    return ps.update_cluster(
        db=db,
        aspect_id=cluster.aspect_id,
        cluster_id=cluster_id,
        update_dto=cluster_update,
        is_user_edited=True,
    )


# --- START UNDO / REDO --- #


@router.post(
    "/history/redo/{aspect_id}",
    response_model=None,
    summary="Redoes the last undone operation for the given Aspect.",
)
def redo_perspectives_history(
    *,
    db: Session = Depends(get_db_session),
    weaviate: WeaviateClient = Depends(get_weaviate_session),
    aspect_id: int,
    authz_user: AuthzUser = Depends(),
) -> None:
    authz_user.assert_in_same_project_as(Crud.ASPECT, aspect_id)
    ps.redo_history(
        db=db,
        client=weaviate,
        aspect_id=aspect_id,
    )


@router.post(
    "/history/undo/{aspect_id}",
    response_model=None,
    summary="Undoes the last operation for the given Aspect.",
)
def undo_perspectives_history(
    *,
    db: Session = Depends(get_db_session),
    weaviate: WeaviateClient = Depends(get_weaviate_session),
    aspect_id: int,
    authz_user: AuthzUser = Depends(),
) -> None:
    authz_user.assert_in_same_project_as(Crud.ASPECT, aspect_id)
    ps.undo_history(
        db=db,
        client=weaviate,
        aspect_id=aspect_id,
    )


@router.get(
    "/history/list/{aspect_id}",
    response_model=list[PerspectivesHistoryRead],
    summary="Returns the list of history entries for the given Aspect.",
)
def list_perspectives_history(
    *,
    db: Session = Depends(get_db_session),
    aspect_id: int,
    authz_user: AuthzUser = Depends(),
) -> list[PerspectivesHistoryRead]:
    authz_user.assert_in_same_project_as(Crud.ASPECT, aspect_id)
    return ps.read_history(
        db=db,
        aspect_id=aspect_id,
    )
