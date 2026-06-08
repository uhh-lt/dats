import re
import time

from elasticsearch import Elasticsearch
from loguru import logger
from sqlalchemy.orm import Session

from core.annotation.span_annotation_dto import SpanAnnotationCreate
from core.doc.sdoc_elastic_index import SdocIndex
from core.doc.source_document_data_crud import crud_sdoc_data
from modules.search_annotate.search_annotate_dto import (
    PaginatedSpanAnnotationHits,
    SpanAnnotationHit,
)
from repos.elastic.elastic_repo import ElasticSearchRepo


def _search_highlights(client: Elasticsearch, project_id: int, term: str):
    index = SdocIndex().get_index_name(proj_id=project_id)
    query = {
        "_source": ["content"],
        "query": {
            "simple_query_string": {
                "query": f'"{term}"',  # quotation marks enforce phrase search
                "fields": ["content"],
            }
        },
        "highlight": {
            "fields": {"content": {"fragment_size": 0, "number_of_fragments": 0}}
        },
    }
    response = client.search(index=index, body=query)

    return response


def _find_highlight_positions(
    sdoc_id,
    clean_text,
    highlighted_text,
    tokens,
    token_character_offsets,
    context_window=10,  # how many tokens to include before/after highlight
) -> list[SpanAnnotationHit]:
    highlights = re.findall(r"<em>(.*?)</em>", highlighted_text)
    results = []
    last_pos = 0

    # Map character offset → token index
    char_to_token_map = {}
    for i, (tok_start, tok_end) in enumerate(token_character_offsets):
        for j in range(tok_start, tok_end + 1):
            char_to_token_map[j] = i

    for word in highlights:
        match = re.search(re.escape(word), clean_text[last_pos:])
        if not match:
            continue

        start = last_pos + match.start()
        end = last_pos + match.end()
        last_pos = end

        token_start = char_to_token_map.get(start)
        token_end = char_to_token_map.get(end)
        if token_start is None or token_end is None:
            continue

        # token_end should be exclusive
        token_end += 1

        # context window around highlight
        ctx_start = max(0, token_start - context_window)
        ctx_end = min(len(tokens), token_end + context_window)
        results.append(
            SpanAnnotationHit(
                span_dto=SpanAnnotationCreate(
                    span_text=word,
                    code_id=-1,
                    sdoc_id=sdoc_id,
                    begin=start,
                    end=end,
                    begin_token=token_start,
                    end_token=token_end,
                ),
                before_context=" ".join(tokens[ctx_start:token_start]),
                after_context=" ".join(tokens[token_end:ctx_end]),
            )
        )
    return results


def search_and_auto_annotate(
    db: Session,
    project_id: int,
    query: str,
) -> PaginatedSpanAnnotationHits:
    # full-text search using Elasticsearch
    logger.info("Searching in ES database")
    t0 = time.time()
    search_results = _search_highlights(
        client=ElasticSearchRepo().client,
        project_id=project_id,
        term=query,
    )
    t1 = time.time()
    logger.info(f"query took: {t1 - t0}")

    hits = search_results["hits"]["hits"]
    if not hits:
        return PaginatedSpanAnnotationHits(
            total_results=0,
            hits=[],
        )

    sdoc_ids = [int(hit["_id"]) for hit in hits]
    sdoc_data_list = crud_sdoc_data.read_by_ids(db=db, ids=sdoc_ids)

    # map id to data
    id2data = {
        sdoc_data.id: sdoc_data for sdoc_data in sdoc_data_list if sdoc_data is not None
    }

    results = []
    logger.info("Computing highlight positions")
    t0 = time.time()
    for hit in hits:
        sdoc_id = int(hit["_id"])
        sdoc_data = id2data.get(sdoc_id)
        if not sdoc_data:
            continue

        highlights = _find_highlight_positions(
            sdoc_id,
            hit["_source"]["content"],
            hit["highlight"]["content"][0],
            sdoc_data.tokens,
            sdoc_data.token_character_offsets,
        )
        results.extend(highlights)
    t1 = time.time()
    logger.info(f"computation took: {t1 - t0}")

    return PaginatedSpanAnnotationHits(
        total_results=len(results),
        hits=results,
    )
