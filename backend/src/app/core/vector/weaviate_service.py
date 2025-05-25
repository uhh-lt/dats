import weaviate
from app.core.vector.collections.aspect_collection import AspectCollection
from app.core.vector.collections.document_collection import DocumentCollection
from app.core.vector.collections.image_collection import ImageCollection
from app.core.vector.collections.sentence_collection import SentenceCollection
from app.core.vector.collections.topic_collection import TopicCollection
from app.util.singleton_meta import SingletonMeta
from config import conf
from loguru import logger


class WeaviateService(metaclass=SingletonMeta):
    def __new__(cls, flush: bool = False):
        try:
            # Initialize Weaviate client with v4 syntax
            cls.client = weaviate.connect_to_custom(
                http_host=conf.weaviate.host,
                http_port=conf.weaviate.port,
                http_secure=False,
                grpc_host=conf.weaviate.host,
                grpc_port=conf.weaviate.grpc_port,
                grpc_secure=False,
            )

            # Check if client is ready
            if not cls.client.is_ready():
                msg = "Weaviate client not ready!"
                logger.error(msg)
                raise RuntimeError(msg)

            logger.info("Weaviate client initialized successfully.")

            if flush:
                cls.drop_indices()

            # Initialize collections
            DocumentCollection.create_collection(cls.client)
            SentenceCollection.create_collection(cls.client)
            ImageCollection.create_collection(cls.client)
            AspectCollection.create_collection(cls.client)
            TopicCollection.create_collection(cls.client)

            return super(WeaviateService, cls).__new__(cls)

        except Exception as e:
            msg = f"Cannot connect to Weaviate DB - Error '{e}'"
            logger.error(msg)
            raise SystemExit(msg)

    @classmethod
    def drop_indices(cls) -> None:
        logger.warning("Dropping all Weaviate indices!")
        cls.client.collections.delete_all()

    def get_client(self):
        """Return the Weaviate client instance"""
        return self.client
