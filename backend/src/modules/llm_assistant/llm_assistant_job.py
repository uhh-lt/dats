from common.job_type_enum import JobType
from modules.llm_assistant.llm_assistant_endpoint import router
from modules.llm_assistant.llm_assistant_job_dto import (
    FewShotParams,
    LLMAssistantJobInput,
    LLMAssistantJobOutput,
)
from modules.llm_assistant.prompt_template_service import PromptTemplateService
from modules.llm_assistant.strategies.strategy_factory import build_strategy
from modules.llm_assistant.tasks.task_factory import build_task
from repos.db.sql_repo import SQLRepo
from repos.llm_repo import LLMRepo
from systems.job_system.job_dto import Job
from systems.job_system.job_register_decorator import register_job
from systems.job_system.job_system_enum import EndpointGeneration, JobTiming

sqlr = SQLRepo()


@register_job(
    job_type=JobType.LLM_ASSISTANT,
    input_type=LLMAssistantJobInput,
    output_type=LLMAssistantJobOutput,
    generate_endpoints=EndpointGeneration.ALL,
    publish_updates=True,
    router=router,
    device="api",
    result_ttl=JobTiming.NINETY_DAYS,
    timeout=JobTiming.ONE_DAY,
)
def llm_assistant(
    payload: LLMAssistantJobInput,
    job: Job,
) -> LLMAssistantJobOutput:
    job.update(
        steps=["Start", "Process documents", "Finish"],
        current_step=0,
        status_message="Started LLM Assistant!",
    )

    task_type = payload.task_type
    approach_parameters = payload.specific_approach_parameters
    task_parameters = payload.specific_task_parameters
    is_fewshot = isinstance(approach_parameters, FewShotParams)

    with sqlr.transaction() as db:
        # resolve the prompts (inline or a stored template version)
        prompt_templates = PromptTemplateService().resolve_prompts(
            db=db,
            project_id=payload.project_id,
            task_type=task_type,
            strategy_type=payload.strategy_type,
            source=approach_parameters,
        )

        # build the strategy
        strategy = build_strategy(
            db=db,
            project_id=payload.project_id,
            is_fewshot=is_fewshot,
            task_type=task_type,
            strategy_type=payload.strategy_type,
            params=task_parameters,
            strategy_params=payload.specific_strategy_parameters,
            prompt_templates=prompt_templates,
        )

        # build the task
        task = build_task(task_type, llm=LLMRepo())

        # execute
        result = task.execute(
            db=db,
            job=job,
            project_id=payload.project_id,
            approach_parameters=approach_parameters,
            task_parameters=task_parameters,
            strategy=strategy,
        )

    job.update(
        current_step=2,
        status_message="Finished LLMAssistantJob successfully!",
    )

    return result
