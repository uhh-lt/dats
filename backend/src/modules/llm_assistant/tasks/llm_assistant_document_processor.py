from collections.abc import Iterator
from dataclasses import dataclass
from time import monotonic
from typing import Generic, Type, TypeVar

from loguru import logger
from pydantic import BaseModel

from config import conf
from core.doc.source_document_data_crud import crud_sdoc_data
from core.doc.source_document_data_orm import SourceDocumentDataORM
from modules.llm_assistant.llm_assistant_exceptions import (
    LLMAssistantBatchProcessingError,
    LLMAssistantRequestsFailedError,
)
from modules.llm_assistant.strategies.llm_assistant_strategy import LLMAssistantStrategy
from repos.db.sql_repo import SQLRepo
from repos.llm_repo import LLMBatchChatResponse, LLMMessage, LLMRepo

LLM_REQUEST_BATCH_SIZE = conf.llm_assistant.request_batch_size
# the documents read, processed and committed together
DOCUMENT_BATCH_SIZE = conf.llm_assistant.document_read_batch_size

ResponseT = TypeVar("ResponseT", bound=BaseModel)


@dataclass(frozen=True)
class LLMAssistantWorkItem:
    """Associate one generated LLM message with its document and message index."""

    sdoc_id: int
    message_id: int
    message: LLMMessage


@dataclass(frozen=True)
class LLMAssistantResponseItem(Generic[ResponseT]):
    """Associate one LLM response with its message index within a document."""

    message_id: int
    response: LLMBatchChatResponse[ResponseT]


@dataclass(frozen=True)
class LLMAssistantDocumentResponse(Generic[ResponseT]):
    """Contain all LLM responses produced for one source document."""

    sdoc_data: SourceDocumentDataORM
    responses: list[LLMAssistantResponseItem[ResponseT]]


@dataclass(frozen=True)
class LLMAssistantDocumentBatch(Generic[ResponseT]):
    """The documents of a batch, each with its responses, and the documents of
    the batch that no longer exist (deleted since the job started)."""

    documents: list[LLMAssistantDocumentResponse[ResponseT]]
    missing_sdoc_ids: list[int]


def _raise_if_all_requests_failed(
    documents: list[LLMAssistantDocumentResponse[ResponseT]],
) -> None:
    """Raise `LLMAssistantRequestsFailedError` if the documents of a batch have
    responses and the LLM was unavailable for all of them (connection errors,
    timeouts, server errors): saving error results would burn through the
    whole corpus. A request that fails on every attempt (e.g. an exceeded
    context window) or an answer that cannot be parsed becomes an error result
    of its document."""
    responses = [item.response for document in documents for item in document.responses]
    if not responses or not all(response.unavailable for response in responses):
        return
    raise LLMAssistantRequestsFailedError(
        num_requests=len(responses), first_error=responses[0].error or "unknown"
    )


class LLMAssistantDocumentProcessor:
    """Generate and batch LLM requests while preserving document boundaries."""

    def __init__(self, llm: LLMRepo):
        self.llm = llm

    @staticmethod
    def _read_documents(
        sqlr: SQLRepo, sdoc_ids: list[int]
    ) -> dict[int, SourceDocumentDataORM]:
        """Read the data of the documents that still exist, by id, in a short
        transaction of its own. The documents are detached with their loaded
        columns, so they stay readable once it closed: no transaction stays open
        during the LLM requests."""
        with sqlr.transaction() as db:
            sdoc_data_by_id = crud_sdoc_data.read_existing_by_ids(db=db, ids=sdoc_ids)
            db.expunge_all()
        return sdoc_data_by_id

    def process(
        self,
        *,
        model: str,
        strategy: LLMAssistantStrategy,
        sqlr: SQLRepo,
        sdoc_ids: list[int],
        response_model: Type[ResponseT],
    ) -> Iterator[LLMAssistantDocumentBatch[ResponseT]]:
        """Yield the documents in batches of `DOCUMENT_BATCH_SIZE`, in the order of
        `sdoc_ids`, each document with the responses to all its prompts, and the
        documents of the batch that no longer exist. The prompts of a batch are
        sent in bounded batches of LLM requests. Raises
        `LLMAssistantRequestsFailedError` before it yields a batch whose requests
        all failed without a response."""
        total_documents = len(sdoc_ids)
        processed_documents = 0
        completed_requests = 0
        submitted_batches = 0

        logger.info(
            "Starting LLM document processing for {} document(s) with request batch size {}.",
            total_documents,
            LLM_REQUEST_BATCH_SIZE,
        )

        for start in range(0, total_documents, DOCUMENT_BATCH_SIZE):
            batch_sdoc_ids = sdoc_ids[start : start + DOCUMENT_BATCH_SIZE]
            sdoc_data_by_id = self._read_documents(sqlr=sqlr, sdoc_ids=batch_sdoc_ids)
            sdoc_datas = [
                sdoc_data_by_id[sdoc_id]
                for sdoc_id in batch_sdoc_ids
                if sdoc_id in sdoc_data_by_id
            ]
            work: list[LLMAssistantWorkItem] = []
            for sdoc_data in sdoc_datas:
                prompts = list(strategy.generate_prompts(sdoc_data=sdoc_data))
                logger.info(
                    "Split document {} into {} prompt(s).",
                    sdoc_data.id,
                    len(prompts),
                )
                work.extend(
                    LLMAssistantWorkItem(
                        sdoc_id=sdoc_data.id, message_id=message_id, message=prompt
                    )
                    for message_id, prompt in enumerate(prompts)
                )

            responses_by_sdoc: dict[int, list[LLMAssistantResponseItem[ResponseT]]] = {
                sdoc_data.id: [] for sdoc_data in sdoc_datas
            }
            for chunk_start in range(0, len(work), LLM_REQUEST_BATCH_SIZE):
                submitted_batches += 1
                chunk = work[chunk_start : chunk_start + LLM_REQUEST_BATCH_SIZE]
                responses = self._submit(
                    model=model,
                    work=chunk,
                    response_model=response_model,
                    batch_number=submitted_batches,
                )
                for item, response in zip(chunk, responses):
                    responses_by_sdoc[item.sdoc_id].append(
                        LLMAssistantResponseItem(
                            message_id=item.message_id, response=response
                        )
                    )
                completed_requests += len(chunk)

            documents = [
                LLMAssistantDocumentResponse(
                    sdoc_data=sdoc_data, responses=responses_by_sdoc[sdoc_data.id]
                )
                for sdoc_data in sdoc_datas
            ]
            _raise_if_all_requests_failed(documents)
            yield LLMAssistantDocumentBatch(
                documents=documents,
                missing_sdoc_ids=[
                    sdoc_id
                    for sdoc_id in batch_sdoc_ids
                    if sdoc_id not in sdoc_data_by_id
                ],
            )
            processed_documents += len(batch_sdoc_ids)

        logger.info(
            "Finished LLM document processing: {} document(s), {} request(s), {} batch(es).",
            processed_documents,
            completed_requests,
            submitted_batches,
        )

    def _submit(
        self,
        *,
        model: str,
        work: list[LLMAssistantWorkItem],
        response_model: Type[ResponseT],
        batch_number: int,
    ) -> list[LLMBatchChatResponse[ResponseT]]:
        """Send one bounded batch of LLM requests and wait for all responses."""
        logger.info(
            "Submitting LLM batch {} with {} prompt(s) for {} document(s).",
            batch_number,
            len(work),
            len({item.sdoc_id for item in work}),
        )
        started_at = monotonic()
        responses = self.llm.llm_batch_chat(
            model=model,
            messages=[item.message for item in work],
            response_model=response_model,
            capture_raw=True,
        )
        if len(responses) != len(work):
            raise LLMAssistantBatchProcessingError(
                "The LLM returned a different number of responses than requests"
            )

        logger.debug(
            "--- LLM responses for batch {} ---\n{}\n--- End LLM responses ---",
            batch_number,
            "\n\n".join(
                f"--- Document {item.sdoc_id}, prompt chunk {item.message_id} ---\n"
                f"Error: {response.error or '<none>'}\n"
                f"Raw:\n{response.raw or '<none>'}"
                for item, response in zip(work, responses)
            ),
        )
        failed_requests = sum(response.is_error for response in responses)
        logger.info(
            "Completed LLM batch {} in {:.2f}s: {} successful, {} failed request(s).",
            batch_number,
            monotonic() - started_at,
            len(work) - failed_requests,
            failed_requests,
        )
        return responses
