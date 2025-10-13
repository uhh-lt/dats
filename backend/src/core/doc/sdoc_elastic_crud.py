from typing import Any, Dict

from elasticsearch import Elasticsearch

from core.doc.sdoc_elastic_dto import (
    ElasticSearchDocument,
    ElasticSearchDocumentCreate,
    ElasticSearchDocumentUpdate,
)
from core.doc.sdoc_elastic_index import SdocIndex
from core.doc.sdoc_kwic_dto import (
    Ngram,
    NgramResponse,
    Ngrams,
)
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

    def search_sdocs_for_kwic(
        self,
        *,
        client: Elasticsearch,
        proj_id: int,
        query: str,
        window: int = 5,
    ) -> Dict[str, Any]:
        """
        KWIC search using ES highlighting + match_phrase query.
        Snippets are sorted lexicographically by frequency of closest → 2nd → 3rd word
        """

        index = self.index.get_index_name(proj_id)
        if not client.indices.exists(index=index):
            raise ValueError(f"ElasticSearch Index '{index}' does not exist!")

        return client.search(
            index=index,
            query={"match_phrase": {"content": query}},
            _source=["filename"],
            highlight={
                "fields": {
                    "content": {
                        "type": "fvh",
                        "fragment_size": window * 20,
                        "number_of_fragments": 9999,
                        "no_match_size": 0,
                        "pre_tags": ["<em>"],
                        "post_tags": ["</em>"],
                    }
                }
            },
            size=9999,
        )

    def fetch_ngrams(
        self,
        *,
        client: Elasticsearch,
        proj_id: int,
        term: str = "",
        limit: int = 20,
        ngrams: Ngrams = Ngrams.BIGRAM,
        exact: bool = False,
        ascending: bool = False,
    ) -> NgramResponse:
        """Fetch ngrams from a specific source document."""
        index = self.index.get_index_name(proj_id)
        if ngrams == Ngrams.UNIGRAM:
            field = "content.unigrams"
        elif ngrams == Ngrams.BIGRAM:
            field = "content.bigrams"
        elif ngrams == Ngrams.TRIGRAM:
            field = "content.trigrams"

        if not client.indices.exists(index=index):
            raise ValueError(f"ElasticSearch Index '{index}' does not exist!")
        # TODO warning: ascending order is not accurate https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-terms-aggregation#_ordering_by_the_term_value
        query = {
            "size": 0,  # number of documents returned, we only want aggs so we don't return any
            "aggs": {
                "global_shingles": {
                    "terms": {
                        "field": field,
                        "size": limit,  # number of ngrams to return
                        "include": f"(.*[^A-Za-z0-9_])?{term}([^A-Za-z0-9_].*)?"
                        if exact
                        else f".*{term}.*",
                        "order": {"_count": "asc" if ascending else "desc"},
                    }
                }
            },
        }
        search_res = client.search(
            index=index,
            body=query,
        )

        if search_res["hits"]["total"]["value"] == 0:
            return NgramResponse(ngrams=[], current_frequency=0, total_frequency=0)

        buckets = search_res["aggregations"]["global_shingles"]["buckets"]
        ngrams_list = [Ngram(key=b["key"], frequency=b["doc_count"]) for b in buckets]
        current_frequency = sum(b["doc_count"] for b in buckets)

        return NgramResponse(
            ngrams=ngrams_list,
            current_frequency=current_frequency,
            total_frequency=current_frequency
            + search_res["aggregations"]["global_shingles"][
                "sum_other_doc_count"
            ],  # more of total frequencies rather than total ngrams
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
