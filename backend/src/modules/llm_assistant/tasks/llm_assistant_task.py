import json
from abc import ABC, abstractmethod
from dataclasses import dataclass
from functools import partial
from typing import ClassVar, Generic, TypeVar, final
from uuid import uuid4

from loguru import logger
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.memo.memo_dto import MemoCreateIntern
from core.memo.memo_enum import AttachedObjectType
from core.memo.memo_service import MemoService
from core.prompt.prompt_enum import TaskType
from modules.llm_assistant.llm_assistant_enum import ApproachType
from modules.llm_assistant.llm_assistant_job_dto import (
    AnnotationLLMAssistantJobResult,
    LLMAssistantJobInput,
    LLMAssistantJobOutput,
    LLMAssistantResultWithStatus,
    MetadataExtractionLLMAssistantJobResult,
    SentenceAnnotationLLMAssistantJobResult,
    TaggingLLMAssistantJobResult,
)
from modules.llm_assistant.strategies.llm_assistant_strategy import LLMAssistantStrategy
from modules.llm_assistant.tasks.llm_assistant_document_processor import (
    LLMAssistantDocumentProcessor,
    LLMAssistantDocumentResponse,
)
from repos.llm_repo import LLMRepo
from systems.job_system.job_dto import Job

ResponseT = TypeVar("ResponseT", bound=BaseModel)
ResultT = TypeVar("ResultT", bound=LLMAssistantResultWithStatus)
StrategyT = TypeVar("StrategyT", bound=LLMAssistantStrategy)
# the title of the memos that store the LLM's reasoning of an annotation
REASONING_MEMO_TITLE = "LLM reasoning"
SpecificTaskResult = (
    TaggingLLMAssistantJobResult
    | MetadataExtractionLLMAssistantJobResult
    | AnnotationLLMAssistantJobResult
    | SentenceAnnotationLLMAssistantJobResult
)


@dataclass(frozen=True)
class LLMAssistantTaskContext(Generic[StrategyT]):
    """Provide the shared job inputs required by task-specific execution hooks."""

    db: Session
    payload: LLMAssistantJobInput
    strategy: StrategyT

    @property
    def virtual_user_id(self) -> int:
        """The virtual user the annotation tasks write into; the job input requires
        it for them and checks it before the job starts."""
        assert self.payload.virtual_user_id is not None
        return self.payload.virtual_user_id

    @property
    def is_fewshot(self) -> bool:
        """A prompt that shows examples makes a few-shot run."""
        return self.strategy.is_fewshot


def aggregate_raw_responses(raw_responses: list[str]) -> str:
    """Join multiple raw LLM responses into one user-visible value."""
    if len(raw_responses) == 1:
        return raw_responses[0]
    return "\n---\n".join(
        f"Response {i + 1} of {len(raw_responses)}:\n{raw}"
        for i, raw in enumerate(raw_responses)
    )


def create_reasoning_memos(
    context: LLMAssistantTaskContext[StrategyT],
    *,
    attached_object_type: AttachedObjectType,
    annotation_ids: list[int],
    reasonings: list[list[str]],
) -> None:
    """Store the LLM's reasonings of annotations as memos in one batch.

    Each annotation with a reasoning gets one memo, authored by the virtual user
    the annotations were created for; several reasonings (of merged suggestions)
    become one paragraph each.

    Args:
        attached_object_type: The type of the annotations.
        annotation_ids: The annotations, parallel to `reasonings`.
        reasonings: The reasonings of every annotation, possibly none.
    """
    attached_object_ids: list[int] = []
    create_dtos: list[MemoCreateIntern] = []
    for annotation_id, annotation_reasonings in zip(annotation_ids, reasonings):
        paragraphs = list(
            dict.fromkeys(
                reasoning.strip()
                for reasoning in annotation_reasonings
                if reasoning.strip()
            )
        )
        if not paragraphs:
            continue
        attached_object_ids.append(annotation_id)
        create_dtos.append(
            MemoCreateIntern(
                project_id=context.payload.project_id,
                uuid=str(uuid4()),
                user_id=context.virtual_user_id,
                title=REASONING_MEMO_TITLE,
                content="\n\n".join(paragraphs),
                # the BlockNote document the memo editor shows
                content_json=json.dumps(
                    [
                        {"type": "paragraph", "content": paragraph}
                        for paragraph in paragraphs
                    ]
                ),
            )
        )
    MemoService().create_multi_for_attached_objects(
        db=context.db,
        attached_object_type=attached_object_type,
        attached_object_ids=attached_object_ids,
        create_dtos=create_dtos,
    )
    logger.info("Created {} reasoning memo(s).", len(create_dtos))


class LLMAssistantTask(
    ABC,
    Generic[StrategyT, ResponseT, ResultT],
):
    """Define the shared execution lifecycle for every LLM assistant task.

    Subclasses provide the response model, optional preparation, per-document
    processing, and final output construction while this class fixes their order.
    """

    task_name: str
    task_type: ClassVar[TaskType]

    def __init__(self, llm: LLMRepo):
        self.document_processor = LLMAssistantDocumentProcessor(llm)

    @final
    def execute(
        self,
        *,
        db: Session,
        job: Job,
        payload: LLMAssistantJobInput,
        strategy: StrategyT,
    ) -> LLMAssistantJobOutput:
        """Run the fixed task lifecycle around task-specific execution hooks."""
        context = LLMAssistantTaskContext(db=db, payload=payload, strategy=strategy)
        approach_type = (
            ApproachType.LLM_FEW_SHOT
            if context.is_fewshot
            else ApproachType.LLM_ZERO_SHOT
        )
        self._start_job(job=job, num_documents=len(payload.sdoc_ids))
        logger.info(
            "Using model '{}', strategy '{}', and approach '{}'.",
            payload.model,
            strategy.__class__.__name__,
            approach_type.value,
        )
        self._prepare(context)
        self._update_progress(
            processed_documents=0,
            total_documents=len(payload.sdoc_ids),
            completed_requests=0,
            job=job,
        )

        documents = self.document_processor.process(
            model=payload.model,
            strategy=strategy,
            db=db,
            sdoc_ids=payload.sdoc_ids,
            response_model=self._get_response_model(strategy),
            on_progress=partial(self._update_progress, job=job),
        )
        results: list[ResultT] = []
        for document in documents:
            logger.info(
                "Processing {} LLM response(s) for document {}.",
                len(document.responses),
                document.sdoc_data.id,
            )
            result = self._process_document(context=context, document=document)
            results.append(result)
            logger.info(
                "Finished document {} with status '{}': {}",
                document.sdoc_data.id,
                result.status,
                result.status_message,
            )

        logger.info(
            "Finished {} task: {} successful, {} partial, {} failed document(s).",
            self.task_name,
            sum(result.status == "finished" for result in results),
            sum(result.status == "partial" for result in results),
            sum(result.status == "error" for result in results),
        )

        return LLMAssistantJobOutput(
            task_type=self.task_type,
            approach_type=approach_type,
            specific_task_result=self._build_result(results),
        )

    def _start_job(self, job: Job, num_documents: int) -> None:
        """Set and log the initial status for this task execution."""
        message = (
            f"Started LLMAssistantJob - {self.task_name}, num docs: {num_documents}"
        )
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
        message = (
            f"Processed {processed_documents} of {total_documents} documents "
            f"({completed_requests} LLM requests completed)"
        )
        job.update(
            current_step=1,
            status_message=message,
        )
        logger.info(message)

    def _prepare(
        self,
        context: LLMAssistantTaskContext[StrategyT],
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
        context: LLMAssistantTaskContext[StrategyT],
        document: LLMAssistantDocumentResponse[ResponseT],
    ) -> ResultT:
        """Validate, parse, deduplicate if needed, persist, and build the result for one document."""
        ...

    @abstractmethod
    def _build_result(self, results: list[ResultT]) -> SpecificTaskResult:
        """Wrap all per-document results in the task-specific job result."""
        ...
