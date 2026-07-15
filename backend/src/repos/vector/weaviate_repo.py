import weaviate
from loguru import logger

from common.singleton_meta import SingletonMeta
from config import conf
from repos.repo_base import RepoBase


class WeaviateRepo(RepoBase, metaclass=SingletonMeta):
    def __init__(self):
        """
        Initialize WeaviateRepo.
        """
        RepoBase.__init__(self)
        self._client = None

    def connect(self) -> None:
        """Establish connection to Weaviate."""
        if self._client is not None:
            logger.debug("WeaviateRepo already connected, skipping")
            return

        try:
            self._client = weaviate.connect_to_custom(
                http_host=conf.weaviate.host,
                http_port=conf.weaviate.port,
                http_secure=False,
                grpc_host=conf.weaviate.host,
                grpc_port=conf.weaviate.grpc_port,
                grpc_secure=False,
            )

            # Check if client is ready
            if not self._client.is_ready():
                msg = "Weaviate client not ready!"
                logger.error(msg)
                raise RuntimeError(msg)

            logger.info("Successfully established connection to Weaviate DB!")

        except Exception as e:
            msg = f"Cannot connect to Weaviate DB - Error '{e}'"
            logger.error(msg)
            raise SystemExit(msg)

    def close_connection(self) -> None:
        """
        Close the connection to Weaviate.
        """
        if self._client is None:
            logger.debug("WeaviateRepo already closed, skipping")
            return

        logger.info("Closing connection to Weaviate...")
        self._client.close()
        self._client = None

    def remove_data(self) -> None:
        """
        Removes all Weaviate collections.
        This deletes all collections in the Weaviate instance.
        """
        if self._client is None:
            raise RuntimeError("WeaviateRepo is not connected. Call connect() first.")

        logger.warning("Dropping all Weaviate indices!")
        self._client.collections.delete_all()

    def get_client(self):
        """Return the Weaviate client instance"""
        if self._client is None:
            raise RuntimeError("WeaviateRepo is not connected. Call connect() first.")
        return self._client
