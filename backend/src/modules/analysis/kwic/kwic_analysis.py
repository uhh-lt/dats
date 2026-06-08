from typing import Any, Dict

import pandas as pd
from elasticsearch import Elasticsearch

from core.doc.sdoc_elastic_index import SdocIndex
from modules.analysis.kwic.kwic_dto import (
    Direction,
    KwicSnippet,
    PaginatedElasticSearchKwicSnippets,
)
from repos.elastic.elastic_repo import ElasticSearchRepo


def __search_sdocs_for_kwic(
    client: Elasticsearch,
    proj_id: int,
    query: str,
    window: int,
) -> Dict[str, Any]:
    """
    KWIC search using ES highlighting + match_phrase query.
    Snippets are sorted lexicographically by frequency of closest → 2nd → 3rd word
    """

    index = SdocIndex().get_index_name(proj_id)
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


def _get_kwic_from_highlight(snippet: str, window: int):
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


def kwic_search(
    proj_id: int,
    query: str,
    window: int,
    direction: Direction = Direction.LEFT,
    limit: int | None = None,
    skip: int | None = None,
) -> PaginatedElasticSearchKwicSnippets:
    """
    KWIC search using ES highlighting + match_phrase query.
    Snippets are sorted lexicographically by frequency of closest → 2nd → 3rd word
    """
    search_res = __search_sdocs_for_kwic(
        client=ElasticSearchRepo().client,
        proj_id=proj_id,
        query=query,
        window=window,
    )

    # KWIC snippets
    rows = []
    idx = (-1, -2, -3) if direction == Direction.LEFT else (0, 1, 2)
    for hit in search_res["hits"]["hits"]:
        filename = hit["_source"]["filename"]
        for frag in hit.get("highlight", {}).get("content", []):
            for snip in _get_kwic_from_highlight(frag, window):
                text_string = getattr(snip, direction.value)
                snip.filename = filename
                rows.append(
                    {
                        "snippet": snip,
                        "text": " ".join(text_string),
                        "text1": text_string[idx[0]] if len(text_string) >= 1 else "",
                        "text2": text_string[idx[1]] if len(text_string) >= 2 else "",
                        "text3": text_string[idx[2]] if len(text_string) >= 3 else "",
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
