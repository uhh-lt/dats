from elasticsearch import Elasticsearch

from core.doc.sdoc_elastic_dto import (
    ElasticSearchDocument,
    ElasticSearchDocumentCreate,
    ElasticSearchDocumentUpdate,
)
from core.doc.sdoc_elastic_index import SdocIndex
from repos.elastic.elastic_crud_base import ElasticCRUDBase
from repos.elastic.elastic_dto_base import PaginatedElasticSearchHits
from systems.event_system.events import (
    source_document_deleted,
)


class CRUDSdocElastic(
    ElasticCRUDBase[
        SdocIndex,
        ElasticSearchDocument,
        ElasticSearchDocumentCreate,
        ElasticSearchDocumentUpdate,
    ]
):
    ### CREATE OPERATIONS ###
    # Inherited from ElasticCRUDBase

    ### READ OPERATIONS ###
    # Inherited from ElasticCRUDBase

    ### UPDATE OPERATIONS ###
    # Inherited from ElasticCRUDBase

    ### DELETE OPERATIONS ###
    # Inherited from ElasticCRUDBase

    ### OTHER OPERATIONS ###

    def search_sdocs_by_content_query(
        self,
        client: Elasticsearch,
        *,
        project_id: int,
        sdoc_ids: set[int] | None,
        query: str,
        use_simple_query: bool = True,
        highlight: bool = False,
        limit: int | None = None,
        skip: int | None = None,
    ) -> PaginatedElasticSearchHits:
        """
        Full-text search over the content of the SourceDocuments of a project
        Args:
            client: Elasticsearch client
            project_id: ID of the project whose index is searched
            sdoc_ids: SourceDocument IDs to restrict the search to, or None to search all
            query: The search query
            use_simple_query: Use a simple_query_string instead of a query_string query
            highlight: Return highlighted matches of the content
            limit: The maximum number of returned elements
            skip: The number of skipped elements
        Returns:
            A (possibly empty) paginated list of hits matching the query
        """
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
            project_id=project_id,
            query={"bool": {"must": bool_must_query}},
            limit=limit,
            skip=skip,
            highlight=highlight_query,
        )


crud_sdoc_elastic = CRUDSdocElastic(index=SdocIndex, model=ElasticSearchDocument)

# Handle events


@source_document_deleted.connect
def handle_source_document_deleted(sender, sdoc_id: int, project_id: int) -> None:
    from repos.elastic.elastic_repo import ElasticSearchRepo

    crud_sdoc_elastic.delete(
        client=ElasticSearchRepo().get_client(),
        project_id=project_id,
        id=sdoc_id,
    )
