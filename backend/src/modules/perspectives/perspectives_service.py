import numpy as np
from sqlalchemy.orm import Session
from weaviate import WeaviateClient

from common.job_type import JobType
from common.singleton_meta import SingletonMeta
from core.project.project_crud import crud_project
from modules.perspectives.aspect.aspect_crud import crud_aspect
from modules.perspectives.aspect.aspect_dto import (
    AspectCreate,
    AspectRead,
    AspectUpdate,
    AspectUpdateIntern,
)
from modules.perspectives.aspect.aspect_embedding_crud import crud_aspect_embedding
from modules.perspectives.cluster.cluster_crud import crud_cluster
from modules.perspectives.cluster.cluster_dto import (
    ClusterRead,
    ClusterUpdate,
    ClusterUpdateIntern,
)
from modules.perspectives.cluster.cluster_embedding_crud import crud_cluster_embedding
from modules.perspectives.cluster.cluster_embedding_dto import ClusterObjectIdentifier
from modules.perspectives.document_aspect.document_aspect_crud import (
    crud_document_aspect,
)
from modules.perspectives.document_cluster.document_cluster_crud import (
    crud_document_cluster,
)
from modules.perspectives.document_cluster.document_cluster_dto import (
    DocumentClusterUpdate,
)
from modules.perspectives.document_cluster.document_cluster_orm import (
    DocumentClusterORM,
)
from modules.perspectives.enum.perspectives_user_action import (
    PerspectivesUserAction,
)
from modules.perspectives.history.history_crud import crud_perspectives_history
from modules.perspectives.history.history_dto import PerspectivesHistoryRead
from modules.perspectives.perspectives_db_transaction import PerspectivesDBTransaction
from modules.perspectives.perspectives_history import PerspectivesHistory
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
from systems.job_system.job_dto import (
    RUNNING_JOB_STATUS,
    JobStatus,
)
from systems.job_system.job_service import JobService
from systems.search_system.filtering import Filter
from systems.search_system.sorting import Sort


class PerspectivesService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.js = JobService()
        return super(PerspectivesService, cls).__new__(cls)

    #########################
    ### CREATE OPERATIONS ###
    #########################

    def create_aspect(self, db: Session, create_dto: AspectCreate) -> AspectRead:
        """
        Creates a new Aspect and starts the initial Perspectives job for it.
        This operation is not undo/redoable, as it creates a new entity.
        """
        db_aspect = crud_aspect.create(db=db, create_dto=create_dto)

        params = CreateAspectParams()
        job = self.js.start_job(
            JobType.PERSPECTIVES,
            payload=PerspectivesJobInput(
                project_id=create_dto.project_id,
                aspect_id=db_aspect.id,
                perspectives_job_type=params.perspectives_job_type,
                parameters=params,
            ),
        )

        db_aspect = crud_aspect.update(
            db=db,
            id=db_aspect.id,
            update_dto=AspectUpdateIntern(most_recent_job_id=job.get_id()),
        )

        return AspectRead.model_validate(db_aspect)

    #######################
    ### READ OPERATIONS ###
    #######################

    def read_perspectives_job(self, job_id: str) -> PerspectivesJobRead:
        job = self.js.get_job(job_id)
        return PerspectivesJobRead.from_rq_job(job)

    def read_project_aspects(
        self,
        db: Session,
        project_id: int,
    ) -> list[AspectRead]:
        project = crud_project.read(db=db, id=project_id)
        aspects = [AspectRead.model_validate(a) for a in project.aspects]
        return aspects

    def read_aspect(
        self,
        db: Session,
        aspect_id: int,
    ) -> AspectRead:
        aspect = crud_aspect.read(db=db, id=aspect_id)
        return AspectRead.model_validate(aspect)

    def read_document_aspect_content(
        self,
        db: Session,
        aspect_id: int,
        sdoc_id: int,
    ) -> str:
        db_obj = crud_document_aspect.read(id=(sdoc_id, aspect_id), db=db)
        return db_obj.content

    def read_cluster(
        self,
        db: Session,
        cluster_id: int,
    ) -> ClusterRead:
        cluster = crud_cluster.read(db=db, id=cluster_id)
        return ClusterRead.model_validate(cluster)

    def read_clusters_by_sdoc(
        self,
        db: Session,
        aspect_id: int,
        sdoc_id: int,
    ) -> list[ClusterRead]:
        # Fetch the clusters for the given SourceDocument
        document_clusters = crud_cluster.read_by_aspect_and_sdoc(
            db=db, aspect_id=aspect_id, sdoc_id=sdoc_id
        )
        return [ClusterRead.model_validate(dc) for dc in document_clusters]

    def read_perspectives_visualization(
        self,
        db: Session,
        aspect_id: int,
        search_query: str,
        filter: Filter[SdocColumns],
        sorts: list[Sort[SdocColumns]],
    ):
        # Fetch data for visualization
        aspect = crud_aspect.read(db=db, id=aspect_id)
        document_aspects = aspect.document_aspects

        # If a job is in progress, return early with empty visualization
        if aspect.most_recent_job_id:
            most_recent_job = self.js.get_job(aspect.most_recent_job_id)
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
            sdoc_id_in_search_result: dict[int, bool] = {
                hit.id: True for hit in hits.hits
            }
            docs: list[PerspectivesDoc] = []
            for doc in document_aspects:
                dc = sdoc_id2dc[doc.sdoc_id]
                cluster_id2cluster[dc.cluster_id]
                docs.append(
                    PerspectivesDoc(
                        sdoc_id=doc.sdoc_id,
                        cluster_id=dc.cluster_id,
                        is_accepted=dc.is_accepted,
                        in_searchresult=sdoc_id_in_search_result.get(
                            doc.sdoc_id, False
                        ),
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

    def read_perspectives_cluster_similarities(
        self, db: Session, weaviate: WeaviateClient, aspect_id: int
    ) -> PerspectivesClusterSimilarities:
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

    #########################
    ### UPDATE OPERATIONS ###
    #########################

    def start_perspectives_job(
        self, db: Session, aspect_id: int, job_params: PerspectivesJobParamsNoCreate
    ) -> PerspectivesJobRead:
        """
        Starts a new Perspectives job for the given Aspect.
        This user action is undo/redoable!
        """
        aspect = crud_aspect.read(db=db, id=aspect_id)

        # Check if there is a job running already for this aspect
        if aspect.most_recent_job_id:
            most_recent_job = self.js.get_job(aspect.most_recent_job_id)
            if (
                most_recent_job
                and JobStatus(most_recent_job.get_status()) in RUNNING_JOB_STATUS
            ):
                raise Exception(
                    f"PerspectivesJob {most_recent_job.get_id()} is still running. Please wait until it is finished."
                )

        # No job running, so we can start a new one
        job = self.js.start_job(
            JobType.PERSPECTIVES,
            payload=PerspectivesJobInput(
                project_id=aspect.project_id,
                aspect_id=aspect_id,
                perspectives_job_type=job_params.perspectives_job_type,
                parameters=job_params,
            ),
        )

        crud_aspect.update(
            db=db,
            id=aspect_id,
            update_dto=AspectUpdateIntern(most_recent_job_id=job.get_id()),
        )

        return PerspectivesJobRead.from_rq_job(job)

    def update_aspect(
        self,
        db: Session,
        aspect_id: int,
        update_dto: AspectUpdate,
    ) -> AspectRead:
        """
        Updates the Aspect with the given ID.
        This user action is undo/redoable!
        """
        transaction = PerspectivesDBTransaction(
            db=db,
            aspect_id=aspect_id,
            perspective_action=PerspectivesUserAction.UPDATE_ASPECT,
        )
        try:
            db_obj = transaction.update_aspect(
                id=aspect_id, update_dto=AspectUpdateIntern(**update_dto.model_dump())
            )
            transaction.commit()
            return AspectRead.model_validate(db_obj)
        except Exception as e:
            transaction.rollback()
            raise e

    def update_cluster(
        self,
        db: Session,
        aspect_id: int,
        cluster_id: int,
        update_dto: ClusterUpdate,
        is_user_edited: bool,
    ) -> ClusterRead:
        """
        Updates the Cluster with the given ID.
        This user action is undo/redoable!
        """
        transaction = PerspectivesDBTransaction(
            db=db,
            aspect_id=aspect_id,
            perspective_action=PerspectivesUserAction.UPDATE_CLUSTER,
        )
        try:
            updated_clusters = transaction.update_clusters(
                ids=[cluster_id],
                update_dtos=[
                    ClusterUpdateIntern(
                        **update_dto.model_dump(exclude_unset=True),
                        is_user_edited=is_user_edited,
                    )
                ],
            )
            transaction.commit()
            return ClusterRead.model_validate(updated_clusters[0])
        except Exception as e:
            transaction.rollback()
            raise e

    def set_labels(
        self,
        db: Session,
        aspect_id: int,
        sdoc_ids: list[int],
        is_accepted: bool,
    ) -> int:
        """
        Sets the is_accepted label for the given SourceDocument IDs in the given Aspect.
        This user action is undo/redoable!
        """
        transaction = PerspectivesDBTransaction(
            db=db,
            aspect_id=aspect_id,
            perspective_action=PerspectivesUserAction.ACCEPT_LABELS
            if is_accepted
            else PerspectivesUserAction.REVERT_LABELS,
        )
        try:
            document_clusters = transaction.read_document_clusters_by_aspect(
                aspect_id=aspect_id
            )
            dc_map: dict[int, DocumentClusterORM] = {
                dc.sdoc_id: dc for dc in document_clusters
            }
            update_ids: list[tuple[int, int]] = []
            udpate_dtos: list[DocumentClusterUpdate] = []
            for sdoc_id in sdoc_ids:
                dc = dc_map.get(sdoc_id)
                if dc and dc.is_accepted != is_accepted:
                    update_ids.append((sdoc_id, dc.cluster_id))
                    udpate_dtos.append(
                        DocumentClusterUpdate(
                            is_accepted=is_accepted,
                        )
                    )
            updated_db_objs = transaction.update_document_clusters(
                ids=update_ids, update_dtos=udpate_dtos
            )
            transaction.commit()
            return len(updated_db_objs)
        except Exception as e:
            transaction.rollback()
            raise e

    #########################
    ### DELETE OPERATIONS ###
    #########################

    def delete_aspect(
        self, db: Session, weaviate: WeaviateClient, aspect_id: int
    ) -> AspectRead:
        """
        Deletes the Aspect with the given ID.
        This operation is not undo/redoable, as it deletes an entity.
        """
        aspect = crud_aspect.read(db=db, id=aspect_id)

        crud_cluster_embedding.delete_embeddings_by_aspect(
            client=weaviate, project_id=aspect.project_id, aspect_id=aspect_id
        )
        crud_aspect_embedding.delete_embeddings_by_aspect(
            client=weaviate, project_id=aspect.project_id, aspect_id=aspect_id
        )
        db_obj = crud_aspect.delete(db=db, id=aspect_id)
        return AspectRead.model_validate(db_obj)

    ############################
    ### UNDO/REDO OPERATIONS ###
    ############################

    def redo_history(self, db: Session, client: WeaviateClient, aspect_id: int):
        """Executes all redo operations in the redo stack."""

        # 1. get all history entries for the aspect
        history_entries = crud_perspectives_history.read_by_aspect(
            db=db, aspect_id=aspect_id
        )

        # 2. find the last undone history entry
        last_history_entry = None
        for entry in reversed(history_entries):
            if entry.is_undone:
                last_history_entry = entry
                break

        # 3. redo
        if last_history_entry is None:
            return  # nothing to redo

        history_entry = PerspectivesHistory.from_history_orm(db, last_history_entry)
        history_entry.redo(db=db, client=client)

    def undo_history(self, db: Session, client: WeaviateClient, aspect_id: int):
        """Executes all undo operations in the undo stack."""

        # 1. get all history entries for the aspect
        history_entries = crud_perspectives_history.read_by_aspect(
            db=db, aspect_id=aspect_id
        )

        # 2. find the last not undone history entry
        last_history_entry = None
        for entry in reversed(history_entries):
            if not entry.is_undone:
                last_history_entry = entry
                break

        # 3. undo
        if last_history_entry is None:
            return  # nothing to undo

        history_entry = PerspectivesHistory.from_history_orm(db, last_history_entry)
        history_entry.undo(db=db, client=client)

    def read_history(
        self, db: Session, aspect_id: int
    ) -> list[PerspectivesHistoryRead]:
        """Reads all history entries for the given aspect."""
        history_entries = crud_perspectives_history.read_by_aspect(
            db=db, aspect_id=aspect_id
        )
        return [
            PerspectivesHistoryRead.model_validate(entry) for entry in history_entries
        ]
