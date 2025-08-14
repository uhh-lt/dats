from common.job_type import JobType
from modules.llm_assistant.llm_endpoint import router
from modules.llm_assistant.llm_job_dto import LLMJobInput, LLMJobOutput
from systems.job_system.job_dto import EndpointGeneration, Job
from systems.job_system.job_register_decorator import register_job


@register_job(
    job_type=JobType.LLM_ASSISTANT,
    input_type=LLMJobInput,
    output_type=LLMJobOutput,
    generate_endpoints=EndpointGeneration.ALL,
    router=router,
    device="gpu",
)
def llm_assistant(
    payload: LLMJobInput,
    job: Job,
) -> LLMJobOutput:
    from modules.llm_assistant.llm_service import LLMAssistantService

    return LLMAssistantService().handle_llm_job(
        job=job,
        payload=payload,
    )
