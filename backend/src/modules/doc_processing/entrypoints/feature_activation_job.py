from loguru import logger

from common.job_type_enum import JobType
from common.languages_enum import Language
from modules.doc_processing.doc_processing_dto import (
    ProcessingSettings,
    SdocProcessingJobInput,
)
from systems.feature_system.feature_dto import FeatureActivationJobInput
from systems.job_system.job_dto import Job
from systems.job_system.job_register_decorator import register_job
from systems.job_system.job_service import JobService
from systems.job_system.job_system_enum import JobPriority, JobTiming
from systems.job_system.pipeline_graph import pipeline_registry

# The settings of the steps an activation starts: the defaults of the upload
# dialog. The language is detected (language detection already ran).
ACTIVATION_SETTINGS = ProcessingSettings(
    extract_images=True,
    pages_per_chunk=10,
    keyword_number=5,
    keyword_deduplication_threshold=0.5,
    keyword_max_ngram_size=2,
    language=Language.auto,
    model="default",
)


@register_job(
    job_type=JobType.FEATURE_ACTIVATION,
    input_type=FeatureActivationJobInput,
    priority=JobPriority.LOW,
    timeout=JobTiming.ONE_DAY,
)
def handle_feature_activation_job(payload: FeatureActivationJobInput, job: Job) -> None:
    """Start the steps that a feature activation planned for existing documents,
    on the low-priority queue. Each step job is enriched with the document's data
    like a recompute; the steps after it start through the normal advancing."""
    graph = pipeline_registry.graph()
    js = JobService()
    total = len(payload.sdoc_steps)
    logger.info(
        f"Starting the newly planned steps of {total} documents of project "
        f"{payload.project_id}..."
    )
    for idx, (sdoc_id, steps) in enumerate(payload.sdoc_steps.items()):
        for job_type, job_steps in graph.group_by_job(steps).items():
            js.start_job(
                job_type,
                SdocProcessingJobInput(
                    project_id=payload.project_id,
                    sdoc_id=sdoc_id,
                    settings=ACTIVATION_SETTINGS,
                    steps=job_steps,
                ),
                priority=JobPriority.LOW,
            )
        if idx % 1000 == 0:
            job.update(status_message=f"Started the steps of {idx}/{total} documents")
