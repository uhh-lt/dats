from typing import Dict

import weaviate
import numpy as np
from tqdm import tqdm

from app.util.singleton_meta import SingletonMeta
from app.core.search.index_type import IndexType
from config import conf
from loguru import logger


class SimSearchService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls._sentence_class_name = "Sentence"
        cls._image_class_name = "Image"

        cls.class_names = {
            IndexType.TEXT: cls._sentence_class_name,
            IndexType.IMAGE: cls._image_class_name,
        }

        cls._common_properties = [
            {
                "name": "project_id",
                "description": "The id of the project this sentence belongs to",
                "dataType": ["int"],
            },
        ]

        cls._sentence_class_obj = {
            "class": cls._sentence_class_name,
            "vectorizer": "none",
            "properties": [
                *cls._common_properties,
                {
                    "name": "sentence_id",
                    "description": "The id of this sentence",
                    "dataType": ["int"],
                },
            ],
        }

        cls._image_class_obj = {
            "class": cls._image_class_name,
            "vectorizer": "none",
            "properties": [
                *cls._common_properties,
                {
                    "name": "sdoc_id",
                    "description": "The sdoc id of this image",
                    "dataType": ["int"],
                },
            ],
        }

        try:
            # setup weaviate client
            w_host = conf.weaviate.host
            w_port = conf.weaviate.port
            url = f"http://{w_host}:{w_port}"
            cls._client = weaviate.Client(url)

            if not cls._client.is_ready():
                msg = f"Weaviate client at {url} not ready!"
                logger.error(msg)
                raise RuntimeError(msg)

            cls._client.batch.configure(
                batch_size=100,
                num_workers=2,
            )

            if kwargs["flush"] if "flush" in kwargs else False:
                logger.warning("Flushing DWTS Weaviate Data!")
                if cls._client.schema.exists(cls._sentence_class_name):
                    cls._client.schema.delete_class(cls._sentence_class_name)
                if cls._client.schema.exists(cls._image_class_name):
                    cls._client.schema.delete_class(cls._image_class_name)

            # create classes
            if not cls._client.schema.exists(cls._sentence_class_name):
                logger.debug(f"Creating class {cls._sentence_class_obj}!")
                cls._client.schema.create_class(cls._sentence_class_obj)
            if not cls._client.schema.exists(cls._image_class_name):
                logger.debug(f"Creating class {cls._image_class_obj}!")
                cls._client.schema.create_class(cls._image_class_obj)

        except Exception as e:
            msg = f"Cannot connect or initialize to Weaviate DB - Error '{e}'"
            logger.error(msg)
            raise SystemExit(msg)

        return super(SimSearchService, cls).__new__(cls)

    def add_embeddings_to_index(
        self,
        proj_id: int,
        embeddings: np.ndarray,
        embedding_ids: np.ndarray,
        index_type: IndexType,
    ) -> None:
        if not embedding_ids.shape[0] == embeddings.shape[0]:
            msg = "Embeddings and embedding_ids must have the same length!"
            logger.error(msg)
            raise ValueError(msg)

        with self._client.batch as batch:
            for emb, emb_id in tqdm(
                zip(embeddings.tolist(), embedding_ids.tolist()),
                desc="Adding embeddings to Weaviate DB ... ",
                total=len(embeddings),
            ):
                if index_type == IndexType.TEXT:
                    data_obj = {
                        "project_id": proj_id,
                        "sentence_id": emb_id,
                    }
                elif index_type == IndexType.IMAGE:
                    data_obj = {
                        "project_id": proj_id,
                        "sdoc_id": emb_id,
                    }
                else:
                    msg = f"Unknown IndexType '{index_type}'!"
                    logger.error(msg)
                    raise ValueError(msg)

                batch.add_data_object(
                    data_object=data_obj,
                    class_name=self.class_names[index_type],
                    vector=emb,
                )

    def remove_embeddings_from_index(
        self,
        proj_id: int,
        embedding_ids: np.ndarray,
        index_type: IndexType,
    ) -> None:
        logger.debug(
            f"Removing {len(embedding_ids)} embeddings to {index_type} index of Project {proj_id}!"
        )
        if embedding_ids.shape == ():
            embedding_ids = np.asarray([embedding_ids])

        for emb_id in embedding_ids:
            if index_type == IndexType.TEXT:
                obj_id = self._get_sentence_object_id_by_sentence_id(emb_id)
            elif index_type == IndexType.IMAGE:
                obj_id = self._get_image_object_id_by_sdoc_id(emb_id)
            else:
                msg = f"Unknown IndexType '{index_type}'!"
                logger.error(msg)
                raise ValueError(msg)
            self._client.data_object.delete(
                uuid=obj_id,
                class_name=self.class_names[index_type],
            )

    def remove_all_project_embeddings(
        self,
        proj_id: int,
    ) -> None:
        for class_name in self.class_names.values():
            logger.debug(f"Removing all {class_name} embeddings of Project {proj_id}!")

            self._client.batch.delete_objects(
                class_name=class_name,
                where={
                    "path": ["project_id"],
                    "operator": "Equal",
                    "valueInt": proj_id,
                },
            )

    def _get_num_of_objects(self, index_type: IndexType) -> int:
        return (
            self._client.query.aggregate(self.class_names[index_type]).with_meta_count()
        ).do()["data"]["Aggregate"][self.class_names[index_type]][0]["meta"]["count"]

    def _get_image_object_id_by_sdoc_id(
        self,
        sdoc_id: int,
    ) -> str:
        id_filter = {
            "path": ["sdoc_id"],
            "operator": "Equal",
            "valueInt": sdoc_id,
        }
        response = (
            self._client.query.get(self.class_names[IndexType.IMAGE], ["sdoc_id"])
            .with_where(id_filter)
            .with_additional("id")
            .do()
        )
        if len(response["data"]["Get"][self.class_names[IndexType.IMAGE]]) == 0:
            msg = f"No Sentence with sentence_id {sdoc_id} found!"
            logger.error(msg)
            raise KeyError(msg)

        return response["data"]["Get"][self.class_names[IndexType.IMAGE]][0][
            "_additional"
        ]["id"]

    def _get_sentence_object_id_by_sentence_id(
        self,
        sentence_id: int,
    ) -> str:
        id_filter = {
            "path": ["sentence_id"],
            "operator": "Equal",
            "valueInt": sentence_id,
        }
        response = (
            self._client.query.get(self.class_names[IndexType.TEXT], ["sentence_id"])
            .with_where(id_filter)
            .with_additional("id")
            .do()
        )
        if len(response["data"]["Get"][self.class_names[IndexType.TEXT]]) == 0:
            msg = f"No Sentence with sentence_id {sentence_id} found!"
            logger.error(msg)
            raise KeyError(msg)

        return response["data"]["Get"][self.class_names[IndexType.TEXT]][0][
            "_additional"
        ]["id"]

    def search_index(
        self,
        proj_id: int,
        index_type: IndexType,
        query_emb: np.ndarray,
        top_k: int = 10,
        threshold: float = 0.0,
    ) -> Dict[int, float]:
        project_filter = {
            "path": ["project_id"],
            "operator": "Equal",
            "valueInt": proj_id,
        }

        if index_type == IndexType.TEXT:
            query = self._client.query.get(
                self._sentence_class_name,
                ["project_id", "sentence_id"],
            )
        elif index_type == IndexType.IMAGE:
            query = self._client.query.get(
                self._image_class_name,
                ["project_id", "sdoc_id"],
            )
        else:
            msg = f"Unknown IndexType '{index_type}'!"
            logger.error(msg)
            raise ValueError(msg)

        query = (
            query.with_near_vector(
                {"vector": query_emb.tolist(), "certainty": threshold}
            )
            .with_additional(["certainty"])
            .with_where(project_filter)
            .with_limit(top_k)
        )

        results = query.do()["data"]["Get"][self.class_names[index_type]]
        return {
            r["sentence_id" if index_type == IndexType.TEXT else "sdoc_id"]: r[
                "_additional"
            ]["certainty"]
            for r in results
        }
