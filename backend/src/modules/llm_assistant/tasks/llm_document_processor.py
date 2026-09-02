from collections.abc import Callable, Iterator
from dataclasses import dataclass
from typing import Generic, Type, TypeVar

from pydantic import BaseModel
from sqlalchemy.orm import Session

from config import conf
from core.doc.source_document_data_crud import crud_sdoc_data
from core.doc.source_document_data_orm import SourceDocumentDataORM
from core.metadata.source_document_metadata_crud import crud_sdoc_meta
from modules.llm_assistant.llm_exceptions import LLMBatchProcessingError
from modules.llm_assistant.strategies.llm_strategy import LLMStrategy
from repos.llm_repo import LLMBatchChatResponse, LLMMessage, LLMRepo

LLM_REQUEST_BATCH_SIZE = conf.llm_assistant.request_batch_size
DOCUMENT_READ_BATCH_SIZE = conf.llm_assistant.document_read_batch_size

ResponseT = TypeVar("ResponseT", bound=BaseModel)
ProgressCallback = Callable[[int, int, int], None]


@dataclass(frozen=True)
class LLMWorkItem:
    """Associate one generated LLM message with its document and message index."""

    sdoc_id: int
    message_id: int
    message: LLMMessage


@dataclass(frozen=True)
class LLMResponseItem(Generic[ResponseT]):
    """Associate one LLM response with its message index within a document."""

    message_id: int
    response: LLMBatchChatResponse[ResponseT]


@dataclass(frozen=True)
class LLMDocumentResponse(Generic[ResponseT]):
    """Contain all LLM responses produced for one source document."""

    sdoc_data: SourceDocumentDataORM
    responses: list[LLMResponseItem[ResponseT]]


class LLMDocumentProcessor:
    """Generate and batch LLM requests while preserving document boundaries."""

    def __init__(self, llm: LLMRepo):
        self.llm = llm

    def _iter_sdoc_datas(
        self, db: Session, sdoc_ids: list[int]
    ) -> Iterator[SourceDocumentDataORM]:
        """Load source-document data incrementally in bounded database batches."""
        for start in range(0, len(sdoc_ids), DOCUMENT_READ_BATCH_SIZE):
            yield from crud_sdoc_data.read_by_ids(
                db=db,
                ids=sdoc_ids[start : start + DOCUMENT_READ_BATCH_SIZE],
            )

    def process(
        self,
        *,
        model: str,
        strategy: LLMStrategy,
        db: Session,
        sdoc_ids: list[int],
        response_model: Type[ResponseT],
        on_progress: ProgressCallback,
    ) -> Iterator[LLMDocumentResponse[ResponseT]]:
        """Yield complete document responses from bounded batches of LLM requests."""
        pending_work: list[LLMWorkItem] = []
        responses_by_sdoc: dict[int, list[LLMResponseItem[ResponseT]]] = {}
        completed_documents: list[SourceDocumentDataORM] = []
        processed_documents = 0
        completed_requests = 0
        total_documents = len(sdoc_ids)

        def submit_pending_work() -> None:
            """Submit and record the current bounded batch of LLM requests."""
            nonlocal completed_requests
            if len(pending_work) == 0:
                return

            batch_responses = self.llm.llm_batch_chat(
                model=model,
                messages=[work.message for work in pending_work],
                response_model=response_model,
                capture_raw=True,
            )
            if len(batch_responses) != len(pending_work):
                raise LLMBatchProcessingError(
                    "The LLM returned a different number of responses than requests"
                )

            for work, response in zip(pending_work, batch_responses):
                responses_by_sdoc.setdefault(work.sdoc_id, []).append(
                    LLMResponseItem(
                        message_id=work.message_id,
                        response=response,
                    )
                )
            completed_requests += len(pending_work)
            pending_work.clear()

        def take_completed_documents() -> list[LLMDocumentResponse[ResponseT]]:
            """Collect responses for documents whose prompts have all been generated."""
            nonlocal completed_documents
            result = [
                LLMDocumentResponse(
                    sdoc_data=sdoc_data,
                    responses=responses_by_sdoc.pop(sdoc_data.id, []),
                )
                for sdoc_data in completed_documents
            ]
            completed_documents = []
            return result

        def yield_completed_documents() -> Iterator[LLMDocumentResponse[ResponseT]]:
            """Yield completed documents and report progress after each is consumed."""
            nonlocal processed_documents
            for document_response in take_completed_documents():
                yield document_response
                processed_documents += 1
                on_progress(
                    processed_documents,
                    total_documents,
                    completed_requests,
                )

        for sdoc_data in self._iter_sdoc_datas(db=db, sdoc_ids=sdoc_ids):
            language = crud_sdoc_meta.read_by_sdoc_and_key(
                db=db, sdoc_id=sdoc_data.id, key="language"
            ).str_value
            if language is None:
                raise LLMBatchProcessingError(
                    f"Document with ID {sdoc_data.id} has no language!"
                )

            for message_id, prompt in enumerate(
                strategy.generate_prompts(
                    language=language,
                    sdoc_data=sdoc_data,
                )
            ):
                pending_work.append(
                    LLMWorkItem(
                        sdoc_id=sdoc_data.id,
                        message_id=message_id,
                        message=prompt,
                    )
                )
                if len(pending_work) < LLM_REQUEST_BATCH_SIZE:
                    continue

                submit_pending_work()
                yield from yield_completed_documents()

            completed_documents.append(sdoc_data)
            if len(pending_work) > 0:
                continue

            yield from yield_completed_documents()

        submit_pending_work()
        yield from yield_completed_documents()
