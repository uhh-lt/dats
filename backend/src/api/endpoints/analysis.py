from typing import Dict, List

from api.dependencies import get_db_session
from app.core.analysis.analysis_service import AnalysisService
from app.core.data.crud.source_document_metadata import crud_sdoc_meta
from app.core.data.dto.analysis import (
    AnalysisConcept,
    AnnotationOccurrence,
    CodeFrequency,
    CodeOccurrence,
    TimelineAnalysisResult,
)
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.data.dto.search import SimSearchSentenceHit
from app.core.search.elasticsearch_service import ElasticSearchService

from app.core.search.search_service import SearchService

router = APIRouter(prefix="/analysis")
tags = ["analysis"]


@router.post(
    "/code_frequencies",
    tags=tags,
    response_model=List[CodeFrequency],
    summary="Returns all SourceDocument IDs that match the query parameters.",
    description="Returns all SourceDocument Ids that match the query parameters.",
)
async def code_frequencies(
    *, project_id: int, user_ids: List[int], code_ids: List[int]
) -> List[CodeFrequency]:
    return AnalysisService().compute_code_frequency(
        project_id=project_id, user_ids=user_ids, code_ids=code_ids
    )


@router.post(
    "/code_occurrences",
    tags=tags,
    response_model=List[CodeOccurrence],
    summary="Returns all SourceDocument IDs that match the query parameters.",
    description="Returns all SourceDocument Ids that match the query parameters.",
)
async def code_occurrences(
    *, project_id: int, user_ids: List[int], code_id: int
) -> List[CodeOccurrence]:
    return AnalysisService().find_code_occurrences(
        project_id=project_id, user_ids=user_ids, code_id=code_id
    )


@router.post(
    "/annotation_occurrences",
    tags=tags,
    response_model=List[AnnotationOccurrence],
    summary="Returns all SourceDocument IDs that match the query parameters.",
    description="Returns all SourceDocument Ids that match the query parameters.",
)
async def annotation_occurrences(
    *, project_id: int, user_ids: List[int], code_id: int
) -> List[AnnotationOccurrence]:
    return AnalysisService().find_annotation_occurrences(
        project_id=project_id, user_ids=user_ids, code_id=code_id
    )


@router.post(
    "/timeline_analysis",
    tags=tags,
    response_model=List[TimelineAnalysisResult],
    summary="Perform timeline analysis.",
    description="Perform timeline analysis.",
)
async def timeline_analysis(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    concepts: List[AnalysisConcept],
    threshold: int,
    metadata_key: str
) -> List[TimelineAnalysisResult]:
    # ensure that metadata key is valid
    sdoc_metadata_dict = {
        sdoc_meta.source_document_id: sdoc_meta.value
        for sdoc_meta in crud_sdoc_meta.read_by_project_and_key(
            db=db, project_id=project_id, key=metadata_key
        )
    }
    if len(sdoc_metadata_dict) == 0:
        return []

    # analyse every concept
    sdoc_ids = []
    similar_sentences_dict: Dict[str, List[SimSearchSentenceHit]] = {}
    for concept in concepts:
        hits: List[
            SimSearchSentenceHit
        ] = SearchService().find_similar_sentences_with_threshold(
            proj_id=project_id, sentences=concept.sentences, threshold=threshold
        )
        similar_sentences_dict[concept.name] = hits
        sdoc_ids.extend([hit.sdoc_id for hit in hits])

    # filter sdoc_ids
    sdoc_ids = list(set(sdoc_ids))  # remove duplicates
    sdoc_ids = [
        sdoc_id for sdoc_id in sdoc_ids if sdoc_id in sdoc_metadata_dict.keys()
    ]  # remove invalid sdoc_ids that do not have the metadata key

    # query sentences of relevant sdocs
    esdocs_dict: Dict[int, List[str]] = {
        esdoc.sdoc_id: esdoc.sentences
        for esdoc in ElasticSearchService().get_esdocs_by_sdoc_ids(
            proj_id=project_id, sdoc_ids=sdoc_ids, fields={"sentences"}
        )
    }

    result = []
    for concept in concepts:
        for hit in similar_sentences_dict.get(concept.name, []):
            sentences: List[str] = esdocs_dict.get(hit.sdoc_id, [])
            if len(sentences) == 0:
                continue

            date = sdoc_metadata_dict.get(hit.sdoc_id, None)
            if date is None:
                continue

            # build context
            context = ""
            if hit.sentence_id > 0:
                context += sentences[hit.sentence_id - 1] + " "
            context += sentences[hit.sentence_id] + " "
            if hit.sentence_id < len(sentences) - 1:
                context += sentences[hit.sentence_id + 1]
            context = context.strip()

            result.append(
                TimelineAnalysisResult(
                    concept_name=concept.name,
                    date=date,
                    sentence=sentences[hit.sentence_id],
                    score=hit.score,
                    sdoc_id=hit.sdoc_id,
                    context=context,
                )
            )
    return result
