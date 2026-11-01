from datetime import UTC, datetime

from common.job_type_enum import JobType
from core.prompt.prompt_enum import TaskType
from modules.experiment.experiment_run_crud import crud_experiment_run
from modules.experiment.experiment_run_dto import (
    ExperimentRunJobInput,
    ExperimentRunUpdateIntern,
)
from modules.experiment.experiment_service import ExperimentService
from modules.llm_assistant.llm_assistant_job import llm_assistant
from modules.llm_assistant.llm_assistant_job_dto import (
    LLMAssistantJobInput,
    LLMAssistantJobOutput,
)
from repos.db.sql_repo import SQLRepo
from systems.job_system.job_dto import Job
from systems.job_system.job_register_decorator import register_job
from systems.job_system.job_system_enum import JobStatus, JobTiming

sqlr = SQLRepo()


@register_job(
    job_type=JobType.EXPERIMENT_RUN,
    input_type=ExperimentRunJobInput,
    output_type=LLMAssistantJobOutput,
    publish_updates=True,
    device="api",
    result_ttl=JobTiming.NINETY_DAYS,
    timeout=JobTiming.ONE_DAY,
)
def experiment_run(
    payload: ExperimentRunJobInput, job: Job
) -> LLMAssistantJobOutput | None:
    """Run the LLM Assistant job of a run, then store the run's agreement with the
    gold annotator. The run keeps the state of its job, which expires."""
    # 1) mark the run as started and build its LLM Assistant input
    with sqlr.transaction() as db:
        if not crud_experiment_run.exists(db=db, id=payload.run_id):
            return None  # the run was deleted before the job started
        run = crud_experiment_run.update(
            db=db,
            id=payload.run_id,
            update_dto=ExperimentRunUpdateIntern(
                status=JobStatus.STARTED,
                job_id=job.get_id(),
                started=datetime.now(UTC),
            ),
        )
        llm_payload = LLMAssistantJobInput(
            project_id=run.experiment.project_id,
            task_type=TaskType(run.experiment.task_type),
            sdoc_ids=run.sdoc_ids,
            model=run.model,
            prompt_version_id=run.prompt_version_id,
            virtual_user_id=run.virtual_user_id,
        )

    try:
        # 2) annotate the documents into the run's virtual user
        output = llm_assistant(llm_payload, job)

        # 3) store the agreement with the gold annotator and mark the run finished
        job.update(status_message="Computing the agreement with the gold annotator")
        with sqlr.transaction() as db:
            ExperimentService().store_run_scores(db=db, run_id=payload.run_id)
            crud_experiment_run.update(
                db=db,
                id=payload.run_id,
                update_dto=ExperimentRunUpdateIntern(
                    status=JobStatus.FINISHED, finished=datetime.now(UTC)
                ),
            )
    except Exception:
        # mark the run failed, unless it was deleted meanwhile
        with sqlr.transaction() as db:
            if crud_experiment_run.exists(db=db, id=payload.run_id):
                crud_experiment_run.update(
                    db=db,
                    id=payload.run_id,
                    update_dto=ExperimentRunUpdateIntern(
                        status=JobStatus.FAILED, finished=datetime.now(UTC)
                    ),
                )
        raise
    return output
