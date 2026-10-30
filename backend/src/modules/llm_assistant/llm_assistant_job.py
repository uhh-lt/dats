from sqlalchemy.orm import Session

from common.job_type_enum import JobType
from core.prompt_template.prompt_template_service import PromptTemplateService
from core.user.user_service import UserService
from modules.llm_assistant.llm_assistant_endpoint import router
from modules.llm_assistant.llm_assistant_job_dto import (
    LLMAssistantJobInput,
    LLMAssistantJobOutput,
)
from modules.llm_assistant.llm_assistant_service import LLMAssistantService
from modules.llm_assistant.strategies.strategy_factory import build_strategy
from modules.llm_assistant.tasks.task_factory import build_task
from repos.db.sql_repo import SQLRepo
from repos.llm_repo import LLMRepo
from systems.job_system.job_dto import Job
from systems.job_system.job_register_decorator import register_job
from systems.job_system.job_system_enum import EndpointGeneration, JobTiming

sqlr = SQLRepo()


def validate_llm_assistant_input(db: Session, payload: LLMAssistantJobInput) -> None:
    """Reject documents of other projects and annotators that are no virtual
    annotator of the project before the job is enqueued: the LLM Assistant never
    writes into a human user's annotations."""
    LLMAssistantService().assert_documents_in_project(
        db=db, project_id=payload.project_id, sdoc_ids=payload.sdoc_ids
    )
    if payload.annotator_id is not None:
        UserService().assert_virtual_annotator(
            db=db, user_id=payload.annotator_id, project_id=payload.project_id
        )


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
    validate_input=validate_llm_assistant_input,
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

    pts = PromptTemplateService()
    with sqlr.transaction() as db:
        # resolve the prompt, it decides everything but the documents and the model
        if payload.draft is not None:
            prompt = payload.draft
            renderer = pts.validate_prompt_template(
                db=db, project_id=payload.project_id, prompt=prompt
            )
        else:
            assert payload.prompt_template_version_id is not None
            prompt = pts.read_snapshot(
                db=db,
                version_id=payload.prompt_template_version_id,
                project_id=payload.project_id,
                task_type=payload.task_type,
            )
            renderer = pts.build_renderer(prompt=prompt)
        pts.assert_runnable(prompt=prompt)

        # build the strategy of the prompt's output format and the task
        strategy = build_strategy(renderer=renderer)
        task = build_task(payload.task_type, llm=LLMRepo())

        # execute
        result = task.execute(db=db, job=job, payload=payload, strategy=strategy)

    job.update(
        current_step=2,
        status_message="Finished LLMAssistantJob successfully!",
    )

    return result
