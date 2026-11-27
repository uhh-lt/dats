from common.dependencies import DBSession
from common.project_router import project_router
from modules.search_annotate.search_annotate import search_and_auto_annotate
from modules.search_annotate.search_annotate_dto import (
    CandidateRequest,
    PaginatedSpanAnnotationHits,
)

router = project_router("/search-annotate", tags=["searchAnnotate"])


# --- other operations


@router.post(
    "/candidates",
    response_model=PaginatedSpanAnnotationHits,
    summary="Returns the character & token-level positions needed for creating SpanAnnotations.",
)
def compute_candidates(
    *,
    db: DBSession,
    project_id: int,
    request: CandidateRequest,
) -> PaginatedSpanAnnotationHits:
    return search_and_auto_annotate(
        db=db,
        project_id=project_id,
        query=request.query,
    )
