from abc import ABC, abstractmethod
from dataclasses import dataclass
from functools import partial
from typing import Generic, TypeVar, final

from loguru import logger
from pydantic import BaseModel
from sqlalchemy.orm import Session

from modules.llm_assistant.llm_job_dto import (
    ApproachRecommendation,
    DocumentBasedTaskParams,
    FewShotParams,
    LLMJobOutput,
    LLMResultWithStatus,
    SpecificTaskParameters,
    ZeroShotParams,
)
from modules.llm_assistant.strategies.llm_strategy import LLMStrategy
from modules.llm_assistant.tasks.llm_document_processor import (
    LLMDocumentProcessor,
    LLMDocumentResponse,
)
from repos.llm_repo import LLMRepo
from systems.job_system.job_dto import Job

ResponseT = TypeVar("ResponseT", bound=BaseModel)
ResultT = TypeVar("ResultT", bound=LLMResultWithStatus)
StrategyT = TypeVar("StrategyT", bound=LLMStrategy)
TaskParamsT = TypeVar("TaskParamsT", bound=DocumentBasedTaskParams)


@dataclass(frozen=True)
class LLMTaskContext(Generic[StrategyT, TaskParamsT]):
    """Provide the shared job inputs required by task-specific execution hooks."""

    db: Session
    project_id: int
    approach_parameters: ZeroShotParams | FewShotParams
    task_parameters: TaskParamsT
    strategy: StrategyT


def aggregate_raw_responses(raw_responses: list[str]) -> str:
    """Join multiple raw LLM responses into one user-visible value."""
    if len(raw_responses) == 1:
        return raw_responses[0]
    return "\n---\n".join(
        f"Response {i + 1} of {len(raw_responses)}:\n{raw}"
        for i, raw in enumerate(raw_responses)
    )


class LLMTask(
    ABC,
    Generic[StrategyT, TaskParamsT, ResponseT, ResultT],
):
    """Define the shared execution lifecycle for every LLM assistant task.

    Subclasses provide the response model, optional preparation, per-document
    processing, and final output construction while this class fixes their order.
    """

    task_name: str

    def __init__(self, llm: LLMRepo):
        self.document_processor = LLMDocumentProcessor(llm)

    @classmethod
    @abstractmethod
    def determine_approach(
        cls, db: Session, task_parameters: SpecificTaskParameters
    ) -> ApproachRecommendation:
        """Determine the recommended and available approaches for this task."""
        ...

    @final
    def execute(
        self,
        *,
        db: Session,
        job: Job,
        project_id: int,
        approach_parameters: ZeroShotParams | FewShotParams,
        task_parameters: TaskParamsT,
        strategy: StrategyT,
    ) -> LLMJobOutput:
        """Run the fixed task lifecycle around task-specific execution hooks."""
        context = LLMTaskContext(
            db=db,
            project_id=project_id,
            approach_parameters=approach_parameters,
            task_parameters=task_parameters,
            strategy=strategy,
        )
        self._start_job(job=job, num_documents=len(task_parameters.sdoc_ids))
        self._prepare(context)

        documents = self.document_processor.process(
            model=approach_parameters.model,
            strategy=strategy,
            db=db,
            sdoc_ids=task_parameters.sdoc_ids,
            response_model=self._get_response_model(strategy),
            on_progress=partial(self._update_progress, job=job),
        )
        results: list[ResultT] = []
        for document in documents:
            results.append(self._process_document(context=context, document=document))

        return self._build_output(results)

    def _start_job(self, job: Job, num_documents: int) -> None:
        """Set and log the initial status for this task execution."""
        message = f"Started LLMJob - {self.task_name}, num docs: {num_documents}"
        job.update(status_message=message)
        logger.info(message)

    def _update_progress(
        self,
        processed_documents: int,
        total_documents: int,
        completed_requests: int,
        *,
        job: Job,
    ) -> None:
        """Report document and LLM-request progress on the job."""
        job.update(
            status_message=(
                f"Processed {processed_documents} of {total_documents} documents "
                f"({completed_requests} LLM requests completed)"
            )
        )

    def _prepare(
        self,
        context: LLMTaskContext[StrategyT, TaskParamsT],
    ) -> None:
        """Perform optional task-specific preparation before documents are processed."""

    @abstractmethod
    def _get_response_model(self, strategy: StrategyT) -> type[ResponseT]:
        """Return the structured response model required by this task."""
        ...

    @abstractmethod
    def _process_document(
        self,
        *,
        context: LLMTaskContext[StrategyT, TaskParamsT],
        document: LLMDocumentResponse[ResponseT],
    ) -> ResultT:
        """Validate, parse, deduplicate if needed, persist, and build the result for one document."""
        ...

    @abstractmethod
    def _build_output(self, results: list[ResultT]) -> LLMJobOutput:
        """Wrap all per-document results in the task-specific job output."""
        ...
