import re
import time
from collections import OrderedDict

from loguru import logger
from sqlalchemy.orm import Session

from common.doc_type import DocType
from core.annotation.span_annotation_dto import SpanAnnotationCreate
from core.doc.folder_crud import crud_folder
from core.doc.folder_dto import FolderRead
from core.doc.folder_orm import FolderORM
from core.doc.sdoc_elastic_crud import crud_elastic_sdoc
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_dto import SourceDocumentRead
from core.doc.source_document_orm import SourceDocumentORM
from core.metadata.project_metadata_crud import crud_project_meta
from core.metadata.project_metadata_dto import ProjectMetadataRead
from modules.search.sdoc_search.sdoc_search_columns import SdocColumns
from modules.search.search_dto import (
    HierarchicalElasticSearchHit,
    PaginatedSDocHits,
    PaginatedSpanAnnotationHits,
    SpanAnnotationHit,
)
from repos.elastic.elastic_dto_base import ElasticSearchHit, PaginatedElasticSearchHits
from repos.elastic.elastic_repo import ElasticSearchRepo
from systems.search_system.column_info import ColumnInfo
from systems.search_system.filtering import Filter
from systems.search_system.search_builder import SearchBuilder
from systems.search_system.sorting import Sort


def find_sdocs_info(db: Session, project_id: int) -> list[ColumnInfo[SdocColumns]]:
    project_metadata = [
        ProjectMetadataRead.model_validate(pm)
        for pm in crud_project_meta.read_by_project(db=db, proj_id=project_id)
    ]
    metadata_column_info = [
        ColumnInfo.from_project_metadata(pm)
        for pm in project_metadata
        if pm.doctype
        in [
            DocType.text,
            DocType.image,
            DocType.video,
            DocType.audio,
        ]
    ]

    return [
        ColumnInfo[SdocColumns].from_column(column) for column in SdocColumns
    ] + metadata_column_info


def filter_sdoc_ids(
    db: Session,
    project_id: int,
    folder_id: int | None,
    filter: Filter[SdocColumns],
    sorts: list[Sort[SdocColumns]] = [],
    page_number: int | None = None,
    page_size: int | None = None,
) -> tuple[list[int], int]:
    builder = SearchBuilder(db, filter, sorts)
    # build the initial subquery that just queries all sdoc_ids of the project
    if folder_id is None:
        subquery = builder.init_subquery(
            db.query(
                SourceDocumentORM.id,
            )
            .group_by(SourceDocumentORM.id)
            .filter(
                SourceDocumentORM.project_id == project_id,
            )
        ).build_subquery()
    else:
        subquery = builder.init_subquery(
            db.query(
                SourceDocumentORM.id,
            )
            .join(FolderORM, SourceDocumentORM.folder_id == FolderORM.id)
            .group_by(SourceDocumentORM.id)
            .filter(
                SourceDocumentORM.project_id == project_id,
                FolderORM.parent_id == folder_id,
            )
        ).build_subquery()
    # build the query, specifying the result columns and joining the subquery
    builder.init_query(
        db.query(
            SourceDocumentORM.id,
        ).join(subquery, SourceDocumentORM.id == subquery.c.id)
    ).build_query()
    result_rows, total_results = builder.execute_query(
        page_number=page_number,
        page_size=page_size,
    )
    return [row[0] for row in result_rows], total_results


def find_sdoc_ids(
    db: Session,
    project_id: int,
    folder_id: int | None,
    search_query: str,
    expert_mode: bool,
    highlight: bool,
    filter: Filter[SdocColumns],
    sorts: list[Sort[SdocColumns]],
    page_number: int | None = None,
    page_size: int | None = None,
) -> PaginatedElasticSearchHits:
    if search_query.strip() == "":
        filtered_sdoc_ids, total_results = filter_sdoc_ids(
            db,
            project_id,
            folder_id,
            filter,
            sorts,
            page_number=page_number,
            page_size=page_size,
        )
        return PaginatedElasticSearchHits(
            hits=[ElasticSearchHit(id=sdoc_id) for sdoc_id in filtered_sdoc_ids],
            total_results=total_results,
        )
    else:
        # special case: no filter, no sorting -> all sdocs are relevant
        if len(filter.items) == 0 and (sorts is None or len(sorts) == 0):
            filtered_sdoc_ids = None
        else:
            filtered_sdoc_ids, _ = filter_sdoc_ids(
                db, project_id, folder_id, filter, sorts
            )
            filtered_sdoc_ids = set(filtered_sdoc_ids)

        # use elasticseach for full text search
        if page_number is not None and page_size is not None:
            skip = page_number * page_size
            limit = page_size
        else:
            skip = None
            limit = None
        return crud_elastic_sdoc.search_sdocs_by_content_query(
            client=ElasticSearchRepo().client,
            proj_id=project_id,
            query=search_query,
            sdoc_ids=filtered_sdoc_ids,
            use_simple_query=not expert_mode,
            highlight=highlight,
            skip=skip,
            limit=limit,
        )


def find_sdocs(
    db: Session,
    project_id: int,
    folder_id: int | None,
    search_query: str,
    expert_mode: bool,
    highlight: bool,
    filter: Filter[SdocColumns],
    sorts: list[Sort[SdocColumns]],
    page_number: int | None = None,
    page_size: int | None = None,
) -> PaginatedSDocHits:
    data = find_sdoc_ids(
        db,
        project_id,
        folder_id,
        search_query,
        expert_mode,
        highlight,
        filter,
        sorts,
        page_number=page_number,
        page_size=page_size,
    )

    # get the additional information about the documents
    sdoc_ids = [hit.id for hit in data.hits]

    # 1. the sdoc itself
    sdoc_db_objs = crud_sdoc.read_by_ids(db=db, ids=sdoc_ids)
    sdocs = {sdoc.id: SourceDocumentRead.model_validate(sdoc) for sdoc in sdoc_db_objs}

    # 2. the sdoc folders
    folder_ids = [sdoc.folder_id for sdoc in sdoc_db_objs]
    folders = crud_folder.read_by_ids(db=db, ids=list(OrderedDict.fromkeys(folder_ids)))

    # 3. the annotators
    annotators = crud_sdoc.read_annotators(db=db, sdoc_ids=sdoc_ids)

    # 4. the tags
    tags = crud_sdoc.read_tags(db=db, sdoc_ids=sdoc_ids)

    # construct the nested result object
    hierarchical_hits: list[HierarchicalElasticSearchHit] = []
    hits_by_folder: dict[int, list[HierarchicalElasticSearchHit]] = {}
    for hit in data.hits:
        sdoc = sdocs[hit.id]
        hits_by_folder.setdefault(sdoc.folder_id, []).append(
            HierarchicalElasticSearchHit(
                id=hit.id,
                score=hit.score,
                highlights=hit.highlights,
                is_folder=False,
                sub_rows=[],
            )
        )

    hierarchical_hits = [
        HierarchicalElasticSearchHit(
            id=folder.id,
            score=None,
            highlights=[],
            is_folder=True,
            sub_rows=hits_by_folder.get(folder.id, []),
        )
        for folder in folders
    ]

    return PaginatedSDocHits(
        hits=hierarchical_hits,
        sdocs=sdocs,
        annotators=annotators,
        tags=tags,
        sdoc_folders={
            folder.id: FolderRead.model_validate(folder) for folder in folders
        },
        total_results=data.total_results,
    )


def search_and_auto_annotate(
    db: Session,
    project_id: int,
    query: str,
) -> PaginatedSpanAnnotationHits:
    # full-text search using Elasticsearch
    logger.info("Searching in ES database")
    t0 = time.time()
    search_results = crud_elastic_sdoc.search_highlights(
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
    sdoc_data_list = crud_sdoc.read_data_batch(db=db, ids=sdoc_ids)

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
