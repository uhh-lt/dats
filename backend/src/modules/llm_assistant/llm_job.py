from common.job_type import JobType
from modules.llm_assistant.llm_endpoint import router
from modules.llm_assistant.llm_job_dto import LLMJobInput, LLMJobOutput
from repos.db.sql_repo import SQLRepo
from systems.job_system.job_dto import EndpointGeneration, Job, JobTiming
from systems.job_system.job_register_decorator import register_job

sqlr = SQLRepo()


@register_job(
    job_type=JobType.LLM_ASSISTANT,
    input_type=LLMJobInput,
    output_type=LLMJobOutput,
    generate_endpoints=EndpointGeneration.ALL,
    router=router,
    device="api",
    result_ttl=JobTiming.NINETY_DAYS,
    timeout=JobTiming.ONE_DAY,
)
def llm_assistant(
    payload: LLMJobInput,
    job: Job,
) -> LLMJobOutput:
    from modules.llm_assistant.llm_service import LLMAssistantService

    with sqlr.db_session() as db:
        result = LLMAssistantService().handle_llm_job(
            db=db,
            job=job,
            payload=payload,
        )

    return result
