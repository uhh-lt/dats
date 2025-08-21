import re

from core.doc.sdoc_elastic_dto import (
    ElasticSearchDocument,
    ElasticSearchDocumentCreate,
    ElasticSearchDocumentUpdate,
)
from core.doc.sdoc_elastic_index import SdocIndex
from core.doc.sdoc_kwic_dto import (
    ElasticSearchKwicHit,
    KwicSnippet,
    PaginatedElasticSearchKwicHits,
)
from elasticsearch import Elasticsearch
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
        limit: int | None = None,
        skip: int | None = None,
    ) -> PaginatedElasticSearchKwicHits:
        """
        KWIC search using ES highlighting + match_phrase query.
        Each hit may produce multiple KWIC snippets.
        """
        index = self.index.get_index_name(proj_id)
        if not client.indices.exists(index=index):
            raise ValueError(f"ElasticSearch Index '{index}' does not exist!")

        search_res = client.search(
            index=index,
            query={
                "match_phrase": {"content": query}
            },  # match_phrase does not support fuzziness
            _source=["filename"],  # we don’t need full content
            highlight={
                "fields": {
                    "content": {
                        "type": "fvh",
                        "fragment_size": window * 20,  # approx. 20 chars per word
                        "number_of_fragments": 99999,  # return all fragments
                        "no_match_size": 0,
                        "pre_tags": ["<em>"],
                        "post_tags": ["</em>"],
                    }
                }
            },
            from_=skip or 0,
            size=limit or 10,
        )

        kwic_results = []
        for hit in search_res["hits"]["hits"]:
            snippets = []
            for frag in hit.get("highlight", {}).get("content", []):
                snippets.extend(self.get_kwic_from_highlight(frag, window))

            kwic_results.append(
                ElasticSearchKwicHit(
                    id=hit["_id"],
                    filename=hit["_source"]["filename"],
                    score=hit["_score"],
                    snippets=snippets,
                )
            )

        return PaginatedElasticSearchKwicHits(
            hits=kwic_results,
            total_results=search_res["hits"]["total"]["value"],
        )

    def get_kwic_from_highlight(self, snippet: str, window: int = 5):
        """
        Extract KWIC snippets from an ES highlight snippet using regex.
        Returns a list of KwicSnippet(left, keyword, right).
        """
        results = []
        pattern = re.compile(
            rf"(?P<left>(?:\S+\s+){{0,{window}}})"
            r"<em>(?P<keyword>.*?)</em>"
            rf"(?P<right>(?:\s*\S+){{0,{window}}})"
        )

        for match in pattern.finditer(snippet):
            left_text = (
                match.group("left").replace("<em>", "").replace("</em>", "").strip()
            )
            keyword_text = match.group("keyword")
            right_text = (
                match.group("right").replace("<em>", "").replace("</em>", "").strip()
            )

            results.append(
                KwicSnippet(left=left_text, keyword=keyword_text, right=right_text)
            )
        return results


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
