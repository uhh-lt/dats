import weaviate
from app.core.vector.collections.aspect_collection import AspectCollection
from app.core.vector.collections.cluster_collection import ClusterCollection
from app.core.vector.collections.document_collection import DocumentCollection
from app.core.vector.collections.image_collection import ImageCollection
from app.core.vector.collections.sentence_collection import SentenceCollection
from app.util.singleton_meta import SingletonMeta
from config import conf
from loguru import logger


class WeaviateService(metaclass=SingletonMeta):
    def __new__(cls, flush: bool = False):
        try:
            with cls.weaviate_session() as client:
                # Check if client is ready
                if not client.is_ready():
                    msg = "Weaviate client not ready!"
                    logger.error(msg)
                    raise RuntimeError(msg)
                logger.info("Successfully established connection to Weaviate DB!")

                if flush:
                    client.collections.delete_all()

                # Initialize collections
                DocumentCollection.create_collection(client)
                SentenceCollection.create_collection(client)
                ImageCollection.create_collection(client)
                AspectCollection.create_collection(client)
                ClusterCollection.create_collection(client)

            return super(WeaviateService, cls).__new__(cls)

        except Exception as e:
            msg = f"Cannot connect to Weaviate DB - Error '{e}'"
            logger.error(msg)
            raise SystemExit(msg)

    @classmethod
    def weaviate_session(cls):
        """Return the Weaviate client instance"""
        return weaviate.connect_to_custom(
            http_host=conf.weaviate.host,
            http_port=conf.weaviate.port,
            http_secure=False,
            grpc_host=conf.weaviate.host,
            grpc_port=conf.weaviate.grpc_port,
            grpc_secure=False,
        )

    @classmethod
    def drop_indices(cls) -> None:
        logger.warning("Dropping all Weaviate indices!")
        with cls.weaviate_session() as client:
            client.collections.delete_all()
