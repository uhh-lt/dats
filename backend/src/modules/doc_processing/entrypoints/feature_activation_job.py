from common.job_type_enum import JobType
from modules.doc_processing.doc_processing_dto import FeatureActivationJobInput
from modules.doc_processing.step_planning_service import StepPlanningService
from systems.job_system.job_dto import Job
from systems.job_system.job_register_decorator import register_job
from systems.job_system.job_system_enum import JobPriority, JobTiming


@register_job(
    job_type=JobType.FEATURE_ACTIVATION,
    input_type=FeatureActivationJobInput,
    priority=JobPriority.LOW,
    timeout=JobTiming.ONE_DAY,
)
def handle_feature_activation_job(payload: FeatureActivationJobInput, job: Job) -> None:
    """Run the feature activation that enabling, completing or restarting a
    feature started (`StepPlanningService.handle_feature_activation_job`)."""
    StepPlanningService().handle_feature_activation_job(job=job, payload=payload)
