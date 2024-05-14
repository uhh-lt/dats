from pathlib import Path
from typing import List, Tuple

import numpy as np
from loguru import logger
from qdrant_client import QdrantClient
from qdrant_client.conversions.common_types import PointStruct, VectorParams
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    FilterSelector,
    MatchValue,
    PointIdsList,
)

from app.core.data.crud.source_document import crud_sdoc
from app.core.data.doc_type import DocType
from app.core.data.dto.search import SimSearchSentenceHit
from app.core.data.dto.source_document import SourceDocumentRead
from app.preprocessing.ray_model_service import RayModelService
from app.preprocessing.ray_model_worker.dto.clip import (
    ClipImageEmbeddingInput,
    ClipTextEmbeddingInput,
)
from app.util.singleton_meta import SingletonMeta
from config import conf
import uuid


class QdrantService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls._sentence_class_name = "Sentence"
        cls._document_class_name = "Document"
        cls._image_class_name = "Image"
        cls._colletions = [
            cls._sentence_class_name,
            cls._document_class_name,
            cls._image_class_name,
        ]

        try:
            cls._client = QdrantClient(
                host=conf.qdrant.host,
                grpc_port=conf.qdrant.grpc_port,
                prefer_grpc=True,
            )
            collections = {c.name for c in cls._client.get_collections().collections}
            if kwargs["flush"] if "flush" in kwargs else False:
                logger.warning("Flushing DWTS Qdrant Data!")
                for c in collections:
                    cls._client.delete_collection(c)
                collections.clear()
            for name in cls._colletions:
                if name not in collections:
                    res = cls._client.create_collection(
                        name,
                        vectors_config=VectorParams(size=512, distance=Distance.COSINE),
                    )
                    print(res)

        except Exception as e:
            msg = f"Cannot connect or initialize to Qdrant DB - Error '{e}'"
            logger.error(msg)
            raise SystemExit(msg)

        cls.rms = RayModelService()

        return super(QdrantService, cls).__new__(cls)

    def add_image_sdoc_to_index(self, proj_id: int, sdoc_id: int) -> None:
        image_emb = self._encode_image(image_sdoc_id=sdoc_id)
        logger.debug(f"Adding image SDoc {sdoc_id} in Project {proj_id} to Qdrant ...")
        self._client.upsert(
            self._image_class_name,
            [
                PointStruct(
                    id=sdoc_id,
                    vector=image_emb.tolist(),
                    payload={
                        "project_id": proj_id,
                        "sdoc_id": sdoc_id,
                    },
                )
            ],
        )

    def add_text_sdoc_to_index(
        self,
        proj_id: int,
        sdoc_id: int,
        sentences: List[str],
    ) -> None:
        sentence_embs = self.rms.clip_text_embedding(
            ClipTextEmbeddingInput(text=sentences)
        ).numpy()

        # create cheap&easy (but suboptimal) document embeddings for now
        doc_emb = sentence_embs.sum(axis=0)
        doc_emb /= np.linalg.norm(doc_emb)

        logger.debug(
            f"Adding {len(sentence_embs)} sentences "
            f"from SDoc {sdoc_id} in Project {proj_id} to Qdrant ..."
        )
        sents = [
            PointStruct(
                id=str(uuid.UUID(int=(proj_id << 64) + sent_id)),
                vector=sent_emb.tolist(),
                payload={
                    "project_id": proj_id,
                    "sdoc_id": sdoc_id,
                    "sentence_id": sent_id,
                    "text": sentences[sent_id],
                },
            )
            for sent_id, sent_emb in enumerate(sentence_embs)
        ]
        try:
            self._client.upsert(self._sentence_class_name, sents)
            print("added sentences to Qdrant", len(sents))
        except Exception as e:
            print("failed to add to qdrant", e)
        document = PointStruct(
            id=sdoc_id,
            vector=doc_emb.tolist(),
            payload={
                "project_id": proj_id,
                "sdoc_id": sdoc_id,
                "text": " ".join(sentences),
            },
        )
        self._client.upsert(self._document_class_name, [document])

    def remove_text_sdoc_from_index(self, sdoc_id: int) -> None:
        logger.debug(f"Removing text SDoc {sdoc_id} from Index!")
        self._client.delete(
            self._document_class_name, points_selector=PointIdsList(points=[sdoc_id])
        )
        self._client.delete(
            self._sentence_class_name,
            points_selector=FilterSelector(
                filter=Filter(
                    must=[
                        FieldCondition(key="sdoc_id", match=MatchValue(value=sdoc_id))
                    ]
                )
            ),
        )

    def remove_sdoc_from_index(self, doctype: str, sdoc_id: int):
        match doctype:
            case DocType.text:
                self.remove_text_sdoc_from_index(sdoc_id)
            case DocType.image:
                self.remove_image_sdoc_from_index(sdoc_id)
            case _:
                # Other doctypes are not used for simsearch
                pass

    def remove_image_sdoc_from_index(self, sdoc_id: int) -> None:
        logger.debug(f"Removing image SDoc {sdoc_id} from Index!")
        self._client.delete(
            self._image_class_name, points_selector=PointIdsList(points=[sdoc_id])
        )

    def remove_all_project_embeddings(
        self,
        proj_id: int,
    ) -> None:
        for name in self._colletions:
            self._client.delete(
                name,
                points_selector=FilterSelector(
                    filter=Filter(
                        must=[
                            FieldCondition(
                                key="proj_id", match=MatchValue(value=proj_id)
                            )
                        ]
                    )
                ),
            )

    def suggest_similar_sentences(
        self, proj_id: int, sdoc_sent_ids: List[Tuple[int, int]]
    ) -> List[SimSearchSentenceHit]:
        return self.__suggest(proj_id, sdoc_sent_ids)

    def __suggest(
        self,
        proj_id: int,
        sdoc_sent_ids: List[Tuple[int, int]],
        top_k: int = 10,
        threshold: float = 0.0,
    ) -> List[SimSearchSentenceHit]:
        candidates: List[SimSearchSentenceHit] = []
        vc = "vector_query"
        queries = [
            {vc: f"vec:([], id: {proj_id}-{sdoc_id}-{sent_id}, k:1)"}
            for sdoc_id, sent_id in sdoc_sent_ids
        ]

        res = self._client.multi_search.perform(
            {"searches": queries},
            {
                "collection": self._sentence_class_name,
                "q": "*",
                "filter_by": f"project_id:= {proj_id}",
                "include_fields": "id,sdoc_id,sentence_id",
            },
        )

        for r in res["results"]:
            for hit in r["hits"]:
                candidates.append(
                    SimSearchSentenceHit(
                        sdoc_id=hit["document"]["sdoc_id"],
                        score=hit["vector_distance"],
                        sentence_id=hit["document"]["sentence_id"],
                    )
                )

        candidates.sort(key=lambda x: (x.sdoc_id, x.sentence_id))
        hits = self.__unique_consecutive(candidates)
        hits = [h for h in hits if (h.sdoc_id, h.sentence_id) not in sdoc_sent_ids]
        return hits

    def __unique_consecutive(self, hits: List[SimSearchSentenceHit]):
        result = []
        current = SimSearchSentenceHit(sdoc_id=-1, sentence_id=-1, score=0.0)
        for hit in hits:
            if hit.sdoc_id != current.sdoc_id or hit.sentence_id != current.sentence_id:
                current = hit
                result.append(hit)
        return result

    def _encode_image(self, image_sdoc_id: int) -> np.ndarray:
        query_image_path = self._get_image_path_from_sdoc_id(sdoc_id=image_sdoc_id)
        # FIXME HACK FOR LOCAL RUN
        query_image_path = Path(
            str(query_image_path).replace(conf.repo.root_directory, "/tmp/dwts")
        )

        encoded_query = self.rms.clip_image_embedding(
            ClipImageEmbeddingInput(image_fps=[str(query_image_path)])
        )
        return encoded_query.numpy().squeeze()

    def _get_image_path_from_sdoc_id(self, sdoc_id: int) -> Path:
        with self.sqls.db_session() as db:
            sdoc = SourceDocumentRead.model_validate(crud_sdoc.read(db=db, id=sdoc_id))
            assert (
                sdoc.doctype == DocType.image
            ), f"SourceDocument with {sdoc_id=} is not an image!"
        return self.repo.get_path_to_sdoc_file(sdoc=sdoc, raise_if_not_exists=True)
