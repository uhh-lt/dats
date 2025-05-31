from typing import Callable, List, Optional, Union

from app.core.data.dto.background_job_base import BackgroundJobStatus
from app.core.db.redis_service import RedisService
from app.core.topicmodel.tm_job import (
    AddMissingDocsToAspectParams,
    ChangeTopicParams,
    CreateAspectParams,
    CreateTopicWithNameParams,
    CreateTopicWithSdocsParams,
    MergeTopicsParams,
    RefineTopicModelParams,
    RemoveTopicParams,
    ResetTopicModelParams,
    SplitTopicParams,
    TMJobCreate,
    TMJobParams,
    TMJobRead,
    TMJobType,
    TMJobUpdate,
)
from app.util.singleton_meta import SingletonMeta
from loguru import logger


class TMJobPreparationError(Exception):
    def __init__(self, cause: Union[Exception, str]) -> None:
        super().__init__(f"Cannot prepare and create the TMJob! {cause}")


class TMJobAlreadyStartedOrDoneError(Exception):
    def __init__(self, tm_job_id: str) -> None:
        super().__init__(f"The TMJob with ID {tm_job_id} already started or is done!")


class NoSuchTMJobError(Exception):
    def __init__(self, tm_job_id: str, cause: Exception) -> None:
        super().__init__(f"There exists no TMJob with ID {tm_job_id}! {cause}")


TMJUpdateFN = Callable[[Optional[int], Optional[str]], TMJobRead]


class TMJobService(metaclass=SingletonMeta):
    tm_job_steps: dict[TMJobType, List[str]] = {
        TMJobType.CREATE_ASPECT: [
            "Document Modification",
            "Document Embedding",
            "Document Clustering",
            "Topic Extraction",
        ],
        TMJobType.CREATE_TOPIC_WITH_NAME: [
            "Topic Creation",
            "Document Assignment",
            "Topic Extraction",
        ],
        TMJobType.CREATE_TOPIC_WITH_SDOCS: [
            "Topic Creation",
            "Document Assignment",
            "Topic Extraction",
        ],
        TMJobType.REMOVE_TOPIC: [
            "Document Assignment",
            "Topic Removal",
            "Topic Extraction",
        ],
        TMJobType.MERGE_TOPICS: ["Merge Topics", "Topic Removal", "Topic Extraction"],
        TMJobType.SPLIT_TOPIC: [
            "Remove Topic",
            "Document Clustering",
            "Topic Extraction",
        ],
        TMJobType.CHANGE_TOPIC: [
            "Document Assignment",
            "Topic Extraction",
        ],
        TMJobType.REFINE_TOPIC_MODEL: ["Refine Topic Model"],
        TMJobType.ADD_MISSING_DOCS_TO_ASPECT: ["Add Missing Docs to Aspect"],
        TMJobType.RESET_TOPIC_MODEL: ["Reset Topic Model"],
    }

    def __new__(cls, *args, **kwargs):
        cls.redis: RedisService = RedisService()
        return super(TMJobService, cls).__new__(cls)

    def prepare_tm_job(
        self, project_id: int, aspect_id: int, tm_params: TMJobParams
    ) -> TMJobRead:
        tmj_create = TMJobCreate(
            project_id=project_id,
            aspect_id=aspect_id,
            step=0,
            steps=self.tm_job_steps.get(tm_params.tm_job_type, []),
            status_msg="Waiting...",
            tm_job_type=tm_params.tm_job_type,
            parameters=tm_params,
        )
        try:
            tmj_read = self.redis.store_tm_job(tm_job=tmj_create)
        except Exception as e:
            raise TMJobPreparationError(cause=e)

        return tmj_read

    def get_all_tm_jobs(self, project_id: int) -> List[TMJobRead]:
        return self.redis.get_all_tm_jobs(project_id=project_id)

    def get_tm_job(self, tm_job_id: str) -> TMJobRead:
        try:
            tmj = self.redis.load_tm_job(key=tm_job_id)
        except Exception as e:
            raise NoSuchTMJobError(tm_job_id, cause=e)
        return tmj

    def update_tm_job(self, tm_job_id: str, update: TMJobUpdate) -> TMJobRead:
        try:
            tmj = self.redis.update_tm_job(key=tm_job_id, update=update)
        except Exception as e:
            raise NoSuchTMJobError(tm_job_id, cause=e)
        return tmj

    def update_status_callback(self, tm_job_id: str) -> TMJUpdateFN:
        def callback(step: Optional[int], status_msg: Optional[str]) -> TMJobRead:
            if step is None and status_msg is None:
                raise ValueError("At least one of step or status_msg must be provided.")

            if step is not None and status_msg is not None:
                update = TMJobUpdate(step=step, status_msg=status_msg)
            elif status_msg is not None:
                update = TMJobUpdate(status_msg=status_msg)
            else:
                update = TMJobUpdate(step=step)

            return self.update_tm_job(tm_job_id, update)

        return callback

    def start_tm_job_sync(self, tm_job_id: str) -> TMJobRead:
        from app.core.topicmodel.tm_service import TMService

        tms: TMService = TMService(
            update_status_clbk=self.update_status_callback(tm_job_id)
        )

        tmj = self.get_tm_job(tm_job_id)

        if (
            tmj.status == BackgroundJobStatus.RUNNING
            or tmj.status == BackgroundJobStatus.FINISHED
        ):
            raise TMJobAlreadyStartedOrDoneError(tm_job_id)

        tmj = self.update_tm_job(
            tm_job_id, TMJobUpdate(status=BackgroundJobStatus.RUNNING)
        )

        try:
            match tmj.parameters.tm_job_type:
                case TMJobType.CREATE_ASPECT:
                    assert isinstance(
                        tmj.parameters,
                        CreateAspectParams,
                    ), "CreateAspectParams expected"
                    tms.create_aspect(
                        aspect_id=tmj.aspect_id,
                        params=tmj.parameters,
                    )
                case TMJobType.ADD_MISSING_DOCS_TO_ASPECT:
                    assert isinstance(
                        tmj.parameters,
                        AddMissingDocsToAspectParams,
                    ), "AddMissingDocsToAspectParams expected"
                    tms.add_missing_docs_to_aspect(
                        aspect_id=tmj.aspect_id,
                        params=tmj.parameters,
                    )
                case TMJobType.CREATE_TOPIC_WITH_NAME:
                    assert isinstance(
                        tmj.parameters,
                        CreateTopicWithNameParams,
                    ), "CreateTopicWithNameParams expected"
                    tms.create_topic_with_name(
                        aspect_id=tmj.aspect_id,
                        params=tmj.parameters,
                    )
                case TMJobType.CREATE_TOPIC_WITH_SDOCS:
                    assert isinstance(
                        tmj.parameters,
                        CreateTopicWithSdocsParams,
                    ), "CreateTopicWithSdocsParams expected"
                    tms.create_topic_with_sdocs(
                        aspect_id=tmj.aspect_id,
                        params=tmj.parameters,
                    )
                case TMJobType.REMOVE_TOPIC:
                    assert isinstance(
                        tmj.parameters,
                        RemoveTopicParams,
                    ), "RemoveTopicParams expected"
                    tms.remove_topic(
                        aspect_id=tmj.aspect_id,
                        params=tmj.parameters,
                    )
                case TMJobType.MERGE_TOPICS:
                    assert isinstance(
                        tmj.parameters,
                        MergeTopicsParams,
                    ), "MergeTopicsParams expected"
                    tms.merge_topics(
                        aspect_id=tmj.aspect_id,
                        params=tmj.parameters,
                    )
                case TMJobType.SPLIT_TOPIC:
                    assert isinstance(
                        tmj.parameters,
                        SplitTopicParams,
                    ), "SplitTopicParams expected"
                    tms.split_topic(
                        aspect_id=tmj.aspect_id,
                        params=tmj.parameters,
                    )
                case TMJobType.CHANGE_TOPIC:
                    assert isinstance(
                        tmj.parameters,
                        ChangeTopicParams,
                    ), "ChangeTopicParams expected"
                    tms.change_topic(
                        aspect_id=tmj.aspect_id,
                        params=tmj.parameters,
                    )
                case TMJobType.REFINE_TOPIC_MODEL:
                    assert isinstance(
                        tmj.parameters,
                        RefineTopicModelParams,
                    ), "RefineTopicModelParams expected"
                    tms.refine_topic_model(
                        aspect_id=tmj.aspect_id,
                        params=tmj.parameters,
                    )
                case TMJobType.RESET_TOPIC_MODEL:
                    assert isinstance(
                        tmj.parameters,
                        ResetTopicModelParams,
                    ), "ResetTopicModelParams expected"
                    tms.reset_topic_model(
                        aspect_id=tmj.aspect_id,
                        params=tmj.parameters,
                    )
                case _:
                    # Handle unknown job types if necessary, or raise an error
                    raise NotImplementedError(
                        f"TMJobType {tmj.parameters.tm_job_type} not implemented."
                    )

            tmj = self.update_tm_job(
                tm_job_id,
                TMJobUpdate(
                    status=BackgroundJobStatus.FINISHED, status_msg="Finished!"
                ),
            )
        except Exception as e:
            logger.exception(e)
            tmj = self.update_tm_job(
                tm_job_id,
                TMJobUpdate(status=BackgroundJobStatus.ERROR, status_msg=repr(e)),
            )

        return tmj
