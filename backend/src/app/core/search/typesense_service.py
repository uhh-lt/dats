from typing import List, Tuple

import numpy as np
import typesense
from loguru import logger

from app.core.data.dto.search import SimSearchSentenceHit
from app.preprocessing.ray_model_service import RayModelService
from app.preprocessing.ray_model_worker.dto.clip import ClipTextEmbeddingInput
from app.util.singleton_meta import SingletonMeta
from config import conf


class TypesenseService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls._sentence_class_name = "Sentence"
        cls._image_class_name = "Image"
        cls._named_entity_class_name = "NamedEntity"
        cls._document_class_name = "Document"

        cls._common_fields = [
            {"name": "vec", "type": "float[]", "num_dim": 512},
            {"name": "project_id", "type": "int32"},
            {"name": "sdoc_id", "type": "int32"},
            {"name": "text", "type": "string"},
        ]

        cls._sentence_schema = {
            "name": cls._sentence_class_name,
            "fields": [
                *cls._common_fields,
                {"name": "sentence_id", "type": "int32"},
            ],
        }

        cls._document_schema = {
            "name": cls._document_class_name,
            "fields": cls._common_fields,
        }

        cls._colletions = {
            cls._sentence_class_name: cls._sentence_schema,
            cls._document_class_name: cls._document_schema,
        }

        try:
            cls._client = typesense.Client(
                {
                    "api_key": conf.typesense.api_key,
                    "nodes": [
                        {
                            "host": conf.typesense.host,
                            "port": conf.typesense.port,
                            "protocol": "http",
                        }
                    ],
                    "connection_timeout_seconds": 300,
                }
            )
            if kwargs["flush"] if "flush" in kwargs else False:
                logger.warning("Flushing DWTS Typesense Data!")
                cls._client.collections[cls._sentence_class_name].delete()
            collections = {c["name"] for c in cls._client.collections.retrieve()}
            for name, schema in cls._colletions.items():
                if name not in collections:
                    cls._client.collections.create(schema)

        except Exception as e:
            msg = f"Cannot connect or initialize to Typesense DB - Error '{e}'"
            logger.error(msg)
            raise SystemExit(msg)

        cls.rms = RayModelService()

        return super(TypesenseService, cls).__new__(cls)

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
            f"from SDoc {sdoc_id} in Project {proj_id} to Typesense ..."
        )
        sents = [
            {
                "id": f"{proj_id}-{sdoc_id}-{sent_id}",
                "project_id": proj_id,
                "sdoc_id": sdoc_id,
                "sentence_id": sent_id,
                "text": sentences[sent_id],
                "vec": sent_emb.tolist(),
            }
            for sent_id, sent_emb in enumerate(sentence_embs)
        ]
        res = self._client.collections[self._sentence_class_name].documents.import_(
            sents, {"action": "create"}
        )
        print(res)
        print("added sentences to TS", len(sents))
        documents = [
            {
                "id": f"{proj_id}-{sdoc_id}",
                "project_id": proj_id,
                "sdoc_id": sdoc_id,
                "text": " ".join(sentences),
                "vec": doc_emb.tolist(),
            }
        ]
        self._client.collections[self._document_class_name].documents.import_(
            documents, {"action": "create"}
        )

    def remove_text_sdoc_from_index(self, sdoc_id: int) -> None:
        logger.debug(f"Removing text SDoc {sdoc_id} from Index!")
        for name in self._colletions.keys():
            self._client.collections[name].documents.delete(
                {"filter_by": f"sdoc_id:={sdoc_id}"}
            )

    def remove_all_project_embeddings(
        self,
        proj_id: int,
    ) -> None:
        for name in self._colletions.keys():
            self._client.collections[name].documents.delete(
                {"filter_by": f"project_id:={proj_id}"}
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
