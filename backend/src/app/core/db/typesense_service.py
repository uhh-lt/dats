from typing import List, Tuple

import numpy as np
import typesense
from loguru import logger

from app.core.data.dto.search import SimSearchImageHit, SimSearchSentenceHit
from app.core.db.index_type import IndexType
from app.core.db.vector_index_service import VectorIndexService
from config import conf


class TypesenseService(VectorIndexService):
    def __new__(cls, *args, **kwargs):
        cls._sentence_class_name = "Sentence"
        cls._image_class_name = "Image"
        cls._named_entity_class_name = "NamedEntity"
        cls._document_class_name = "Document"

        cls.class_names = {
            IndexType.SENTENCE: cls._sentence_class_name,
            IndexType.IMAGE: cls._image_class_name,
            IndexType.NAMED_ENTITY: cls._named_entity_class_name,
            IndexType.DOCUMENT: cls._document_class_name,
        }

        cls._common_fields = [
            {"name": "vec", "type": "float[]", "num_dim": 512},
            {"name": "project_id", "type": "int32"},
            {"name": "sdoc_id", "type": "int32"},
            {"name": "text", "type": "string"},
            {"name": "sentence_id", "type": "int32"},
        ]

        cls._sentence_schema = {
            "name": cls._sentence_class_name,
            "fields": [*cls._common_fields],
        }

        cls._document_schema = {
            "name": cls._document_class_name,
            "fields": cls._common_fields,
        }

        cls._image_schema = {
            "name": cls._image_class_name,
            "fields": cls._common_fields,
        }

        cls._colletions = {
            cls._sentence_class_name: cls._sentence_schema,
            cls._document_class_name: cls._document_schema,
            cls._image_class_name: cls._image_schema,
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
                cls._client.collections[cls._sentence_class_name].delete() # type: ignore
            collections = {c["name"] for c in cls._client.collections.retrieve()}
            for name, schema in cls._colletions.items():
                if name not in collections:
                    cls._client.collections.create(schema)

        except Exception as e:
            msg = f"Cannot connect or initialize to Typesense DB - Error '{e}'"
            logger.error(msg)
            raise SystemExit(msg)

        return super(TypesenseService, cls).__new__(cls)

    def add_embeddings_to_index(
        self, type: IndexType, proj_id: int, sdoc_id: int, embeddings: List[np.ndarray]
    ):
        collection_name = self.class_names[type]
        logger.debug(
            f"Adding {len(embeddings)} embeddeddings "
            f"from SDoc {sdoc_id} in Project {proj_id} to Typesense ..."
        )
        sents = [
            {
                "id": (
                    f"{sdoc_id}-{sent_id}"
                    if type == IndexType.SENTENCE
                    else str(sdoc_id)
                ),
                "project_id": proj_id,
                "sdoc_id": sdoc_id,
                "sentence_id": sent_id,
                "vec": sent_emb.tolist(),
            }
            for sent_id, sent_emb in enumerate(embeddings)
        ]
        res = self._client.collections[collection_name].documents.import_( # type: ignore
            sents, {"action": "create"}
        )
        print(res)
        print("added sentences to TS", len(sents))

    def remove_embeddings_from_index(self, type: IndexType, sdoc_id: int):
        logger.debug(f"Removing text SDoc {sdoc_id} from Index!")
        self._client.collections[self.class_names[type]].documents.delete( # type: ignore
            {"filter_by": f"sdoc_id:={sdoc_id}"}
        )

    def remove_project_from_index(
        self,
        proj_id: int,
    ) -> None:
        for name in self._colletions.keys():
            self._client.collections[name].documents.delete( # type: ignore
                {"filter_by": f"project_id:={proj_id}"}
            )

    def search_index(
        self,
        proj_id: int,
        index_type: IndexType,
        query_emb: np.ndarray,
        sdoc_ids_to_search: List[int],
        top_k: int = 10,
        threshold: float = 0.0,
    ) -> List[SimSearchSentenceHit] | List[SimSearchImageHit]:

        results = self._client.collections[
            self.class_names[index_type]
        ].documents.search( # type: ignore
            {
                "vector_query": f"vec:({query_emb.tolist()}, k:{top_k})",
                "filter_by": f"project_id:= {proj_id}",
                "include_fields": "id,sdoc_id,sentence_id",
            }
        )

        if index_type == IndexType.SENTENCE:
            return [
                SimSearchSentenceHit(
                    sdoc_id=r["document"]["sdoc_id"],
                    sentence_id=r["document"]["sentence_id"],
                    score=r["vector_distance"],
                )
                for r in results
            ]
        else:
            return [
                SimSearchImageHit(
                    sdoc_id=r["document"]["sdoc_id"],
                    score=r["vector_distance"],
                )
                for r in results
            ]

    def suggest(
        self,
        index_type: IndexType,
        proj_id: int,
        sdoc_sent_ids: List[Tuple[int, int]],
    ) -> List[SimSearchSentenceHit]:
        candidates: List[SimSearchSentenceHit] = []
        vc = "vector_query"
        queries = [
            {vc: f"vec:([], id: {sdoc_id}-{sent_id}, k:1)"}
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

        return candidates

    def get_sentence_embeddings(self, search_tuples: List[Tuple[int, int]],) -> np.ndarray:
        # TODO implement
        raise NotImplementedError("get_sentence_embeddings not implemented for typesense")
