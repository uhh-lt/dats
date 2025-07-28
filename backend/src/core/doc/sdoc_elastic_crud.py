from typing import Optional, Set

from core.doc.sdoc_elastic_dto import (
    ElasticSearchDocument,
    ElasticSearchDocumentCreate,
    ElasticSearchDocumentUpdate,
)
from core.doc.sdoc_elastic_index import SdocIndex
from elasticsearch import Elasticsearch
from repos.elastic.elastic_crud_base import ElasticCrudBase
from repos.elastic.elastic_dto_base import PaginatedElasticSearchHits


class SdocElasticCrud(
    ElasticCrudBase[
        SdocIndex,
        ElasticSearchDocument,
        ElasticSearchDocumentCreate,
        ElasticSearchDocumentUpdate,
    ]
):
    def search_sdocs_by_content_query(
        self,
        *,
        client: Elasticsearch,
        proj_id: int,
        sdoc_ids: Optional[Set[int]],
        query: str,
        use_simple_query: bool = True,
        highlight: bool = False,
        limit: Optional[int] = None,
        skip: Optional[int] = None,
    ) -> PaginatedElasticSearchHits:
        if use_simple_query:
            q = {
                "simple_query_string": {
                    "query": query,
                    "fields": ["content"],
                    "default_operator": "and",
                }
            }
        else:
            q = {"query_string": {"query": query, "default_field": "content"}}

        highlight_query = {"fields": {"content": {}}} if highlight else None

        # the sdoc_ids parameter is for filtering the search results
        # if it is None, all documents are searched
        bool_must_query = [q]
        if sdoc_ids is not None:
            # the terms query has an allowed maximum of 65536 terms
            bool_must_query.append({"terms": {"sdoc_id": list(sdoc_ids)[:65536]}})

        return self.search(
            client=client,
            proj_id=proj_id,
            query={"bool": {"must": bool_must_query}},
            limit=limit,
            skip=skip,
            highlight=highlight_query,
        )


crud_elastic_sdoc = SdocElasticCrud(index=SdocIndex, model=ElasticSearchDocument)
