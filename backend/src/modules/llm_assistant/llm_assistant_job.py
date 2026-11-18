from sqlalchemy.orm import Session

from core.auth.auth_exceptions import InvalidError
from core.prompt.prompt_service import PromptService
from core.user.user_crud import crud_user
from modules.llm_assistant.llm_assistant_endpoint import router
from modules.llm_assistant.llm_assistant_job_dto import (
    LLMAssistantJobInput,
    LLMAssistantJobOutput,
)
from modules.llm_assistant.llm_assistant_service import LLMAssistantService
from modules.llm_assistant.strategies.llm_assistant_strategy import LLMAssistantStrategy
from modules.llm_assistant.strategies.strategy_factory import build_strategy
from modules.llm_assistant.tasks.task_factory import build_task
from repos.db.sql_repo import SQLRepo
from repos.llm_repo import LLMRepo
from systems.job_system.job_dto import Job
from systems.job_system.job_register_decorator import register_job
from systems.job_system.job_system_enum import EndpointGeneration, JobTiming

sqlr = SQLRepo()


def validate_llm_assistant_input(db: Session, payload: LLMAssistantJobInput) -> None:
    """Reject documents of other projects and users that are no virtual user of
    the project before the job is enqueued: the LLM Assistant never writes into
    another user's annotations."""
    LLMAssistantService().assert_documents_in_project(
        db=db, project_id=payload.project_id, sdoc_ids=payload.sdoc_ids
    )
    user_id = payload.virtual_user_id
    if (
        user_id is not None
        and crud_user.read(db=db, id=user_id).project_id != payload.project_id
    ):
        raise InvalidError(
            f"User {user_id} is not a virtual user of project {payload.project_id}"
        )


def _build_strategy(db: Session, payload: LLMAssistantJobInput) -> LLMAssistantStrategy:
    """The strategy of the job's prompt: a stored prompt version or a draft."""
    pts = PromptService()
    if payload.draft is not None:
        prompt = payload.draft
        renderer = pts.validate_prompt(
            db=db, project_id=payload.project_id, prompt=prompt
        )
    else:
        assert payload.prompt_version_id is not None
        prompt = pts.read_snapshot(
            db=db,
            version_id=payload.prompt_version_id,
            project_id=payload.project_id,
            task_type=payload.task_type,
        )
        renderer = pts.build_renderer(prompt=prompt)
    pts.assert_runnable(prompt=prompt)
    return build_strategy(renderer=renderer)


@register_job(
    job_type="llm_assistant",
    input_type=LLMAssistantJobInput,
    output_type=LLMAssistantJobOutput,
    generate_endpoints=EndpointGeneration.ALL,
    publish_updates=True,
    router=router,
    device="api",
    result_ttl=JobTiming.NINETY_DAYS,
    timeout=JobTiming.ONE_WEEK,
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

    # resolve the prompt, it decides everything but the documents and the model;
    # the strategy holds DTOs only, so it outlives this transaction
    with sqlr.transaction() as db:
        strategy = _build_strategy(db=db, payload=payload)

    # execute: commits per batch of documents, no transaction stays open meanwhile
    task = build_task(payload.task_type, llm=LLMRepo())
    result = task.execute(sqlr=sqlr, job=job, payload=payload, strategy=strategy)

    job.update(
        current_step=2,
        status_message="Finished LLMAssistantJob successfully!",
    )

    return result
