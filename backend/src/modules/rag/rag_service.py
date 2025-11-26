from collections import defaultdict

from loguru import logger
from sqlalchemy.orm import Session

from common.singleton_meta import SingletonMeta
from core.doc.source_document_data_crud import crud_sdoc_data
from modules.simsearch.simsearch_service import SimSearchService
from repos.llm_repo import LLMRepo


class RAGService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.sims: SimSearchService = SimSearchService()
        cls.llm: LLMRepo = LLMRepo()
        return super(RAGService, cls).__new__(cls)

    def retrieval_augmented_generation_with_session(
        self,
        proj_id: int,
        query: str | list[str] | int,
        top_k: int,
        threshold: float,
        db: Session,
        session_id: str | None = None,
        sdoc_ids: list[int] | None = None,
    ) -> tuple[str, str]:
        # Retrieve top-k similar sentences using vector search
        similar_sentences = self.sims.find_similar_sentences(
            sdoc_ids_to_search=sdoc_ids,
            proj_id=proj_id,
            query=query,
            top_k=top_k,
            threshold=threshold,
        )

        # Group hits by source document ID
        sdoc_to_hits = defaultdict(list)
        for hit in similar_sentences:
            sdoc_to_hits[hit.sdoc_id].append(hit)

        extracted_sentences = []
        for sdoc_id, hits in sdoc_to_hits.items():
            sdoc_data = crud_sdoc_data.read(db=db, id=sdoc_id)
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

        response, session_id = self.llm.llm_chat_with_session(
            system_prompt="You are an assistant helping answer questions based on internal documentation.",
            user_prompt=RAG_PROMPT,
            session_id=session_id,
        )
        return response, session_id
