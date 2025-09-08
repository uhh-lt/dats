import weaviate
from loguru import logger

from common.singleton_meta import SingletonMeta
from config import conf


class WeaviateRepo(metaclass=SingletonMeta):
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

            return super(WeaviateRepo, cls).__new__(cls)

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
