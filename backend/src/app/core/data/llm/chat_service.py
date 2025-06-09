from collections import defaultdict
from typing import List, Optional, Union

from app.core.data.crud.source_document import crud_sdoc
from app.core.data.dto.chat import LLMSessionResponse
from app.core.data.llm.ollama_service import OllamaService
from app.core.search.filtering import Filter
from app.core.search.sdoc_search import sdoc_search
from app.core.search.sdoc_search.sdoc_search_columns import SdocColumns
from loguru import logger
from pydantic import BaseModel
from sqlalchemy.orm import Session


class RAGResult(BaseModel):
    answer: str


def retrieval_augmented_generation_with_session(
    proj_id: int,
    query: Union[str, List[str], int],
    top_k: int,
    threshold: float,
    filter: Filter[SdocColumns],
    db: Session,
    session_id: Optional[str] = None,
) -> LLMSessionResponse:
    # Retrieve top-k similar sentences using vector search
    similar_sentences = sdoc_search.find_similar_sentences(
        proj_id=proj_id,
        query=query,
        top_k=top_k,
        threshold=threshold,
        filter=filter,
    )

    # Group hits by source document ID
    sdoc_to_hits = defaultdict(list)
    for hit in similar_sentences:
        sdoc_to_hits[hit.sdoc_id].append(hit)

    extracted_sentences = []
    for sdoc_id, hits in sdoc_to_hits.items():
        sdoc_data = crud_sdoc.read_data(db=db, id=sdoc_id)
        for hit in hits:
            try:
                sentence_text = sdoc_data.sentences[hit.sentence_id]
                extracted_sentences.append(sentence_text)
            except IndexError:
                logger.warning(
                    f"Invalid sentence_id={hit.sentence_id} for sdoc_id={sdoc_id}"
                )

    context = "\n".join(extracted_sentences)

    RAG_PROMPT = (
        f"Use the following context to answer the question.\n\n"
        f"Context:\n{context}\n\n"
        f"Question: {query}\n"
        f"Answer:"
    )

    response, session_id = OllamaService().llm_chat_with_session(
        system_prompt="You are an assistant helping answer questions based on internal documentation.",
        user_prompt=RAG_PROMPT,
        session_id=session_id,
    )

    logger.info("Got chat response for RAG!")
    return LLMSessionResponse(
        session_id=session_id,
        response=response.strip(),
    )


def chat_session(prompt: str, session_id: Optional[str] = None) -> LLMSessionResponse:
    response, session_id = OllamaService().llm_chat_with_session(
        system_prompt="You are having a chat session with a user. Respond to their queries.",
        user_prompt=prompt,
        session_id=session_id,
    )
    print(f"Chat session ID: {session_id}")
    print(f"Response: {response}")
    return LLMSessionResponse(
        session_id=session_id,
        response=response.strip(),
    )
