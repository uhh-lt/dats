from common.job_type import JobType
from modules.llm_assistant.llm_endpoint import router
from modules.llm_assistant.llm_job_dto import (
    FewShotParams,
    LLMJobInput,
    LLMJobOutput,
)
from modules.llm_assistant.strategies.strategy_factory import build_strategy
from modules.llm_assistant.tasks.task_factory import build_task
from repos.db.sql_repo import SQLRepo
from repos.llm_repo import LLMRepo
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
    job.update(
        steps=["Start", "Process documents", "Finish"],
        current_step=0,
        status_message="Started LLM Assistant!",
    )

    task_type = payload.llm_job_type
    approach_parameters = payload.specific_approach_parameters
    task_parameters = payload.specific_task_parameters
    is_fewshot = isinstance(approach_parameters, FewShotParams)

    with sqlr.transaction() as db:
        # build the strategy
        strategy = build_strategy(
            db=db,
            project_id=payload.project_id,
            is_fewshot=is_fewshot,
            task_type=task_type,
            strategy_type=payload.llm_strategy_type,
            strategy_params=payload.specific_strategy_parameters,
            prompt_templates=approach_parameters.prompts,
            params=task_parameters,
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
        current_step=len(job.get_steps()) - 1,
        status_message="Finished LLMJob successfully!",
    )

    return result
