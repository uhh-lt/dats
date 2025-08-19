from elasticsearch import Elasticsearch
from loguru import logger

from common.singleton_meta import SingletonMeta
from config import conf


class ElasticSearchRepo(metaclass=SingletonMeta):
    def __new__(cls, flush: bool = False):
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

            cls.client = esc

        except Exception as e:
            msg = f"Cannot instantiate ElasticSearchService - Error '{e}'"
            logger.error(msg)
            raise SystemExit(msg)

        logger.info("Successfully established connection to ElasticSearch!")

        if flush:
            logger.warning("Removing all ElasticSearch indices!")
            esc.indices.delete(index="dats_*", allow_no_indices=True)

        return super(ElasticSearchRepo, cls).__new__(cls)

    @classmethod
    def elastic_search_session(cls):
        """Return the ElasticSearch client instance"""
        return cls.client

    @classmethod
    def drop_indices(cls) -> None:
        logger.warning("Dropping all ElasticSearch indices!")
        cls.client.indices.delete(index="dats_*", allow_no_indices=True)

    def close_connection(self):
        """
        Close the connection to the ElasticSearch client.
        """
        self.client.close()
