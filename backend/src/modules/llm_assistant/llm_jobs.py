from modules.llm_assistant.llm_endpoint import router
from modules.llm_assistant.llm_job_dto import LLMJobInput, LLMJobOutput
from systems.job_system.job_dto import EndpointGeneration, Job, JobPriority
from systems.job_system.job_register_decorator import register_job


@register_job(
    job_type="llm_assistant",
    input_type=LLMJobInput,
    output_type=LLMJobOutput,
    priority=JobPriority.DEFAULT,
    generate_endpoints=EndpointGeneration.ALL,
    router=router,
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
