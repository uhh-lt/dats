from common.dependencies import DBSession
from common.project_router import project_router
from modules.search_annotate.search_annotate import search_and_auto_annotate
from modules.search_annotate.search_annotate_dto import PaginatedSpanAnnotationHits

router = project_router("/search-annotate", tags=["searchAnnotate"])


@router.post(
    "/auto-annotate",
    response_model=PaginatedSpanAnnotationHits,
    summary="Returns the character & token-level positions needed for creating SpanAnnotations.",
)
def auto_annotate(
    *,
    db: DBSession,
    project_id: int,
    query: str,
) -> PaginatedSpanAnnotationHits:
    return search_and_auto_annotate(
        db=db,
        project_id=project_id,
        query=query,
    )
