from typing import Callable, List, Optional, Union

from app.core.data.dto.background_job_base import BackgroundJobStatus
from app.core.db.redis_service import RedisService
from app.core.perspectives.perspectives_job import (
    AddMissingDocsToAspectParams,
    ChangeClusterParams,
    CreateAspectParams,
    CreateClusterWithNameParams,
    CreateClusterWithSdocsParams,
    MergeClustersParams,
    PerspectivesJobCreate,
    PerspectivesJobParams,
    PerspectivesJobRead,
    PerspectivesJobType,
    PerspectivesJobUpdate,
    RefineModelParams,
    RemoveClusterParams,
    ResetModelParams,
    SplitClusterParams,
)
from app.util.singleton_meta import SingletonMeta
from loguru import logger


class PerspectivesJobPreparationError(Exception):
    def __init__(self, cause: Union[Exception, str]) -> None:
        super().__init__(f"Cannot prepare and create the PerspectivesJob! {cause}")


class PerspectivesJobAlreadyStartedOrDoneError(Exception):
    def __init__(self, perspectives_job_id: str) -> None:
        super().__init__(
            f"The PerspectivesJob with ID {perspectives_job_id} already started or is done!"
        )


class NoSuchPerspectivesJobError(Exception):
    def __init__(self, perspectives_job_id: str, cause: Exception) -> None:
        super().__init__(
            f"There exists no PerspectivesJob with ID {perspectives_job_id}! {cause}"
        )


TMJUpdateFN = Callable[[Optional[int], Optional[str]], PerspectivesJobRead]


class PerspectivesJobService(metaclass=SingletonMeta):
    perspectives_job_steps: dict[PerspectivesJobType, List[str]] = {
        PerspectivesJobType.CREATE_ASPECT: [
            "Document Modification",
            "Document Embedding",
            "Document Clustering",
            "Cluster Extraction",
        ],
        PerspectivesJobType.CREATE_CLUSTER_WITH_NAME: [
            "Cluster Creation",
            "Document Assignment",
            "Cluster Extraction",
        ],
        PerspectivesJobType.CREATE_CLUSTER_WITH_SDOCS: [
            "Cluster Creation",
            "Document Assignment",
            "Cluster Extraction",
        ],
        PerspectivesJobType.REMOVE_CLUSTER: [
            "Document Assignment",
            "Cluster Removal",
            "Cluster Extraction",
        ],
        PerspectivesJobType.MERGE_CLUSTERS: [
            "Merge Clusters",
            "Cluster Removal",
            "Cluster Extraction",
        ],
        PerspectivesJobType.SPLIT_CLUSTER: [
            "Remove Cluster",
            "Document Clustering",
            "Cluster Extraction",
        ],
        PerspectivesJobType.CHANGE_CLUSTER: [
            "Document Assignment",
            "Cluster Extraction",
        ],
        PerspectivesJobType.REFINE_MODEL: [
            "Prepare Training Data",
            "Train & Embedd",
            "Document Clustering",
            "Cluster Extraction",
        ],
        PerspectivesJobType.ADD_MISSING_DOCS_TO_ASPECT: ["Add Missing Docs to Aspect"],
        PerspectivesJobType.RESET_MODEL: ["Reset Cluster Model"],
    }

    def __new__(cls, *args, **kwargs):
        cls.redis: RedisService = RedisService()
        return super(PerspectivesJobService, cls).__new__(cls)

    def prepare_perspectives_job(
        self,
        project_id: int,
        aspect_id: int,
        perspectives_params: PerspectivesJobParams,
    ) -> PerspectivesJobRead:
        pj_create = PerspectivesJobCreate(
            project_id=project_id,
            aspect_id=aspect_id,
            step=0,
            steps=self.perspectives_job_steps.get(
                perspectives_params.perspectives_job_type, []
            ),
            status_msg="Waiting...",
            perspectives_job_type=perspectives_params.perspectives_job_type,
            parameters=perspectives_params,
        )
        try:
            pj_read = self.redis.store_perspectives_job(perspectives_job=pj_create)
        except Exception as e:
            raise PerspectivesJobPreparationError(cause=e)

        return pj_read

    def get_all_perspectives_jobs(self, project_id: int) -> List[PerspectivesJobRead]:
        return self.redis.get_all_perspectives_jobs(project_id=project_id)

    def get_perspectives_job(self, perspectives_job_id: str) -> PerspectivesJobRead:
        try:
            pj = self.redis.load_perspectives_job(key=perspectives_job_id)
        except Exception as e:
            raise NoSuchPerspectivesJobError(perspectives_job_id, cause=e)
        return pj

    def update_perspectives_job(
        self, perspectives_job_id: str, update: PerspectivesJobUpdate
    ) -> PerspectivesJobRead:
        try:
            pj = self.redis.update_perspectives_job(
                key=perspectives_job_id, update=update
            )
        except Exception as e:
            raise NoSuchPerspectivesJobError(perspectives_job_id, cause=e)
        return pj

    def update_status_callback(self, perspectives_job_id: str) -> TMJUpdateFN:
        def callback(
            step: Optional[int], status_msg: Optional[str]
        ) -> PerspectivesJobRead:
            if step is None and status_msg is None:
                raise ValueError("At least one of step or status_msg must be provided.")

            if step is not None and status_msg is not None:
                update = PerspectivesJobUpdate(step=step, status_msg=status_msg)
            elif status_msg is not None:
                update = PerspectivesJobUpdate(status_msg=status_msg)
            else:
                update = PerspectivesJobUpdate(step=step)

            return self.update_perspectives_job(perspectives_job_id, update)

        return callback

    def start_perspectives_job_sync(
        self, perspectives_job_id: str
    ) -> PerspectivesJobRead:
        from app.core.perspectives.perspectives_service import PerspectivesService

        ps: PerspectivesService = PerspectivesService(
            update_status_clbk=self.update_status_callback(perspectives_job_id)
        )

        pj = self.get_perspectives_job(perspectives_job_id)

        if (
            pj.status == BackgroundJobStatus.RUNNING
            or pj.status == BackgroundJobStatus.FINISHED
        ):
            raise PerspectivesJobAlreadyStartedOrDoneError(perspectives_job_id)

        pj = self.update_perspectives_job(
            perspectives_job_id,
            PerspectivesJobUpdate(status=BackgroundJobStatus.RUNNING),
        )

        try:
            match pj.parameters.perspectives_job_type:
                case PerspectivesJobType.CREATE_ASPECT:
                    assert isinstance(
                        pj.parameters,
                        CreateAspectParams,
                    ), "CreateAspectParams expected"
                    ps.create_aspect(
                        aspect_id=pj.aspect_id,
                        params=pj.parameters,
                    )
                case PerspectivesJobType.ADD_MISSING_DOCS_TO_ASPECT:
                    assert isinstance(
                        pj.parameters,
                        AddMissingDocsToAspectParams,
                    ), "AddMissingDocsToAspectParams expected"
                    ps.add_missing_docs_to_aspect(
                        aspect_id=pj.aspect_id,
                        params=pj.parameters,
                    )
                case PerspectivesJobType.CREATE_CLUSTER_WITH_NAME:
                    assert isinstance(
                        pj.parameters,
                        CreateClusterWithNameParams,
                    ), "CreateClusterWithNameParams expected"
                    ps.create_cluster_with_name(
                        aspect_id=pj.aspect_id,
                        params=pj.parameters,
                    )
                case PerspectivesJobType.CREATE_CLUSTER_WITH_SDOCS:
                    assert isinstance(
                        pj.parameters,
                        CreateClusterWithSdocsParams,
                    ), "CreateClusterWithSdocsParams expected"
                    ps.create_cluster_with_sdocs(
                        aspect_id=pj.aspect_id,
                        params=pj.parameters,
                    )
                case PerspectivesJobType.REMOVE_CLUSTER:
                    assert isinstance(
                        pj.parameters,
                        RemoveClusterParams,
                    ), "RemoveClusterParams expected"
                    ps.remove_cluster(
                        aspect_id=pj.aspect_id,
                        params=pj.parameters,
                    )
                case PerspectivesJobType.MERGE_CLUSTERS:
                    assert isinstance(
                        pj.parameters,
                        MergeClustersParams,
                    ), "MergeClustersParams expected"
                    ps.merge_clusters(
                        aspect_id=pj.aspect_id,
                        params=pj.parameters,
                    )
                case PerspectivesJobType.SPLIT_CLUSTER:
                    assert isinstance(
                        pj.parameters,
                        SplitClusterParams,
                    ), "SplitClusterParams expected"
                    ps.split_cluster(
                        aspect_id=pj.aspect_id,
                        params=pj.parameters,
                    )
                case PerspectivesJobType.CHANGE_CLUSTER:
                    assert isinstance(
                        pj.parameters,
                        ChangeClusterParams,
                    ), "ChangeClusterParams expected"
                    ps.change_cluster(
                        aspect_id=pj.aspect_id,
                        params=pj.parameters,
                    )
                case PerspectivesJobType.REFINE_MODEL:
                    assert isinstance(
                        pj.parameters,
                        RefineModelParams,
                    ), "RefineModelParams expected"
                    ps.refine_cluster_model(
                        aspect_id=pj.aspect_id,
                        params=pj.parameters,
                    )
                case PerspectivesJobType.RESET_MODEL:
                    assert isinstance(
                        pj.parameters,
                        ResetModelParams,
                    ), "ResetModelParams expected"
                    ps.reset_cluster_model(
                        aspect_id=pj.aspect_id,
                        params=pj.parameters,
                    )
                case _:
                    # Handle unknown job types if necessary, or raise an error
                    raise NotImplementedError(
                        f"PerspectivesJobType {pj.parameters.perspectives_job_type} not implemented."
                    )

            pj = self.update_perspectives_job(
                perspectives_job_id,
                PerspectivesJobUpdate(
                    status=BackgroundJobStatus.FINISHED, status_msg="Finished!"
                ),
            )
        except Exception as e:
            logger.exception(e)
            pj = self.update_perspectives_job(
                perspectives_job_id,
                PerspectivesJobUpdate(
                    status=BackgroundJobStatus.ERROR, status_msg=repr(e)
                ),
            )

        return pj
