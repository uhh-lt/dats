from datetime import datetime

from common.singleton_meta import SingletonMeta
from modules.ml.coref_service import CorefService
from modules.ml.embedding_service import EmbeddingService
from modules.ml.ml_job_dto import (
    CoreferenceResolutionParams,
    DocTagRecommendationParams,
    DocumentEmbeddingParams,
    MLJobCreate,
    MLJobParameters,
    MLJobRead,
    MLJobType,
    MLJobUpdate,
    QuotationAttributionParams,
    SentenceEmbeddingParams,
)
from modules.ml.quote_service import QuoteService
from modules.ml.source_document_job_status_orm import (
    JobStatus,
    SourceDocumentJobStatusORM,
)
from modules.ml.tag_recommendation.tag_recommendation_service import (
    DocumentClassificationService,
)
from repos.redis_repo import RedisRepo
from sqlalchemy import and_, or_
from systems.job_system.background_job_base_dto import BackgroundJobStatus


class MLJobPreparationError(Exception):
    def __init__(self, cause: Exception | str) -> None:
        super().__init__(f"Cannot prepare and create the MLJob! {cause}")


class MLJobAlreadyStartedOrDoneError(Exception):
    def __init__(self, ml_job_id: str) -> None:
        super().__init__(f"The MLJob with ID {ml_job_id} already started or is done!")


class NoSuchMLJobError(Exception):
    def __init__(self, ml_job_id: str, cause: Exception) -> None:
        super().__init__(f"There exists not MLJob with ID {ml_job_id}! {cause}")


class MLService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.redis: RedisRepo = RedisRepo()
        return super(MLService, cls).__new__(cls)

    def prepare_ml_job(self, ml_params: MLJobParameters) -> MLJobRead:
        mlj_create = MLJobCreate(
            parameters=ml_params,
        )
        try:
            mlj_read = self.redis.store_ml_job(ml_job=mlj_create)
        except Exception as e:
            raise MLJobPreparationError(cause=e)

        return mlj_read

    def get_all_ml_jobs(self, project_id: int) -> list[MLJobRead]:
        return self.redis.get_all_ml_jobs(project_id=project_id)

    def start_ml_job_sync(self, ml_job_id: str) -> MLJobRead:
        start_time = datetime.now()
        mlj = self.get_ml_job(ml_job_id)
        if mlj.status == BackgroundJobStatus.RUNNING:
            raise MLJobAlreadyStartedOrDoneError(ml_job_id)
        mlj = self._update_ml_job(
            ml_job_id, MLJobUpdate(status=BackgroundJobStatus.RUNNING)
        )

        try:
            match mlj.parameters.ml_job_type:
                case MLJobType.QUOTATION_ATTRIBUTION:
                    assert isinstance(
                        mlj.parameters.specific_ml_job_parameters,
                        QuotationAttributionParams,
                    ), "QuotationAttributionParams expected"
                    recompute = mlj.parameters.specific_ml_job_parameters.recompute
                    filter_criterion = self._build_filter_criterion(
                        start_time, recompute
                    )
                    QuoteService().perform_quotation_detection(
                        mlj.parameters.project_id, filter_criterion, recompute
                    )
                case MLJobType.TAG_RECOMMENDATION:
                    assert isinstance(
                        mlj.parameters.specific_ml_job_parameters,
                        DocTagRecommendationParams,
                    ), "DocTagRecommendationParams expected"
                    # DO DOC TAGGING STUFF
                    DocumentClassificationService().classify_untagged_documents(
                        ml_job_id=mlj.id,
                        project_id=mlj.parameters.project_id,
                        tag_ids=mlj.parameters.specific_ml_job_parameters.tag_ids,
                        multi_class=mlj.parameters.specific_ml_job_parameters.multi_class,
                        method=mlj.parameters.specific_ml_job_parameters.method,
                    )
                case MLJobType.COREFERENCE_RESOLUTION:
                    assert isinstance(
                        mlj.parameters.specific_ml_job_parameters,
                        CoreferenceResolutionParams,
                    ), "CoreferenceResolutionParams expected"
                    recompute = mlj.parameters.specific_ml_job_parameters.recompute
                    filter_criterion = self._build_filter_criterion(
                        start_time, recompute
                    )
                    CorefService().perform_coreference_resolution(
                        mlj.parameters.project_id, filter_criterion, recompute
                    )
                case MLJobType.DOCUMENT_EMBEDDING:
                    assert isinstance(
                        mlj.parameters.specific_ml_job_parameters,
                        DocumentEmbeddingParams,
                    ), "DocumentEmbeddingParams expected"
                    recompute = mlj.parameters.specific_ml_job_parameters.recompute
                    filter_criterion = self._build_filter_criterion(
                        start_time, recompute
                    )
                    EmbeddingService().embed_documents(
                        mlj.parameters.project_id, filter_criterion, recompute
                    )
                case MLJobType.SENTENCE_EMBEDDING:
                    assert isinstance(
                        mlj.parameters.specific_ml_job_parameters,
                        SentenceEmbeddingParams,
                    ), "SentencetEmbeddingParams expected"
                    recompute = mlj.parameters.specific_ml_job_parameters.recompute
                    filter_criterion = self._build_filter_criterion(
                        start_time, recompute
                    )
                    EmbeddingService().embed_sentences(
                        mlj.parameters.project_id, filter_criterion, recompute
                    )

            mlj = self._update_ml_job(
                ml_job_id, MLJobUpdate(status=BackgroundJobStatus.FINISHED)
            )
        except Exception as e:
            mlj = self._update_ml_job(
                ml_job_id, MLJobUpdate(status=BackgroundJobStatus.ERROR, error=repr(e))
            )

        return mlj

    def get_ml_job(self, ml_job_id: str) -> MLJobRead:
        try:
            mlj = self.redis.load_ml_job(key=ml_job_id)
        except Exception as e:
            raise NoSuchMLJobError(ml_job_id, cause=e)
        return mlj

    def _update_ml_job(self, ml_job_id: str, update: MLJobUpdate) -> MLJobRead:
        try:
            mlj = self.redis.update_ml_job(key=ml_job_id, update=update)
        except Exception as e:
            raise NoSuchMLJobError(ml_job_id, cause=e)
        return mlj

    def _build_filter_criterion(self, start_time, recompute: bool):
        inactive_status = SourceDocumentJobStatusORM.status.notin_(
            (JobStatus.WAITING, JobStatus.RUNNING)
        )
        timestamp_column = SourceDocumentJobStatusORM.timestamp
        unfinished_status = SourceDocumentJobStatusORM.status.in_(
            (JobStatus.ERROR, JobStatus.ABORTED, JobStatus.UNQUEUED, None)
        )
        filter_criterion = (
            and_(
                inactive_status,
                or_(
                    timestamp_column < start_time,
                    timestamp_column == None,  # noqa: E711
                ),
            )
            if recompute
            else or_(unfinished_status, timestamp_column == None)  # noqa: E711
        )
        return filter_criterion
