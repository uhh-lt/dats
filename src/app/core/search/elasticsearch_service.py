from typing import Dict, Any, Iterable

import srsly
from elasticsearch import Elasticsearch, TransportError, ConnectionError
from loguru import logger

from app.core.data.dto.project import ProjectRead
from app.core.data.dto.search import ElasticSearchSourceDocument
from app.util.singleton_meta import SingletonMeta
from config import conf


class ElasticSearchService(metaclass=SingletonMeta):

    def __new__(cls, *args: Iterable[Any], **kwargs: Dict[Any, Any]):
        try:
            # ElasticSearch Connection
            esc = Elasticsearch([{"host": conf.elasticsearch.host, "port": conf.elasticsearch.port, }],
                                use_ssl=conf.elasticsearch.use_ssl,
                                verify_certs=conf.elasticsearch.verify_certs,
                                # DO NOT SNIFF WHEN ES IS NOT IN LOCAL NETWORK! This will cause timeout errors
                                # sniff before doing anything
                                sniff_on_start=conf.elasticsearch.sniff_on_start,
                                sniff_on_connection_fail=conf.elasticsearch.sniff_on_connection_fail,
                                sniffer_timeout=conf.elasticsearch.sniffer_timeout)
            esc.ping()

            cls.__client = esc

        except (ConnectionError, TransportError) as e:
            msg = f"Cannot connect to ElasticSearch - Error '{e.status_code}': '{e.error}'"
            logger.error(msg)
            # TODO Flo: do we really want to exit here?
            raise SystemExit(msg)

        logger.info("Successfully established connection to ElasticSearch!")

        return super(ElasticSearchService, cls).__new__(cls)

    def __delete_index(self, index: str) -> None:
        if self.__client.indices.exists(index=index):
            self.__client.indices.delete(index=index)
            logger.info(f"Removed ElasticSearch Index '{index}'!")
        else:
            logger.info(f"Cannot remove ElasticSearch Index '{index}' since it does not exist!")

    def __create_index(self,
                       index: str,
                       mappings: Dict[str, Any],
                       settings: Dict[str, Any] = None,
                       replace_if_exists: bool = False) -> None:
        if replace_if_exists and self.__client.indices.exists(index=index):
            self.__delete_index(index=index)
        if not self.__client.indices.exists(index=index):
            self.__client.indices.create(index=index, mappings=mappings, settings=settings)
            logger.info(
                f"Created ElasticSearch Index '{index}' with Mappings: {mappings} and Settings: {settings}!")

    def create_project_indices(self, proj: ProjectRead) -> None:
        # create the ES Index for Documents
        doc_mappings = srsly.read_json(conf.elasticsearch.index_mappings.docs)
        doc_settings = conf.elasticsearch.index_settings.docs
        if doc_settings is not None:
            doc_settings = srsly.read_json(doc_settings)

        self.__create_index(index=proj.doc_index,
                            mappings=doc_mappings,
                            settings=doc_settings,
                            replace_if_exists=True)

        # create the ES Index for Memos
        memo_mappings = srsly.read_json(conf.elasticsearch.index_mappings.memos)
        memo_settings = conf.elasticsearch.index_settings.memos
        if memo_settings is not None:
            memo_settings = srsly.read_json(memo_settings)
        self.__create_index(index=proj.memo_index,
                            mappings=memo_mappings,
                            settings=memo_settings,
                            replace_if_exists=True)

    def remove_project_indices(self, proj: ProjectRead) -> None:
        self.__delete_index(index=proj.doc_index)
        self.__delete_index(index=proj.memo_index)

    def add_document_to_index(self,
                              proj: ProjectRead,
                              esdoc: ElasticSearchSourceDocument) -> int:
        # TODO Flo: what to do when this fails!? How to keep the SQL and ES consistent
        res = self.__client.index(index=proj.doc_index,
                                  id=str(esdoc.sdoc_id),
                                  document=esdoc.json())
        if not res['_id'] == esdoc.sdoc_id:
            # FIXME Flo: What to do?!
            logger.error(f"ElasticSearch Document ID and SQL Document ID of Document {esdoc.filename} does not match!")

        logger.debug(f"Added Document '{esdoc.filename}' with ID '{res['_id']}' to Index '{proj.doc_index}'!")
        return res['_id']
