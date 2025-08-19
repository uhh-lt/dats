from elasticsearch import Elasticsearch

from core.doc.sdoc_elastic_dto import (
    ElasticSearchDocument,
    ElasticSearchDocumentCreate,
    ElasticSearchDocumentUpdate,
)
from core.doc.sdoc_elastic_index import SdocIndex
from repos.elastic.elastic_crud_base import ElasticCrudBase
from repos.elastic.elastic_dto_base import PaginatedElasticSearchHits
from systems.event_system.events import (
    project_created,
    project_deleted,
    source_document_deleted,
)


class CRUDElasticSdoc(
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
        sdoc_ids: set[int] | None,
        query: str,
        use_simple_query: bool = True,
        highlight: bool = False,
        limit: int | None = None,
        skip: int | None = None,
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


crud_elastic_sdoc = CRUDElasticSdoc(index=SdocIndex, model=ElasticSearchDocument)

# Handle events


@source_document_deleted.connect
def handle_source_document_deleted(sender, sdoc_id: int, project_id: int):
    from repos.elastic.elastic_repo import ElasticSearchRepo

    crud_elastic_sdoc.delete(
        client=ElasticSearchRepo().client,
        id=sdoc_id,
        proj_id=project_id,
    )


@project_created.connect
def handle_project_created(sender, project_id: int):
    from repos.elastic.elastic_repo import ElasticSearchRepo

    crud_elastic_sdoc.index.create_index(
        client=ElasticSearchRepo().client, proj_id=project_id
    )


@project_deleted.connect
def handle_project_deleted(sender, project_id: int):
    from repos.elastic.elastic_repo import ElasticSearchRepo

    crud_elastic_sdoc.index.delete_index(
        client=ElasticSearchRepo().client,
        proj_id=project_id,
    )
