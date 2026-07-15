from elasticsearch import Elasticsearch
from loguru import logger

from common.singleton_meta import SingletonMeta
from config import conf
from repos.repo_base import RepoBase


class ElasticSearchRepo(RepoBase, metaclass=SingletonMeta):
    def __init__(self):
        """
        Initialize ElasticSearchRepo lazily.
        """
        RepoBase.__init__(self)
        self._client: Elasticsearch | None = None

    def connect(self) -> None:
        """Establish connection to ElasticSearch."""
        if self._client is not None:
            logger.debug("ElasticSearchRepo already connected, skipping")
            return

        try:
            # ElasticSearch Connection
            esc = Elasticsearch(
                [
                    {
                        "host": conf.elasticsearch.host,
                        "port": conf.elasticsearch.port,
                    }
                ],
                use_ssl=conf.elasticsearch.use_ssl,
                verify_certs=conf.elasticsearch.verify_certs,
                retry_on_timeout=True,
                maxsize=25,
                # DO NOT SNIFF WHEN ES IS NOT IN LOCAL NETWORK! This will cause timeout errors
                # sniff before doing anything
                sniff_on_start=conf.elasticsearch.sniff_on_start,
                sniff_on_connection_fail=conf.elasticsearch.sniff_on_connection_fail,
                sniffer_timeout=conf.elasticsearch.sniffer_timeout,
            )

            if not esc.ping():
                raise Exception(
                    f"Cant connect to ElasticSearch on {conf.elasticsearch.host}:{conf.elasticsearch.port}"
                )

            self._client = esc
            logger.info("Successfully established connection to ElasticSearch!")

        except Exception as e:
            msg = f"Cannot instantiate ElasticSearchService - Error '{e}'"
            logger.error(msg)
            raise SystemExit(msg)

    def close_connection(self) -> None:
        """
        Close the connection to the ElasticSearch client.
        """
        if self._client is None:
            logger.debug("ElasticSearchRepo already closed, skipping")
            return

        logger.info("Closing connection to ElasticSearch...")
        self._client.close()
        self._client = None

    def remove_data(self) -> None:
        """
        Reset all ElasticSearch indices.
        This deletes all indices matching the 'dats_*' pattern.
        """
        if self._client is None:
            raise RuntimeError(
                "ElasticSearchRepo is not connected. Call connect() first."
            )

        logger.warning("Dropping all ElasticSearch indices!")
        self._client.indices.delete(index="dats_*", allow_no_indices=True)
        logger.info("ElasticSearch indices reset")

    def get_client(self) -> Elasticsearch:
        """Return the ElasticSearch client instance"""
        if self._client is None:
            raise RuntimeError(
                "ElasticSearchRepo is not connected. Call connect() first."
            )
        return self._client
