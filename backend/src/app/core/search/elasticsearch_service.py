import re
from pathlib import Path
from typing import Dict, Any, Optional, Set, List

import srsly
from elasticsearch import Elasticsearch
from loguru import logger
from omegaconf import OmegaConf

from app.core.data.doc_type import DocType
from app.core.data.dto.memo import MemoRead
from app.core.data.dto.project import ProjectRead
from app.core.data.dto.search import ElasticSearchDocumentCreate, ElasticSearchDocumentRead, ElasticSearchMemoCreate, \
    ElasticSearchMemoRead, ElasticSearchDocumentHit, PaginatedSourceDocumentSearchResults, PaginatedMemoSearchResults, \
    ElasticMemoHit
from app.core.data.dto.source_document import SourceDocumentRead, SourceDocumentContent, SourceDocumentTokens, \
    SourceDocumentKeywords
from app.util.singleton_meta import SingletonMeta
from config import conf


class NoSuchSourceDocumentInElasticSearchError(Exception):
    def __init__(self, proj: ProjectRead, sdoc_id: int):
        super().__init__((f"There exists no SourceDocument with ID={sdoc_id} in Project {proj.title}"
                          " in the respective ElasticSearch Index!"))


class NoSuchMemoInElasticSearchError(Exception):
    def __init__(self, proj: ProjectRead, memo_id: int):
        super().__init__((f"There exists no Memo with ID={memo_id} in Project {proj.title}"
                          " in the respective ElasticSearch Index!"))


class NoSuchFieldInIndexError(Exception):
    def __init__(self, index: str, fields: set, index_fields: set):
        super().__init__((f"The following field(s) do not exist in the ElasticSearch index: {index}:"
                          f" {fields.difference(index_fields)}"))


class ElasticSearchService(metaclass=SingletonMeta):

    def __new__(cls, *args, **kwargs):
        try:
            memo_mappings_path = Path(conf.elasticsearch.index_mappings.memos)
            doc_mappings_path = Path(conf.elasticsearch.index_mappings.docs)
            if not memo_mappings_path.exists():
                raise FileNotFoundError(f"Cannot find ElasticSearch Memo Index Mapping: {memo_mappings_path}")
            elif not doc_mappings_path.exists():
                raise FileNotFoundError(f"Cannot find ElasticSearch Document Index Mapping: {doc_mappings_path}")

            memo_mappings = srsly.read_json(memo_mappings_path)
            doc_mappings = srsly.read_json(doc_mappings_path)

            cls.doc_index_fields = set(doc_mappings["properties"].keys())
            cls.memo_index_fields = set(memo_mappings["properties"].keys())

            cls.doc_mappings = doc_mappings
            cls.memo_mappings = memo_mappings

            # ElasticSearch Connection
            esc = Elasticsearch([{"host": conf.elasticsearch.host, "port": conf.elasticsearch.port, }],
                                use_ssl=conf.elasticsearch.use_ssl,
                                verify_certs=conf.elasticsearch.verify_certs,
                                # DO NOT SNIFF WHEN ES IS NOT IN LOCAL NETWORK! This will cause timeout errors
                                # sniff before doing anything
                                sniff_on_start=conf.elasticsearch.sniff_on_start,
                                sniff_on_connection_fail=conf.elasticsearch.sniff_on_connection_fail,
                                sniffer_timeout=conf.elasticsearch.sniffer_timeout)
            if not esc.ping():
                raise Exception(f"Cant connect to ElasticSearch on {conf.elasticsearch.host}:{conf.elasticsearch.port}")

            cls.__client = esc

        except Exception as e:
            msg = f"Cannot instantiate ElasticSearchService - Error '{e}'"
            logger.error(msg)
            # TODO Flo: do we really want to exit here?
            raise SystemExit(msg)

        logger.info("Successfully established connection to ElasticSearch!")

        if kwargs["remove_all_indices"] if "remove_all_indices" in kwargs else False:
            logger.warning("Removing all DWTS ElasticSearch indices!")
            esc.indices.delete(index="dwts_*", allow_no_indices=True)

        return super(ElasticSearchService, cls).__new__(cls)

    def __delete_index(self,
                       *, index: str) -> None:
        if self.__client.indices.exists(index=index):
            self.__client.indices.delete(index=index)
            logger.info(f"Removed ElasticSearch Index '{index}'!")
        else:
            logger.info(f"Cannot remove ElasticSearch Index '{index}' since it does not exist!")

    def __create_index(self,
                       *,
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

    def __get_index_name(self, proj: ProjectRead, index_type: str = 'doc') -> str:
        t = re.sub(r'\s+', '_', proj.title.lower().strip())
        if 'doc' in index_type:
            return f"dwts_{t}_docs"
        elif 'memo' in index_type:
            return f"dwts_{t}_memos"
        else:
            raise NotImplementedError('Only Document and Memo indices exist!')

    def create_project_indices(self,
                               *,
                               proj: ProjectRead) -> None:
        # create the ES Index for Documents
        doc_settings = conf.elasticsearch.index_settings.docs
        if doc_settings is not None:
            doc_settings = srsly.read_json(doc_settings)

        self.__create_index(index=self.__get_index_name(proj=proj, index_type='doc'),
                            mappings=self.doc_mappings,
                            settings=doc_settings,
                            replace_if_exists=True)

        # create the ES Index for Memos
        memo_settings = conf.elasticsearch.index_settings.memos
        if memo_settings is not None:
            memo_settings = srsly.read_json(memo_settings)
        self.__create_index(index=self.__get_index_name(proj=proj, index_type='memo'),
                            mappings=self.memo_mappings,
                            settings=memo_settings,
                            replace_if_exists=True)

    def remove_project_indices(self,
                               *, proj: ProjectRead) -> None:
        self.__delete_index(index=self.__get_index_name(proj=proj, index_type='doc'))
        self.__delete_index(index=self.__get_index_name(proj=proj, index_type='memo'))

    def add_document_to_index(self,
                              *,
                              proj: ProjectRead,
                              esdoc: ElasticSearchDocumentCreate) -> int:
        # TODO Flo: what to do when this fails!? How to keep the SQL and ES consistent
        res = self.__client.index(index=self.__get_index_name(proj=proj, index_type='doc'),
                                  id=str(esdoc.sdoc_id),
                                  document=esdoc.json())
        if not int(res['_id']) == esdoc.sdoc_id:
            # FIXME Flo: What to do?!
            logger.error(f"ElasticSearch Document ID and SQL Document ID of Document {esdoc.filename} do not match!")

        logger.debug(
            f"Added Document '{esdoc.filename}' with ID '{res['_id']}' to Index '{self.__get_index_name(proj=proj, index_type='doc')}'!")
        return res['_id']

    def update_esdoc_keywords(self,
                              *,
                              proj: ProjectRead,
                              keywords: SourceDocumentKeywords) -> SourceDocumentKeywords:
        self.__client.update(index=self.__get_index_name(proj=proj, index_type='doc'),
                             id=str(keywords.source_document_id),
                             body={"doc": {"keywords": keywords.keywords}})

        logger.debug((f"Updated Keywords of Document '{keywords.source_document_id}' in Index "
                      f"'{self.__get_index_name(proj=proj, index_type='doc')}'!"))
        return keywords

    def get_esdocs_by_sdoc_ids(self,
                               *,
                               proj: ProjectRead,
                               sdoc_ids: Set[int],
                               fields: Set[str] = None) -> Optional[List[ElasticSearchDocumentRead]]:
        if not fields.union(self.doc_index_fields):
            raise NoSuchFieldInIndexError(index=self.__get_index_name(proj=proj, index_type='doc'), fields=fields,
                                          index_fields=self.doc_index_fields)
        results = self.__client.mget(index=self.__get_index_name(proj=proj, index_type='doc'),
                                     _source=list(fields),
                                     body={'ids': list(sdoc_ids)})

        esdocs = []
        for res in results["docs"]:
            if not res["found"]:
                raise NoSuchSourceDocumentInElasticSearchError(proj=proj, sdoc_id=res["_id"])
            esdocs.append(ElasticSearchDocumentRead(sdoc_id=res["_id"], **res["_source"]))

        return esdocs

    def get_esdoc_by_sdoc_id(self,
                             *,
                             proj: ProjectRead,
                             sdoc_id: int,
                             fields: Set[str] = None) -> Optional[ElasticSearchDocumentRead]:
        if not fields.union(self.doc_index_fields):
            raise NoSuchFieldInIndexError(index=self.__get_index_name(proj=proj, index_type='doc'), fields=fields,
                                          index_fields=self.doc_index_fields)
        res = self.__client.get(index=self.__get_index_name(proj=proj, index_type='doc'),
                                id=str(sdoc_id),
                                _source=list(fields))
        if not res["found"]:
            raise NoSuchSourceDocumentInElasticSearchError(proj=proj, sdoc_id=sdoc_id)
        return ElasticSearchDocumentRead(**res["_source"])

    def get_sdoc_content_by_sdoc_id(self,
                                    *,
                                    proj: ProjectRead,
                                    sdoc_id: int) -> Optional[SourceDocumentContent]:
        esdoc = self.get_esdoc_by_sdoc_id(proj=proj, sdoc_id=sdoc_id, fields={"content"})
        return SourceDocumentContent(source_document_id=sdoc_id, content=esdoc.content)

    def get_sdoc_tokens_by_sdoc_id(self,
                                   *,
                                   proj: ProjectRead,
                                   sdoc_id: int,
                                   character_offsets: Optional[bool] = False) -> Optional[SourceDocumentTokens]:
        fields = {"tokens"}
        if character_offsets:
            fields.add("token_character_offsets")
        esdoc = self.get_esdoc_by_sdoc_id(proj=proj, sdoc_id=sdoc_id, fields=fields)
        if character_offsets:
            return SourceDocumentTokens(source_document_id=sdoc_id,
                                        tokens=esdoc.tokens,
                                        token_character_offsets=[(o.gte, o.lt) for o in esdoc.token_character_offsets])
        return SourceDocumentTokens(source_document_id=sdoc_id, tokens=esdoc.tokens)

    def get_sdoc_keywords_by_sdoc_id(self,
                                     *,
                                     proj: ProjectRead,
                                     sdoc_id: int,
                                     character_offsets: Optional[bool] = False) -> Optional[SourceDocumentKeywords]:
        fields = {"keywords"}
        if character_offsets:
            fields.add("token_character_offsets")
        esdoc = self.get_esdoc_by_sdoc_id(proj=proj, sdoc_id=sdoc_id, fields=fields)
        return SourceDocumentKeywords(source_document_id=sdoc_id, keywords=esdoc.keywords)

    def get_sdoc_keywords_by_sdoc_ids(self,
                                      *,
                                      proj: ProjectRead,
                                      sdoc_ids: Set[int]
                                      ) -> Optional[List[SourceDocumentKeywords]]:
        fields = {"keywords"}
        return [SourceDocumentKeywords(source_document_id=esdoc.sdoc_id, keywords=esdoc.keywords)
                for esdoc
                in self.get_esdocs_by_sdoc_ids(proj=proj, sdoc_ids=sdoc_ids, fields=fields)]

    def delete_document_from_index(self,
                                   proj: ProjectRead,
                                   sdoc_id: int) -> None:
        self.__client.delete(index=self.__get_index_name(proj=proj, index_type='doc'), id=str(sdoc_id))
        logger.info(
            f"Deleted Document with ID={sdoc_id} from Index '{self.__get_index_name(proj=proj, index_type='doc')}'!")

    def add_memo_to_index(self,
                          proj: ProjectRead,
                          esmemo: ElasticSearchMemoCreate) -> int:
        res = self.__client.index(index=self.__get_index_name(proj=proj, index_type='memo'),
                                  id=str(esmemo.memo_id),
                                  document=esmemo.json())
        if not int(res['_id']) == esmemo.memo_id:
            # FIXME Flo: What to do?!
            logger.error(f"ElasticSearch Memo ID and SQL Memo ID of Memo {esmemo.title} do not match!")
        logger.debug(
            f"Added Memo '{esmemo.title}' with ID '{res['_id']}' to Index '{self.__get_index_name(proj=proj, index_type='doc')}'!")
        return res['_id']

    def get_esmemo_by_memo_id(self,
                              *,
                              proj: ProjectRead,
                              memo_id: int,
                              fields: Set[str] = None) -> Optional[ElasticSearchMemoRead]:
        if not fields.union(self.doc_index_fields):
            raise NoSuchFieldInIndexError(index=self.__get_index_name(proj=proj, index_type='doc'), fields=fields,
                                          index_fields=self.doc_index_fields)
        res = self.__client.get(index=self.__get_index_name(proj=proj, index_type='memo'),
                                id=str(memo_id),
                                _source=list(fields))
        if not res["found"]:
            raise NoSuchMemoInElasticSearchError(proj=proj, memo_id=memo_id)

        return ElasticSearchMemoRead(**res["_source"])

    def delete_memo_from_index(self,
                               *,
                               proj: ProjectRead,
                               memo_id: int) -> None:
        self.__client.delete(index=self.__get_index_name(proj=proj, index_type='memo'), id=str(memo_id))
        logger.info(
            f"Deleted Memo with ID={memo_id} from Index '{self.__get_index_name(proj=proj, index_type='memo')}'!")

    def __search(self,
                 *,
                 sdoc: bool = True,
                 proj: ProjectRead,
                 query: Dict[str, Any],
                 limit: Optional[int] = 10,
                 skip: Optional[int] = 0) -> Dict[str, Any]:
        """
        Helper function that can be reused to find SDocs or Memos with different queries.
        :param query: The ElasticSearch query object in ES Query DSL
        :param skip: The number of skipped elements
        :param limit: The maximum number of returned elements
        :return: A (possibly empty) list of Memo matching the query
        :rtype: List[DocumentElasticSearchHit]
        """
        if sdoc:
            idx = self.__get_index_name(proj=proj, index_type='doc')
        else:
            idx = self.__get_index_name(proj=proj, index_type='memo')

        if not self.__client.indices.exists(index=idx):
            raise ValueError(f"ElasticSearch Index '{idx}' does not exist!")

        if query is None or len(query) < 1:
            raise ValueError("Query DSL object must not be None or empty!")
        if (not isinstance(limit, int)) or limit > 10000 or limit < 1:
            raise ValueError("Limit must be a positive Integer smaller than 10000!")
        elif (not isinstance(skip, int)) or skip > 10000 or limit < 1:
            raise ValueError("Skip must be a positive Integer smaller than 10000!")

        return self.__client.search(index=idx,
                                    query=query,
                                    size=limit,
                                    from_=skip,
                                    filter_path=["hits"])

    def __search_sdocs(self,
                       *,
                       proj: ProjectRead,
                       query: Dict[str, Any],
                       limit: Optional[int] = 10,
                       skip: Optional[int] = 0) -> PaginatedSourceDocumentSearchResults:
        res = self.__search(sdoc=True, proj=proj, query=query, limit=limit, skip=skip)
        # Flo: for convenience only...
        res = OmegaConf.create(res)
        if len(res) == 0:
            return PaginatedSourceDocumentSearchResults(sdocs=[],
                                                        has_more=False,
                                                        current_page_offset=skip,
                                                        next_page_offset=0)

        esdocs = [ElasticSearchDocumentHit(**OmegaConf.to_container(doc["_source"]), score=doc["_score"])
                  for doc in res.hits.hits]
        sdocs = [SourceDocumentRead(filename=esdoc.filename,
                                    content=esdoc.content,
                                    doctype=DocType.text,
                                    project_id=esdoc.project_id,
                                    id=esdoc.sdoc_id,
                                    created=esdoc.created) for esdoc in esdocs]
        has_more = res.hits.total.value > limit
        return PaginatedSourceDocumentSearchResults(sdocs=sdocs,
                                                    has_more=has_more,
                                                    current_page_offset=skip,
                                                    next_page_offset=(skip + limit) if has_more else 0)

    def __search_memos(self,
                       *,
                       proj: ProjectRead,
                       query: Dict[str, Any],
                       user_id: int,
                       starred: Optional[bool] = None,
                       limit: Optional[int] = 10,
                       skip: Optional[int] = 0) -> PaginatedMemoSearchResults:

        # add user to query
        query["bool"]["must"].append(
            {
                "match": {
                    "user_id": user_id
                }
            }
        )
        if starred is not None:
            # add starred to query
            query["bool"]["must"].append(
                {
                    "match": {
                        "starred": str(starred).lower()
                    }
                }
            )

        print(str(query).replace("'", '"'))

        res = self.__search(sdoc=False, proj=proj, query=query, limit=limit, skip=skip)
        # Flo: for convenience only...
        res = OmegaConf.create(res)
        if len(res) == 0:
            return PaginatedMemoSearchResults(memos=[],
                                              has_more=False,
                                              current_page_offset=skip,
                                              next_page_offset=0)

        esmemos = [ElasticMemoHit(**OmegaConf.to_container(doc["_source"]), score=doc["_score"])
                   for doc in res.hits.hits]
        memos = [MemoRead(title=esmemo.title,
                          content=esmemo.content,
                          starred=esmemo.starred,
                          id=esmemo.memo_id,
                          user_id=esmemo.user_id,
                          project_id=esmemo.project_id,
                          created=esmemo.created,
                          updated=esmemo.updated,
                          attached_object_id=esmemo.attached_object_id,
                          attached_object_type=esmemo.attached_object_type)
                 for esmemo in esmemos]
        has_more = res.hits.total.value > limit
        return PaginatedMemoSearchResults(memos=memos,
                                          has_more=has_more,
                                          current_page_offset=skip,
                                          next_page_offset=(skip + limit) if has_more else 0)

    def search_sdocs_by_exact_filename(self,
                                       *,
                                       proj: ProjectRead,
                                       exact_filename: str,
                                       limit: Optional[int] = 10,
                                       skip: Optional[int] = 0) -> PaginatedSourceDocumentSearchResults:
        # Flo: Using term query since filename is a keyword field
        return self.__search_sdocs(proj=proj, query={
            "term": {
                "filename": exact_filename
            }
        }, limit=limit, skip=skip)

    def search_sdocs_by_prefix_filename(self,
                                        *,
                                        proj: ProjectRead,
                                        filename_prefix: str,
                                        limit: Optional[int] = 10,
                                        skip: Optional[int] = 0) -> PaginatedSourceDocumentSearchResults:
        return self.__search_sdocs(proj=proj, query={
            "prefix": {
                "filename": filename_prefix
            }
        }, limit=limit, skip=skip)

    def search_sdocs_by_content_query(self,
                                      *,
                                      proj: ProjectRead,
                                      query: str,
                                      limit: Optional[int] = 10,
                                      skip: Optional[int] = 0) -> PaginatedSourceDocumentSearchResults:
        return self.__search_sdocs(proj=proj, query={
            "match": {
                "content": {
                    "query": query,
                    "fuzziness": "1"  # TODO Flo: no constant here! either config or per call
                }
            }
        }, limit=limit, skip=skip)

    def search_sdocs_by_keywords_query(self,
                                       *,
                                       proj: ProjectRead,
                                       keywords: List[str],
                                       limit: Optional[int] = 10,
                                       skip: Optional[int] = 0) -> PaginatedSourceDocumentSearchResults:
        query: Dict[str, any] = {
            "bool": {
                "must": []
            }
        }

        for keyword in keywords:
            query["bool"]["must"].append(
                {
                    "match": {
                        "keywords": keyword
                    }
                }
            )
        return self.__search_sdocs(proj=proj, query=query, limit=limit, skip=skip)

    def search_memos_by_exact_title(self,
                                    *,
                                    proj: ProjectRead,
                                    user_id: int,
                                    exact_title: str,
                                    starred: Optional[bool] = None,
                                    limit: Optional[int] = 10,
                                    skip: Optional[int] = 0) -> PaginatedMemoSearchResults:
        # Flo: Using term query since title is a keyword field
        return self.__search_memos(proj=proj, query={
            "bool": {
                "must": [
                    {
                        "term": {
                            "title": exact_title
                        }
                    }
                ]
            }
        }, user_id=user_id, starred=starred, limit=limit, skip=skip)

    def search_memos_by_prefix_title(self,
                                     *,
                                     proj: ProjectRead,
                                     user_id: int,
                                     title_prefix: str,
                                     starred: Optional[bool] = None,
                                     limit: Optional[int] = 10,
                                     skip: Optional[int] = 0) -> PaginatedMemoSearchResults:
        return self.__search_memos(proj=proj, query={
            "bool": {
                "must": [
                    {
                        "prefix": {
                            "title": title_prefix
                        }
                    }
                ]
            }
        }, user_id=user_id, starred=starred, limit=limit, skip=skip)

    def search_memos_by_content_query(self,
                                      *,
                                      proj: ProjectRead,
                                      user_id: int,
                                      query: str,
                                      starred: Optional[bool] = None,
                                      limit: Optional[int] = 10,
                                      skip: Optional[int] = 0) -> PaginatedMemoSearchResults:
        return self.__search_memos(proj=proj, query={
            "bool": {
                "must": [
                    {
                        "match": {
                            "content": {
                                "query": query,
                                "fuzziness": 1
                            }
                        }
                    }
                ]
            }
        }, user_id=user_id, starred=starred, limit=limit, skip=skip)

    def _get_client(self) -> Elasticsearch:
        """
        private function used for testing purpose
        """
        return self.__client
