from typing import Optional, Set

from core.memo.memo_elastic_dto import (
    ElasticSearchMemo,
    ElasticSearchMemoCreate,
    ElasticSearchMemoUpdate,
)
from core.memo.memo_elastic_index import MemoIndex
from elasticsearch import Elasticsearch
from repos.elastic.elastic_crud_base import ElasticCrudBase
from repos.elastic.elastic_dto_base import PaginatedElasticSearchHits


class MemoElasticCrud(
    ElasticCrudBase[
        MemoIndex,
        ElasticSearchMemo,
        ElasticSearchMemoCreate,
        ElasticSearchMemoUpdate,
    ]
):
    def search_memos_by_title_query(
        self,
        *,
        client: Elasticsearch,
        proj_id: int,
        memo_ids: Set[int],
        query: str,
        limit: Optional[int] = None,
        skip: Optional[int] = None,
    ) -> PaginatedElasticSearchHits:
        return self.search(
            client=client,
            proj_id=proj_id,
            query={
                "bool": {
                    "must": [
                        {"terms": {"memo_id": list(memo_ids)}},
                        {"match": {"title": {"query": query, "fuzziness": 1}}},
                    ]
                }
            },
            limit=limit,
            skip=skip,
            highlight=None,
        )

    def search_memos_by_content_query(
        self,
        *,
        client: Elasticsearch,
        proj_id: int,
        memo_ids: Set[int],
        query: str,
        limit: Optional[int] = None,
        skip: Optional[int] = None,
    ) -> PaginatedElasticSearchHits:
        return self.search(
            client=client,
            proj_id=proj_id,
            query={
                "bool": {
                    "must": [
                        {"terms": {"memo_id": list(memo_ids)}},
                        {"match": {"content": {"query": query, "fuzziness": 1}}},
                    ]
                }
            },
            limit=limit,
            skip=skip,
            highlight=None,
        )


crud_elastic_memo = MemoElasticCrud(index=MemoIndex, model=ElasticSearchMemo)
