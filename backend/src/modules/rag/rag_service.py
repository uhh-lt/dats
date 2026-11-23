from collections import defaultdict

from loguru import logger
from sqlalchemy.orm import Session

from common.singleton_meta import SingletonMeta
from core.artefacts.sentence_embeddings.sentence_embedding_crud import (
    crud_sentence_embedding,
)
from core.artefacts.tokens_sentences.tokens_sentences_artefact import TOKENS_SENTENCES
from modules.rag.rag_dto import ChatSessionResponse
from repos.llm_repo import LLMRepo
from repos.ray.dto.clip import ClipTextEmbeddingInput
from repos.ray.ray_repo import RayRepo
from repos.vector.weaviate_repo import WeaviateRepo


class RAGService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.llm: LLMRepo = LLMRepo()
        cls.ray: RayRepo = RayRepo()
        cls.weaviate: WeaviateRepo = WeaviateRepo()
        return super(RAGService, cls).__new__(cls)

    def retrieval_augmented_generation_with_session(
        self,
        project_id: int,
        query: str,
        top_k: int,
        threshold: float,
        model: str,
        db: Session,
        session_id: str | None = None,
        sdoc_ids: list[int] | None = None,
    ) -> ChatSessionResponse:
        # Retrieve the top-k sentences most similar to the query text
        query_emb = self.ray.clip_text_embedding(
            ClipTextEmbeddingInput(text=[query])
        ).numpy()[0]
        similar_sentences = crud_sentence_embedding.search_near_vector_in_sdoc_ids(
            client=self.weaviate.get_client(),
            vector=query_emb.tolist(),
            project_id=project_id,
            k=top_k,
            threshold=threshold,
            sdoc_ids=sdoc_ids,
        )

        # Group hits by source document ID
        sdoc_to_hits = defaultdict(list)
        for hit in similar_sentences:
            sdoc_to_hits[hit.id.sdoc_id].append(hit.id)

        extracted_sentences = []
        for sdoc_id, hits in sdoc_to_hits.items():
            sdoc_data = TOKENS_SENTENCES.store.read(db=db, sdoc_id=sdoc_id)
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
            model=model,
            system_prompt="You are an assistant helping answer questions based on internal documentation.",
            user_prompt=RAG_PROMPT,
            session_id=session_id,
        )
        return ChatSessionResponse(session_id=session_id, response=response.strip())

    def chat_with_session(
        self, *, model: str, prompt: str, session_id: str | None = None
    ) -> ChatSessionResponse:
        response, session_id = self.llm.llm_chat_with_session(
            model=model,
            system_prompt="You are having a chat session with a user. Respond to their queries.",
            user_prompt=prompt,
            session_id=session_id,
        )
        return ChatSessionResponse(session_id=session_id, response=response.strip())
