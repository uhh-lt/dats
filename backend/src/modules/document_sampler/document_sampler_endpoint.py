from common.dependencies import DBSession
from common.project_router import project_router
from modules.document_sampler.document_sampler_dto import SampledSdocsResults
from modules.document_sampler.document_sampler_service import DocumentSamplerService

router = project_router("/document-samples", tags=["documentSample"])


# --- other operations


@router.post(
    "",
    response_model=list[SampledSdocsResults],
    summary="Sample & Aggregate Source Documents by tags.",
)
def compute_document_samples(
    *,
    db: DBSession,
    project_id: int,
    tag_groups: list[list[int]],
    n: int,
    frac: float,
) -> list[SampledSdocsResults]:
    return DocumentSamplerService().sample_sdocs_by_tags(
        db=db, project_id=project_id, tag_ids=tag_groups, n=n, frac=frac
    )
