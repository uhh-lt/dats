import re

from elasticsearch import Elasticsearch

from core.doc.sdoc_elastic_index import SdocIndex
from modules.analysis.ngram.ngram_dto import (
    Ngram,
    NgramResponse,
    Ngrams,
)


def fetch_ngrams(
    client: Elasticsearch,
    proj_id: int,
    term: str,
    limit: int,
    ngrams: Ngrams,
    exact: bool,
    ascending: bool,
) -> NgramResponse:
    """Fetch ngrams aggregated across all documents in the project's Elasticsearch index."""
    index = SdocIndex().get_index_name(proj_id)
    match ngrams:
        case Ngrams.UNIGRAM:
            field = "content.unigrams"
        case Ngrams.BIGRAM:
            field = "content.bigrams"
        case Ngrams.TRIGRAM:
            field = "content.trigrams"
        case _:
            raise ValueError(f"Invalid ngrams value: {ngrams}")  # pyright: ignore[reportUnreachable]

    if not client.indices.exists(index=index):
        raise ValueError(f"ElasticSearch Index '{index}' does not exist!")
    safe_term = re.escape(term)
    # TODO warning: ascending order is not accurate https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-terms-aggregation#_ordering_by_the_term_value
    body = {
        "size": 0,  # number of documents returned, we only want aggs so we don't return any
        "aggs": {
            "global_shingles": {
                "terms": {
                    "field": field,
                    "size": limit,  # number of ngrams to return
                    "include": f"(.*[^A-Za-z0-9_])?{safe_term}([^A-Za-z0-9_].*)?"
                    if exact
                    else f".*{safe_term}.*",
                    "order": {"_count": "asc" if ascending else "desc"},
                }
            }
        },
    }
    search_res = client.search(
        index=index,
        body=body,
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
