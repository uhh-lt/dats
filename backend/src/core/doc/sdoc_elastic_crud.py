import pandas as pd
from elasticsearch import Elasticsearch

from core.doc.sdoc_elastic_dto import (
    ElasticSearchDocument,
    ElasticSearchDocumentCreate,
    ElasticSearchDocumentUpdate,
)
from core.doc.sdoc_elastic_index import SdocIndex
from core.doc.sdoc_kwic_dto import (
    KwicSnippet,
    PaginatedElasticSearchKwicSnippets,
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
        limit: int | None = None,
        skip: int | None = None,
        direction: str = "left",  # "left", "right"
    ) -> PaginatedElasticSearchKwicSnippets:
        """
        KWIC search using ES highlighting + match_phrase query.
        Snippets are sorted lexicographically by frequency of closest → 2nd → 3rd word
        """

        if direction not in {"left", "right"}:
            raise ValueError("direction must be 'left' or 'right'")

        index = self.index.get_index_name(proj_id)
        if not client.indices.exists(index=index):
            raise ValueError(f"ElasticSearch Index '{index}' does not exist!")

        search_res = client.search(
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
            # from_=skip or 0,
            size=9999,
        )

        # STOPWORDS = {"the", "is", "in", "and", "to", "a"}
        # def normalize_tokens(words: list[str]) -> list[str]:
        #     return [
        #         w.strip(string.punctuation).lower()
        #         for w in words
        #         if w.strip(string.punctuation).lower() not in STOPWORDS
        #     ]

        # KWIC snippets
        rows = []
        idx = (-1, -2, -3) if direction == "left" else (0, 1, 2)
        for hit in search_res["hits"]["hits"]:
            filename = hit["_source"]["filename"]
            for frag in hit.get("highlight", {}).get("content", []):
                for snip in self.get_kwic_from_highlight(frag, window):
                    textString = getattr(snip, direction)
                    snip.filename = filename
                    rows.append(
                        {
                            "snippet": snip,
                            "text": " ".join(textString),
                            "text1": textString[idx[0]] if len(textString) >= 1 else "",
                            "text2": textString[idx[1]] if len(textString) >= 2 else "",
                            "text3": textString[idx[2]] if len(textString) >= 3 else "",
                        }
                    )

        if not rows:
            return PaginatedElasticSearchKwicSnippets(total_results=0, snippets=[])

        df = pd.DataFrame(rows)
        # Counting frequencies
        df["1_freq"] = df.groupby("text1")["text1"].transform("count")
        df["2_freq"] = df.groupby("text2")["text2"].transform("count")
        df["3_freq"] = df.groupby("text3")["text3"].transform("count")

        # Sorting
        df = df.sort_values(
            by=["1_freq", "2_freq", "3_freq", "text"],
            ascending=[False, False, False, True],
        )
        start = skip or 0
        end = start + (limit or len(df))
        paginated_snippets = df["snippet"].iloc[start:end].tolist()
        return PaginatedElasticSearchKwicSnippets(
            total_results=df.shape[0],
            snippets=paginated_snippets,
        )

    def get_kwic_from_highlight(self, snippet: str, window: int = 5):
        results = []

        # tokenization
        words = snippet.split(" ")
        keyword_indices = []
        for i, w in enumerate(words):
            if "<em>" in w:
                words[i] = w[4:-5]
                keyword_indices.append(i)

        # build snippet
        for idx in keyword_indices:
            left_idx = max(0, idx - window)
            right_idx = min(len(words), idx + window + 1)
            results.append(
                KwicSnippet(
                    left=words[left_idx:idx],
                    keyword=words[idx],
                    right=words[idx + 1 : right_idx],
                )
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
