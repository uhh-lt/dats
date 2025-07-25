from typing import List

from common.singleton_meta import SingletonMeta
from config import conf
from core.doc.sdoc_elastic_index import SdocIndex
from core.memo.memo_elastic_index import MemoIndex
from elasticsearch import Elasticsearch
from loguru import logger
from repos.elastic.elastic_index_base import IndexBase


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

            # Register indices
            cls.indices: List[IndexBase] = [MemoIndex(), SdocIndex()]

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

    def exist_project_indices(self, *, proj_id: int) -> bool:
        """
        Check if the ElasticSearch indices for a project exist
        :param proj_id: The ID of the project
        :return: True if the indices exist, False otherwise
        """
        for index in self.indices:
            index_name = index.get_index_name(proj_id)
            if not self.client.indices.exists(index=index_name):
                return False

        return True

    def create_project_indices(self, *, proj_id: int) -> None:
        for index in self.indices:
            index.create_index(
                client=self.client,
                proj_id=proj_id,
                replace_if_exists=True,
            )

    def remove_project_indices(self, *, proj_id: int) -> None:
        for index in self.indices:
            index.delete_index(
                client=self.client,
                proj_id=proj_id,
            )
