from elasticsearch import Elasticsearch

from core.memo.memo_elastic_dto import (
    ElasticSearchMemo,
    ElasticSearchMemoCreate,
    ElasticSearchMemoUpdate,
)
from core.memo.memo_elastic_index import MemoIndex
from repos.elastic.elastic_crud_base import ElasticCrudBase
from repos.elastic.elastic_dto_base import PaginatedElasticSearchHits
from systems.event_system.events import (
    project_created,
    project_deleted,
    source_document_deleted,
)


class CRUDElasticMemo(
    ElasticCrudBase[
        MemoIndex,
        ElasticSearchMemo,
        ElasticSearchMemoCreate,
        ElasticSearchMemoUpdate,
    ]
):
    ### OTHER OPERATIONS ###

    def search_memos_by_title_query(
        self,
        *,
        client: Elasticsearch,
        proj_id: int,
        memo_ids: set[int],
        query: str,
        limit: int | None = None,
        skip: int | None = None,
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
        memo_ids: set[int],
        query: str,
        limit: int | None = None,
        skip: int | None = None,
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


crud_elastic_memo = CRUDElasticMemo(index=MemoIndex, model=ElasticSearchMemo)


@source_document_deleted.connect
def handle_source_document_deleted(sender, sdoc_id: int, project_id: int):
    # TODO: Implement memo deletion logic
    print("TODO! Handle source document deleted for memos")


@project_created.connect
def handle_project_created(sender, project_id: int):
    from repos.elastic.elastic_repo import ElasticSearchRepo

    crud_elastic_memo.index.create_index(
        client=ElasticSearchRepo().client, proj_id=project_id
    )


@project_deleted.connect
def handle_project_deleted(sender, project_id: int):
    from repos.elastic.elastic_repo import ElasticSearchRepo

    crud_elastic_memo.index.delete_index(
        client=ElasticSearchRepo().client,
        proj_id=project_id,
    )
