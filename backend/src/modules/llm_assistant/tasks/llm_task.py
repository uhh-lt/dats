from abc import ABC, abstractmethod
from typing import Generic, Type, TypeVar

from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.doc.source_document_data_crud import crud_sdoc_data
from core.doc.source_document_data_orm import SourceDocumentDataORM
from core.metadata.source_document_metadata_crud import crud_sdoc_meta
from modules.llm_assistant.llm_job_dto import (
    ApproachRecommendation,
    DocumentBasedTaskParams,
    FewShotParams,
    LLMJobOutput,
    SpecificTaskParameters,
    ZeroShotParams,
)
from modules.llm_assistant.strategies.llm_strategy import LLMStrategy
from repos.llm_repo import LLMBatchChatResponse, LLMMessage, LLMRepo
from systems.job_system.job_dto import Job

BATCH_SIZE = 32

T = TypeVar("T", bound=BaseModel)
StrategyT = TypeVar("StrategyT", bound=LLMStrategy)
TaskParamsT = TypeVar("TaskParamsT", bound=DocumentBasedTaskParams)


class BatchProcessingError(Exception):
    """Error during batch processing of a single document.

    Carries the raw LLM response (if available) for transparency.
    """

    def __init__(self, message: str, raw_response: str | None = None):
        super().__init__(message)
        self.raw_response = raw_response


def aggregate_raw_responses(raw_responses: list[str]) -> str:
    """Joins multiple raw LLM responses (e.g. one per sentence) into one string."""
    if len(raw_responses) == 1:
        return raw_responses[0]
    return "\n---\n".join(
        f"Response {i + 1} of {len(raw_responses)}:\n{raw}"
        for i, raw in enumerate(raw_responses)
    )


class LLMTask(ABC, Generic[StrategyT, TaskParamsT]):
    """A task describes WHAT the LLM assistant does (tagging, metadata
    extraction, annotation, sentence annotation).

    It owns the batch-processing skeleton: iterating documents in batches,
    building prompts via the strategy, calling the LLM, and assembling the
    per-document results. Strategy-specific parsing/grounding is delegated to
    the strategy; task-specific result assembly is implemented by subclasses.
    """

    def __init__(self, llm: LLMRepo):
        self.llm = llm

    @classmethod
    @abstractmethod
    def determine_approach(
        cls, db: Session, task_parameters: SpecificTaskParameters
    ) -> ApproachRecommendation:
        """Determine the recommended and available approaches for this task,
        given the task parameters (e.g. selected codes)."""
        ...

    @abstractmethod
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
        """Run the task end-to-end and return the job output."""
        ...

    def _next_llm_job_step(self, job: Job, description: str) -> None:
        job.update(current_step=job.get_current_step() + 1, status_message=description)

    def _update_llm_job_description(self, job: Job, description: str) -> None:
        job.update(status_message=description)

    def _read_sdoc_datas(
        self, db: Session, sdoc_ids: list[int]
    ) -> list[SourceDocumentDataORM]:
        return crud_sdoc_data.read_by_ids(db=db, ids=sdoc_ids)

    def _process_batch(
        self,
        model: str,
        strategy: LLMStrategy,
        db: Session,
        sdoc_ids: list[int],
        sdoc_datas: list[SourceDocumentDataORM],
        response_model: Type[T],
    ) -> tuple[list[LLMBatchChatResponse[T]], list[int], list[int]]:
        """Build prompts for a batch of documents and call the LLM.

        Returns (responses, response_sdoc_ids, response_message_ids) where the
        two id lists align with the responses list.
        """
        # prepare batch messages
        batch_messages: list[LLMMessage] = []
        bm_sids: list[int] = []  # sdoc_id corresponding to each batch_message
        bm_ids: list[int] = []  # message id corresponding to each batch_message
        for sdoc_id, sdoc_data in zip(sdoc_ids, sdoc_datas):
            # get language
            language = crud_sdoc_meta.read_by_sdoc_and_key(
                db=db, sdoc_id=sdoc_data.id, key="language"
            ).str_value
            if language is None:
                raise BatchProcessingError(
                    f"Document with ID {sdoc_id} has no language!"
                )

            # construct prompts
            prompts = strategy.build_prompt(
                language=language,
                sdoc_data=sdoc_data,
            )
            batch_messages.extend(prompts)
            bm_sids.extend([sdoc_id] * len(prompts))
            bm_ids.extend(list(range(len(prompts))))

        # prompt the model (batchwise)
        responses = self.llm.llm_batch_chat(
            model=model,
            messages=batch_messages,
            response_model=response_model,
            capture_raw=True,
        )

        return responses, bm_sids, bm_ids

    def _iter_batches(self, sdoc_ids: list[int]):
        """Yield (batch_index, num_batches, batch_sdoc_ids)."""
        num_batches = (len(sdoc_ids) + BATCH_SIZE - 1) // BATCH_SIZE
        for i in range(0, len(sdoc_ids), BATCH_SIZE):
            yield i // BATCH_SIZE, num_batches, sdoc_ids[i : i + BATCH_SIZE]
