from datetime import datetime

from modules.ml.ml_job_dto import (
    CoreferenceResolutionParams,
    DocTagRecommendationParams,
    DocumentEmbeddingParams,
    MLJobInput,
    MLJobType,
    QuotationAttributionParams,
    SentenceEmbeddingParams,
)
from modules.ml.source_document_job_status_orm import (
    JobStatus,
    SourceDocumentJobStatusORM,
)
from rq import get_current_job
from sqlalchemy import and_, or_
from systems.job_system.job_dto import EndpointGeneration, JobPriority
from systems.job_system.job_register_decorator import register_job


@register_job(
    job_type="ml",
    input_type=MLJobInput,
    output_type=None,
    priority=JobPriority.DEFAULT,
    generate_endpoints=EndpointGeneration.ALL,
)
def ml_job(
    payload: MLJobInput,
) -> None:
    job = get_current_job()
    assert job is not None, "Job must be running in a worker context"

    start_time = datetime.now()

    match payload.ml_job_type:
        case MLJobType.QUOTATION_ATTRIBUTION:
            from modules.ml.quote_service import QuoteService

            assert isinstance(
                payload.specific_ml_job_parameters,
                QuotationAttributionParams,
            ), "QuotationAttributionParams expected"
            recompute = payload.specific_ml_job_parameters.recompute
            filter_criterion = _build_filter_criterion(start_time, recompute)
            QuoteService().perform_quotation_detection(
                payload.project_id, filter_criterion, recompute
            )
        case MLJobType.TAG_RECOMMENDATION:
            from modules.ml.tag_recommendation.tag_recommendation_service import (
                DocumentClassificationService,
            )

            assert isinstance(
                payload.specific_ml_job_parameters,
                DocTagRecommendationParams,
            ), "DocTagRecommendationParams expected"
            DocumentClassificationService().classify_untagged_documents(
                ml_job_id=job.id,
                project_id=payload.project_id,
                tag_ids=payload.specific_ml_job_parameters.tag_ids,
                multi_class=payload.specific_ml_job_parameters.multi_class,
                method=payload.specific_ml_job_parameters.method,
            )
        case MLJobType.COREFERENCE_RESOLUTION:
            from modules.ml.coref_service import CorefService

            assert isinstance(
                payload.specific_ml_job_parameters,
                CoreferenceResolutionParams,
            ), "CoreferenceResolutionParams expected"
            recompute = payload.specific_ml_job_parameters.recompute
            filter_criterion = _build_filter_criterion(start_time, recompute)
            CorefService().perform_coreference_resolution(
                payload.project_id, filter_criterion, recompute
            )
        case MLJobType.DOCUMENT_EMBEDDING:
            from modules.ml.embedding_service import EmbeddingService

            assert isinstance(
                payload.specific_ml_job_parameters,
                DocumentEmbeddingParams,
            ), "DocumentEmbeddingParams expected"
            recompute = payload.specific_ml_job_parameters.recompute
            filter_criterion = _build_filter_criterion(start_time, recompute)
            EmbeddingService().embed_documents(
                payload.project_id, filter_criterion, recompute
            )
        case MLJobType.SENTENCE_EMBEDDING:
            from modules.ml.embedding_service import EmbeddingService

            assert isinstance(
                payload.specific_ml_job_parameters,
                SentenceEmbeddingParams,
            ), "SentencetEmbeddingParams expected"
            recompute = payload.specific_ml_job_parameters.recompute
            filter_criterion = _build_filter_criterion(start_time, recompute)
            EmbeddingService().embed_sentences(
                payload.project_id, filter_criterion, recompute
            )


def _build_filter_criterion(start_time, recompute: bool):
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
